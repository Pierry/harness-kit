#!/usr/bin/env python3
"""
Tests for the wiki-to-site generator.

The generator runs unattended on the `gollum` event: nobody reviews its output
before it reaches the published site. The failure that matters is silent, a link
that still points at a bare wiki page name and 404s on the site, or a mermaid
fence that ships as a literal code block. These pin the rewriting rules.

The staleness check earns its own tests for the same reason. pt and es are
translated by hand, so the English moving is the normal case, and a check that
failed to notice would leave the site serving an old translation as if it were
current. That is the exact false green this repo exists to prevent.
"""

import importlib.util
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

REPO = Path(__file__).resolve().parents[1]
BUILD_WIKI = REPO / "scripts/build-wiki.py"

spec = importlib.util.spec_from_file_location("build_wiki", BUILD_WIKI)
bw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bw)


class PageHref(unittest.TestCase):
    def test_home_becomes_the_wiki_index(self):
        self.assertEqual(bw.page_href("Home"), "index.html")

    def test_every_other_page_keeps_its_name(self):
        self.assertEqual(bw.page_href("Harness-Engineering"), "Harness-Engineering.html")


class RewriteLink(unittest.TestCase):
    def test_rewrites_a_bare_wiki_page_name(self):
        self.assertEqual(bw.rewrite_link("Sensors"), "Sensors.html")

    def test_keeps_the_fragment(self):
        self.assertEqual(bw.rewrite_link("Evals#retry"), "Evals.html#retry")

    def test_points_home_at_the_index(self):
        self.assertEqual(bw.rewrite_link("Home"), "index.html")

    def test_leaves_external_urls_alone(self):
        url = "https://github.com/Pierry/harness-kit/blob/main/CLAUDE.md"
        self.assertEqual(bw.rewrite_link(url), url)

    def test_leaves_a_pure_anchor_alone(self):
        self.assertEqual(bw.rewrite_link("#the-harness"), "#the-harness")

    def test_leaves_a_path_alone(self):
        self.assertEqual(bw.rewrite_link("assets/x.png"), "assets/x.png")

    def test_leaves_a_filename_alone(self):
        self.assertEqual(bw.rewrite_link("README.md"), "README.md")


class Slugify(unittest.TestCase):
    def test_matches_the_anchor_github_would_have_made(self):
        self.assertEqual(bw.slugify("What a sensor is"), "what-a-sensor-is")
        self.assertEqual(bw.slugify("Scale, consistency & failure"), "scale-consistency--failure")


class Render(unittest.TestCase):
    def setUp(self):
        self.md = bw.make_renderer()

    def test_a_mermaid_fence_becomes_a_node_the_site_renders(self):
        out = self.md.render("```mermaid\ngraph TD;\n  A-->B;\n```")
        self.assertIn('<pre class="mermaid">', out)
        self.assertIn("A--&gt;B;", out)

    def test_a_normal_fence_stays_a_code_block(self):
        out = self.md.render("```python\nprint(1)\n```")
        self.assertIn('<code class="language-python">', out)
        self.assertNotIn("mermaid", out)

    def test_a_wiki_link_in_prose_is_rewritten(self):
        out = self.md.render("See [Sensors](Sensors) for the gate.")
        self.assertIn('href="Sensors.html"', out)

    def test_an_external_link_opens_in_a_new_tab(self):
        out = self.md.render("[DDIA](https://dataintensive.net/)")
        self.assertIn('target="_blank"', out)
        self.assertIn('rel="noopener"', out)

    def test_an_internal_link_does_not_open_in_a_new_tab(self):
        out = self.md.render("[Sensors](Sensors)")
        self.assertNotIn("_blank", out)

    def test_headings_get_anchors(self):
        self.assertIn('<h2 id="how-it-works">', self.md.render("## How it works"))

    def test_tables_render(self):
        out = self.md.render("| Page | What |\n|---|---|\n| Evals | rubrics |")
        self.assertIn("<table>", out)


class Metadata(unittest.TestCase):
    def test_title_comes_from_the_first_h1(self):
        self.assertEqual(bw.extract_title("# Sensors\n\nbody", "Sensors"), "Sensors")

    def test_title_falls_back_to_the_page_name(self):
        self.assertEqual(bw.extract_title("no heading", "Golden-Path"), "Golden Path")

    def test_description_is_the_first_real_paragraph_flattened(self):
        text = "# Sensors\n\nThey **observe** the [artifact](Guides) and return a verdict.\n"
        self.assertEqual(
            bw.extract_description(text),
            "They observe the artifact and return a verdict.",
        )

    def test_description_skips_tables_and_headings(self):
        text = "# T\n\n## Sub\n\n| a | b |\n|---|---|\n\nThe real paragraph.\n"
        self.assertEqual(bw.extract_description(text), "The real paragraph.")


def scaffold(tmp: str, translated: bool = True):
    """A miniature wiki plus its translations, wired the way the real one is."""
    wiki, out, i18n = Path(tmp) / "wiki", Path(tmp) / "out", Path(tmp) / "i18n"
    wiki.mkdir()
    (wiki / "Home.md").write_text("# Home\n\nStart at [Sensors](Sensors).\n")
    (wiki / "Sensors.md").write_text("# Sensors\n\nThe gate.\n")
    (wiki / "_Sidebar.md").write_text("- [Home](Home)\n- [Sensors](Sensors)\n")
    if translated:
        for code, home in (("pt", "Início"), ("es", "Inicio")):
            (i18n / code).mkdir(parents=True)
            (i18n / code / "Home.md").write_text(f"# {home}\n\nComece em [Sensores](Sensors).\n")
            (i18n / code / "Sensors.md").write_text("# Sensores\n\nA gate.\n")
            (i18n / code / "_Sidebar.md").write_text(f"- [{home}](Home)\n- [Sensores](Sensors)\n")
        bw.write_manifest(wiki, i18n)
    return wiki, out, i18n


class Build(unittest.TestCase):
    def test_writes_every_language_and_drops_underscore_pages(self):
        with TemporaryDirectory() as tmp:
            wiki, out, i18n = scaffold(tmp)

            written = bw.build(wiki, out, i18n)

            self.assertEqual(
                sorted(written),
                [
                    "Sensors.html",
                    "es/Sensors.html",
                    "es/index.html",
                    "index.html",
                    "pt/Sensors.html",
                    "pt/index.html",
                ],
            )
            self.assertFalse((out / "_Sidebar.html").exists())
            self.assertFalse((out / "pt/_Sidebar.html").exists())

    def test_english_keeps_the_urls_it_already_published(self):
        with TemporaryDirectory() as tmp:
            wiki, out, i18n = scaffold(tmp)
            bw.build(wiki, out, i18n)
            index = (out / "index.html").read_text()
            self.assertIn('href="Sensors.html"', index)
            self.assertIn("<title>Home &middot; harness-kit wiki</title>", index)
            self.assertIn('<aside class="wikinav"', index)

    def test_a_translated_page_serves_translated_prose_at_its_own_url(self):
        with TemporaryDirectory() as tmp:
            wiki, out, i18n = scaffold(tmp)
            bw.build(wiki, out, i18n)
            pt = (out / "pt/index.html").read_text()
            self.assertIn('<html lang="pt-BR">', pt)
            self.assertIn("Comece em", pt)
            # the link text is translated but the target still resolves
            self.assertIn('href="Sensors.html"', pt)

    def test_assets_resolve_from_a_nested_language_directory(self):
        with TemporaryDirectory() as tmp:
            wiki, out, i18n = scaffold(tmp)
            bw.build(wiki, out, i18n)
            self.assertIn('href="../assets/tokens.css"', (out / "index.html").read_text())
            self.assertIn('href="../../assets/tokens.css"', (out / "pt/index.html").read_text())

    def test_each_language_points_at_the_others(self):
        with TemporaryDirectory() as tmp:
            wiki, out, i18n = scaffold(tmp)
            bw.build(wiki, out, i18n)

            en = (out / "Sensors.html").read_text()
            self.assertIn('hreflang="pt-BR" href="pt/Sensors.html"', en)
            self.assertIn('hreflang="x-default" href="Sensors.html"', en)
            self.assertIn(f'<link rel="canonical" href="{bw.SITE}/wiki/Sensors.html" />', en)

            pt = (out / "pt/Sensors.html").read_text()
            self.assertIn('hreflang="en" href="../Sensors.html"', pt)
            self.assertIn('hreflang="es" href="../es/Sensors.html"', pt)
            self.assertIn(f'<link rel="canonical" href="{bw.SITE}/wiki/pt/Sensors.html" />', pt)

    def test_removes_pages_whose_wiki_source_is_gone(self):
        with TemporaryDirectory() as tmp:
            wiki, out, i18n = scaffold(tmp)
            out.mkdir()
            (out / "Deleted-Page.html").write_text("stale")

            bw.build(wiki, out, i18n)

            self.assertFalse((out / "Deleted-Page.html").exists())


class Staleness(unittest.TestCase):
    """The check that stands in for the API key this repo refuses to have."""

    def test_fresh_translations_are_not_stale(self):
        with TemporaryDirectory() as tmp:
            wiki, _, i18n = scaffold(tmp)
            self.assertEqual(bw.stale_translations(wiki, i18n), [])

    def test_editing_the_english_makes_that_page_stale(self):
        with TemporaryDirectory() as tmp:
            wiki, _, i18n = scaffold(tmp)
            (wiki / "Sensors.md").write_text("# Sensors\n\nThe gate, rewritten.\n")
            self.assertEqual(bw.stale_translations(wiki, i18n), ["Sensors"])

    def test_a_new_english_page_with_no_translation_is_stale(self):
        with TemporaryDirectory() as tmp:
            wiki, _, i18n = scaffold(tmp)
            (wiki / "Brand-New.md").write_text("# Brand New\n\nUntranslated.\n")
            self.assertEqual(bw.stale_translations(wiki, i18n), ["Brand-New"])

    def test_a_deleted_translation_is_stale_even_when_the_sha_matches(self):
        with TemporaryDirectory() as tmp:
            wiki, _, i18n = scaffold(tmp)
            (i18n / "es" / "Sensors.md").unlink()
            self.assertEqual(bw.stale_translations(wiki, i18n), ["Sensors"])

    def test_everything_is_stale_before_anything_is_translated(self):
        with TemporaryDirectory() as tmp:
            wiki, _, i18n = scaffold(tmp, translated=False)
            self.assertEqual(bw.stale_translations(wiki, i18n), ["Home", "Sensors"])

    def test_the_manifest_records_a_sha_per_english_page(self):
        with TemporaryDirectory() as tmp:
            wiki, _, i18n = scaffold(tmp)
            manifest = json.loads((i18n / bw.MANIFEST).read_text())
            self.assertEqual(sorted(manifest), ["Home", "Sensors"])
            self.assertEqual(manifest["Sensors"], bw.source_sha((wiki / "Sensors.md").read_text()))


class RealWiki(unittest.TestCase):
    """The canonical link shape, pinned against the pages the site links to."""

    def test_the_pages_the_landing_page_links_to_are_page_names(self):
        for name in ("Agent-Pipelines", "Autonomy", "Orchestration-and-Subagents"):
            self.assertEqual(bw.rewrite_link(name), f"{name}.html")

    def test_the_shipped_translations_are_not_stale(self):
        """The repo's real wiki-i18n against the real manifest. This is the test
        that fails when somebody edits the wiki and forgets pt and es."""
        i18n = REPO / "wiki-i18n"
        manifest = i18n / bw.MANIFEST
        if not manifest.exists():
            self.skipTest("no translations committed yet")
        recorded = json.loads(manifest.read_text())
        for page in recorded:
            for code in ("pt", "es"):
                self.assertTrue(
                    (i18n / code / f"{page}.md").exists(),
                    f"{code}/{page}.md is in the manifest but missing from disk",
                )


if __name__ == "__main__":
    unittest.main()
