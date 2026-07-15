#!/usr/bin/env python3
"""Render the GitHub wiki into static pages under docs/wiki/, in three languages.

The wiki (github.com/Pierry/harness-kit/wiki) stays the source of truth for
English and stays editable in the browser. This script is what puts the same
content on the site, for readers who never open GitHub. It pre-renders to real
HTML on purpose: a client-side markdown fetch would leave the prose invisible to
search engines and AI crawlers, which is the entire reason content is mirrored.

The site is trilingual, so the wiki is too. pt-BR and es are translated by hand
into wiki-i18n/{lang}/, because machine translation of this prose is not worth
an API key in CI. Hand translation rots the moment somebody edits the English
and forgets, so wiki-i18n/sources.json records the SHA of the English each
translation was made from, and --check fails when they drift apart. That check
is the only thing standing between "we'll translate it later" and a site quietly
serving last month's Portuguese as if it were current.

    python3 scripts/build-wiki.py <wiki-clone-dir> --out docs/wiki
    python3 scripts/build-wiki.py <wiki-clone-dir> --check
    python3 scripts/build-wiki.py <wiki-clone-dir> --update-manifest
"""

import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

try:
    from markdown_it import MarkdownIt
except ImportError:  # pragma: no cover - the workflow installs this
    sys.exit("markdown-it-py is missing. Run: pip install -r requirements-docs.txt")

SITE = "https://pierry.github.io/harness-kit"
REPO = "https://github.com/Pierry/harness-kit"
HOME = "Home"
SIDEBAR = "_Sidebar"
MANIFEST = "sources.json"

# A wiki-relative link is a bare page name: no scheme, no slash, no extension.
# [Sensors](Sensors) and [Evals](Evals#retry) match; a github.com URL does not.
WIKI_LINK = re.compile(r"^([A-Za-z0-9][A-Za-z0-9-]*)(#[^\s]*)?$")

FONTS = (
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@"
    "12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:"
    "wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
)


class Lang(NamedTuple):
    code: str  # "pt"
    label: str  # "PT", the switch pill
    hreflang: str  # "pt-BR", for <link rel=alternate> and <html lang>
    subdir: str  # "pt/", where the pages land under docs/wiki/

    @property
    def up(self) -> str:
        """Hops from this language's directory back to docs/wiki/."""
        return "../" * self.subdir.count("/")

    @property
    def site_up(self) -> str:
        """Hops from this language's directory back to docs/."""
        return "../" * (self.subdir.count("/") + 1)


LANGS = (
    Lang("en", "EN", "en", ""),
    Lang("pt", "PT", "pt-BR", "pt/"),
    Lang("es", "ES", "es", "es/"),
)
DEFAULT_LANG = LANGS[0]

# Chrome around the translated prose. English lives here rather than in the
# template so the three languages stay visibly in sync in one place.
STRINGS = {
    "en": {
        "guide": "usage guide",
        "home": "wiki home",
        "contents": "Contents",
        "tagline": "harness-kit &middot; idea to merged PR, through one gated pipeline",
        "mirror": 'This page mirrors <a href="{url}" target="_blank" rel="noopener">{name}</a> '
        "in the wiki. Edit it there.",
    },
    "pt": {
        "guide": "guia de uso",
        "home": "in&iacute;cio da wiki",
        "contents": "Conte&uacute;do",
        "tagline": "harness-kit &middot; da ideia ao PR mergeado, por um pipeline com gates",
        "mirror": 'Tradu&ccedil;&atilde;o manual de <a href="{url}" target="_blank" '
        'rel="noopener">{name}</a>, a p&aacute;gina original em ingl&ecirc;s na wiki.',
    },
    "es": {
        "guide": "gu&iacute;a de uso",
        "home": "inicio de la wiki",
        "contents": "Contenido",
        "tagline": "harness-kit &middot; de la idea al PR fusionado, por un pipeline con gates",
        "mirror": 'Traducci&oacute;n manual de <a href="{url}" target="_blank" '
        'rel="noopener">{name}</a>, la p&aacute;gina original en ingl&eacute;s en la wiki.',
    },
}


def page_href(name: str) -> str:
    """The generated filename for a wiki page name. Home is the wiki index."""
    return "index.html" if name == HOME else f"{name}.html"


def rewrite_link(href: str) -> str:
    """Turn a wiki-relative link into a link between generated pages.

    Translated pages keep the English link target ([Sensores](Sensors)), so this
    resolves inside whichever language directory the page is being written to.
    """
    match = WIKI_LINK.match(href)
    if not match:
        return href
    return page_href(match.group(1)) + (match.group(2) or "")


def slugify(text: str) -> str:
    """A heading anchor identical to the one GitHub's wiki would have made.

    Deliberately matches github-slugger rather than being merely reasonable:
    a fragment someone authored against the wiki ([Evals](Evals#retry)), or an
    external deep link, has to land on the same heading here. So each space
    becomes its own hyphen without collapsing runs, and underscores survive.
    """
    slug = re.sub(r"[^\w\s-]", "", text.lower().strip())
    return re.sub(r"\s", "-", slug)


def source_sha(text: str) -> str:
    """The identity of an English page, for spotting stale translations."""
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _render_fence(self, tokens, idx, options, env):
    """Mermaid fences become <pre class="mermaid">, the shape the site renders."""
    token = tokens[idx]
    info = (token.info or "").strip()
    if info == "mermaid":
        return f'<pre class="mermaid">{html.escape(token.content)}</pre>\n'
    cls = f' class="language-{html.escape(info)}"' if info else ""
    return f"<pre><code{cls}>{html.escape(token.content)}</code></pre>\n"


def _render_link_open(self, tokens, idx, options, env):
    token = tokens[idx]
    href = token.attrGet("href") or ""
    if href:
        token.attrSet("href", rewrite_link(href))
    if href.startswith(("http://", "https://")):
        token.attrSet("target", "_blank")
        token.attrSet("rel", "noopener")
    return self.renderToken(tokens, idx, options, env)


def _render_heading_open(self, tokens, idx, options, env):
    inline = tokens[idx + 1]
    if inline.type == "inline":
        tokens[idx].attrSet("id", slugify(inline.content))
    return self.renderToken(tokens, idx, options, env)


def make_renderer() -> MarkdownIt:
    md = MarkdownIt("commonmark", {"html": False, "linkify": True})
    md.enable(["table", "strikethrough"])
    md.add_render_rule("fence", _render_fence)
    md.add_render_rule("link_open", _render_link_open)
    md.add_render_rule("heading_open", _render_heading_open)
    return md


def extract_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback.replace("-", " ")


def extract_description(text: str) -> str:
    """The first real paragraph, flattened, for <meta name=description>."""
    body = re.sub(r"^#\s+.*$", "", text, count=1, flags=re.M)
    for block in re.split(r"\n\s*\n", body):
        block = block.strip()
        if not block or block[0] in "#|-*>`":
            continue
        flat = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", block)
        flat = re.sub(r"[`*_]", "", flat)
        flat = re.sub(r"\s+", " ", flat).strip()
        if len(flat) > 155:
            flat = flat[:152].rsplit(" ", 1)[0] + "..."
        return flat
    return "The harness-kit knowledge base."


def lang_dir(wiki: Path, i18n: Path, lang: Lang) -> Path:
    """Where a language's markdown comes from. English is the wiki itself."""
    return wiki if lang.code == DEFAULT_LANG.code else i18n / lang.code


def alternates(page: str, lang: Lang) -> str:
    """hreflang links, so Google serves the right language and does not read
    the three versions as duplicates competing for one rank."""
    href = page_href(page)
    out = [
        f'<link rel="alternate" hreflang="{other.hreflang}" '
        f'href="{lang.up}{other.subdir}{href}" />'
        for other in LANGS
    ]
    out.append(
        f'<link rel="alternate" hreflang="x-default" '
        f'href="{lang.up}{DEFAULT_LANG.subdir}{href}" />'
    )
    return "\n".join(out)


def lang_switch(page: str, lang: Lang) -> str:
    """The EN/PT/ES pills. Real links, not a JS toggle: each language is its own
    URL, which is what makes the translations indexable at all."""
    href = page_href(page)
    pills = [
        f'<a href="{lang.up}{other.subdir}{href}" hreflang="{other.hreflang}" '
        f'aria-pressed="{"true" if other.code == lang.code else "false"}">{other.label}</a>'
        for other in LANGS
    ]
    return '<span class="langsw" role="group" aria-label="Language">' + "".join(pills) + "</span>"


TEMPLATE = """<!doctype html>
<html lang="{{htmllang}}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{title}} &middot; harness-kit wiki</title>
<meta name="description" content="{{desc}}" />
<meta property="og:title" content="{{title}} &middot; harness-kit wiki" />
<meta property="og:description" content="{{desc}}" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="{{oglocale}}" />
<meta property="og:url" content="{{canonical}}" />
<meta property="og:image" content="{{site}}/preview.gif" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{{site}}/preview.gif" />
<link rel="canonical" href="{{canonical}}" />
{{alternates}}
<link rel="icon" href="{{siteup}}favicon.svg" type="image/svg+xml" />
<meta id="theme-color" name="theme-color" content="#08090c" />
<!--
  GENERATED FILE - DO NOT EDIT.
  Source: {{source}} ({{langcode}}). Regenerated by scripts/build-wiki.py.
  English comes from the wiki; pt and es from wiki-i18n/. Edit those, not this.
-->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="{{fonts}}" rel="stylesheet" />
<link rel="stylesheet" href="{{siteup}}assets/tokens.css" />
<link rel="stylesheet" href="{{siteup}}assets/wiki.css" />
</head>
<body>
<header>
  <a class="wordmark" href="{{siteup}}index.html">harness<span class="dash">-</span>kit
    <span class="sub">wiki</span></a>
  <nav>
    <a class="hide-sm" href="{{siteup}}index.html">{{navguide}}</a>
    <a class="hide-sm" href="index.html">{{navhome}}</a>
    <a class="cta" href="{{repo}}">github &#8599;</a>
    <span class="controls">
      {{langswitch}}
      <button type="button" class="themebtn" id="themebtn"
              aria-label="Toggle dark / light theme">
        <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12"
             cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41
             1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path
             d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </span>
  </nav>
</header>

<button type="button" class="navtoggle" id="navtoggle" aria-expanded="false"
        aria-controls="wikinav">{{navcontents}}</button>

<div class="wikishell">
  <aside class="wikinav" id="wikinav">{{sidebar}}</aside>
  <main class="wikibody">
{{content}}
    <p class="editnote">{{mirror}}</p>
  </main>
</div>

<footer>
  <div class="wrap">
    <span>{{tagline}}</span>
    <span><a href="{{repo}}">github.com/Pierry/harness-kit</a> &middot; MIT</span>
  </div>
</footer>

<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

  const MERMAID_VARS = {
    dark: {
      background: "transparent", primaryColor: "#161a22", primaryTextColor: "#edeff3",
      primaryBorderColor: "#2b323e", secondaryColor: "#101319", tertiaryColor: "#0b0d11",
      lineColor: "#7c6ad9", textColor: "#9aa3b2", clusterBkg: "#0d0f14",
      clusterBorder: "#2b323e", edgeLabelBackground: "#0a0c10", nodeBorder: "#2b323e",
      fontSize: "14px",
    },
    light: {
      background: "transparent", primaryColor: "#f4f1fb", primaryTextColor: "#1b1822",
      primaryBorderColor: "#d6cfe4", secondaryColor: "#ece8f6", tertiaryColor: "#f6f4fb",
      lineColor: "#7c5cf0", textColor: "#54506a", clusterBkg: "#efeaf8",
      clusterBorder: "#d6cfe4", edgeLabelBackground: "#ffffff", nodeBorder: "#d6cfe4",
      fontSize: "14px",
    },
  };
  const mermaidNodes = [...document.querySelectorAll("pre.mermaid")];
  mermaidNodes.forEach((n) => { n.dataset.src = n.textContent; });
  let mermaidBusy = false;
  async function renderMermaid(theme) {
    if (mermaidBusy || !mermaidNodes.length) return;
    mermaidBusy = true;
    mermaid.initialize({
      startOnLoad: false, theme: "base", securityLevel: "strict",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      flowchart: { curve: "basis", padding: 14, useMaxWidth: true },
      themeVariables: MERMAID_VARS[theme] || MERMAID_VARS.dark,
    });
    mermaidNodes.forEach((n) => {
      n.removeAttribute("data-processed"); n.innerHTML = n.dataset.src;
    });
    try { await mermaid.run({ nodes: mermaidNodes }); } catch (e) { /* noop */ }
    mermaidBusy = false;
  }

  const root = document.documentElement;
  const themeColorMeta = document.getElementById("theme-color");
  const THEME_BG = { dark: "#08090c", light: "#faf9fc" };
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeColorMeta) themeColorMeta.setAttribute("content", THEME_BG[theme]);
    renderMermaid(theme);
  }
  const storedTheme = localStorage.getItem("hk-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  let theme = storedTheme || (prefersLight ? "light" : "dark");
  applyTheme(theme);
  document.getElementById("themebtn").addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    localStorage.setItem("hk-theme", theme);
    applyTheme(theme);
  });

  /* The landing page keeps its language in hk-lang. Follow the reader's choice
     when they cross over, and record it when they switch here, so the two
     halves of the site agree on what language they are speaking. */
  localStorage.setItem("hk-lang", "{{langcode}}");

  const toggle = document.getElementById("navtoggle");
  const nav = document.getElementById("wikinav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  const here = location.pathname.split("/").pop() || "index.html";
  nav.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("href") === here) a.classList.add("here");
  });
</script>
</body>
</html>
"""


def render_page(page: str, text: str, sidebar_html: str, md: MarkdownIt, lang: Lang) -> str:
    title = extract_title(text, page)
    strings = STRINGS[lang.code]
    values = {
        "title": html.escape(title),
        "desc": html.escape(extract_description(text), quote=True),
        "canonical": f"{SITE}/wiki/{lang.subdir}{page_href(page)}",
        "alternates": alternates(page, lang),
        "langswitch": lang_switch(page, lang),
        "htmllang": lang.hreflang,
        "oglocale": lang.hreflang.replace("-", "_"),
        "langcode": lang.code,
        "siteup": lang.site_up,
        "site": SITE,
        "repo": REPO,
        "source": f"{page}.md",
        "fonts": FONTS,
        "navguide": strings["guide"],
        "navhome": strings["home"],
        "navcontents": strings["contents"],
        "tagline": strings["tagline"],
        "mirror": strings["mirror"].format(url=f"{REPO}/wiki/{page}", name=html.escape(title)),
        "sidebar": sidebar_html,
        "content": md.render(text),
    }
    out = TEMPLATE
    for key, value in values.items():
        out = out.replace("{{" + key + "}}", value)
    return out


def english_pages(wiki: Path) -> dict[str, str]:
    """Every real wiki page, by name. Underscore pages are wiki chrome."""
    return {
        f.stem: f.read_text() for f in sorted(wiki.glob("*.md")) if not f.stem.startswith("_")
    }


def stale_translations(wiki: Path, i18n: Path) -> list[str]:
    """Pages whose English moved since the translations were written.

    Returns names, not a bool, because the useful failure message is the list of
    what to retranslate. A missing translation counts as stale for the same
    reason: both mean the reader would get something other than this page.
    """
    manifest_file = i18n / MANIFEST
    manifest = json.loads(manifest_file.read_text()) if manifest_file.exists() else {}
    stale = []
    for page, text in english_pages(wiki).items():
        if manifest.get(page) != source_sha(text):
            stale.append(page)
            continue
        missing = [
            lang.code
            for lang in LANGS
            if lang.code != DEFAULT_LANG.code and not (i18n / lang.code / f"{page}.md").exists()
        ]
        if missing:
            stale.append(page)
    return sorted(stale)


def write_manifest(wiki: Path, i18n: Path) -> int:
    """Record the English each translation was made from. Run after translating."""
    manifest = {page: source_sha(text) for page, text in english_pages(wiki).items()}
    i18n.mkdir(parents=True, exist_ok=True)
    (i18n / MANIFEST).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return len(manifest)


def build_lang(wiki: Path, i18n: Path, out: Path, lang: Lang, md: MarkdownIt) -> list[str]:
    src = lang_dir(wiki, i18n, lang)
    if not src.is_dir():
        return []
    target_dir = out / lang.subdir if lang.subdir else out
    target_dir.mkdir(parents=True, exist_ok=True)
    for stale in target_dir.glob("*.html"):
        stale.unlink()

    sidebar_file = src / f"{SIDEBAR}.md"
    sidebar_html = md.render(sidebar_file.read_text()) if sidebar_file.exists() else ""

    written = []
    for source in sorted(src.glob("*.md")):
        if source.stem.startswith("_"):
            continue
        target = target_dir / page_href(source.stem)
        target.write_text(render_page(source.stem, source.read_text(), sidebar_html, md, lang))
        written.append(f"{lang.subdir}{target.name}")
    return written


def build(wiki: Path, out: Path, i18n: Path) -> list[str]:
    md = make_renderer()
    written = []
    for lang in LANGS:
        written.extend(build_lang(wiki, i18n, out, lang, md))
    return written


def parse_args():
    parser = argparse.ArgumentParser(description="Render the wiki into docs/wiki/.")
    parser.add_argument("wiki", type=Path, help="path to a clone of the wiki repo")
    parser.add_argument("--out", type=Path, default=Path("docs/wiki"))
    parser.add_argument("--i18n", type=Path, default=Path("wiki-i18n"))
    parser.add_argument(
        "--check", action="store_true", help="fail if any translation is stale, write nothing"
    )
    parser.add_argument(
        "--update-manifest",
        action="store_true",
        help="record the current English SHAs after translating by hand",
    )
    return parser.parse_args()


def report_stale(stale: list[str]) -> int:
    print("Stale translations. The English moved and pt/es did not follow:\n")
    for page in stale:
        print(f"  {page}")
    print(
        "\nTranslate the pages above into wiki-i18n/pt/ and wiki-i18n/es/, then run:\n"
        "  python3 scripts/build-wiki.py <wiki> --update-manifest\n\n"
        "There is no API key here on purpose: translation is manual. This check is\n"
        "what stops the site serving an outdated translation as if it were current."
    )
    return 1


def main() -> int:
    args = parse_args()
    if not args.wiki.is_dir():
        sys.exit(f"not a directory: {args.wiki}")

    if args.update_manifest:
        print(f"recorded {write_manifest(args.wiki, args.i18n)} English SHAs in {args.i18n}")
        return 0

    stale = stale_translations(args.wiki, args.i18n)
    if stale:
        return report_stale(stale)
    if args.check:
        print("translations up to date")
        return 0

    written = build(args.wiki, args.out, args.i18n)
    if not written:
        sys.exit(f"no wiki pages found in {args.wiki}")
    print(f"wrote {len(written)} pages to {args.out} across {len(LANGS)} languages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
