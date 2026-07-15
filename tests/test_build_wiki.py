#!/usr/bin/env python3
"""
Tests for the wiki-to-site generator.

The generator runs unattended on the `gollum` event: nobody reviews its output
before it reaches the published site. The failure that matters is silent, a link
that still points at a bare wiki page name and 404s on the site, or a mermaid
fence that ships as a literal code block. These pin the rewriting rules.
"""

import importlib.util
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


class Build(unittest.TestCase):
    def test_writes_a_page_per_wiki_file_and_drops_underscore_pages(self):
        with TemporaryDirectory() as tmp:
            wiki, out = Path(tmp) / "wiki", Path(tmp) / "out"
            wiki.mkdir()
            (wiki / "Home.md").write_text("# Home\n\nStart at [Sensors](Sensors).\n")
            (wiki / "Sensors.md").write_text("# Sensors\n\nThe gate.\n")
            (wiki / "_Sidebar.md").write_text("- [Home](Home)\n- [Sensors](Sensors)\n")

            written = bw.build(wiki, out)

            self.assertEqual(sorted(written), ["Sensors.html", "index.html"])
            self.assertFalse((out / "_Sidebar.html").exists())
            index = (out / "index.html").read_text()
            self.assertIn('href="Sensors.html"', index)
            self.assertIn("<title>Home &middot; harness-kit wiki</title>", index)
            # the sidebar is rendered into every page, through the same rewriting
            self.assertIn('<aside class="wikinav"', index)
            self.assertIn('href="index.html"', (out / "Sensors.html").read_text())

    def test_removes_pages_whose_wiki_source_is_gone(self):
        with TemporaryDirectory() as tmp:
            wiki, out = Path(tmp) / "wiki", Path(tmp) / "out"
            wiki.mkdir()
            out.mkdir()
            (out / "Deleted-Page.html").write_text("stale")
            (wiki / "Home.md").write_text("# Home\n\nBody.\n")

            bw.build(wiki, out)

            self.assertFalse((out / "Deleted-Page.html").exists())


class RealWiki(unittest.TestCase):
    """The canonical link shape, pinned against the pages the site links to."""

    def test_the_pages_the_landing_page_links_to_are_page_names(self):
        for name in ("Agent-Pipelines", "Autonomy", "Orchestration-and-Subagents"):
            self.assertEqual(bw.rewrite_link(name), f"{name}.html")


if __name__ == "__main__":
    unittest.main()
