#!/usr/bin/env python3
"""Render the GitHub wiki into static pages under docs/wiki/.

The wiki (github.com/Pierry/harness-kit/wiki) stays the source of truth and
stays editable in the browser. This script is what puts the same content on the
site, for readers who never open GitHub. It pre-renders to real HTML on purpose:
a client-side markdown fetch would leave the prose invisible to search engines
and AI crawlers, which is the entire reason the content is being mirrored.

Run by .github/workflows/wiki-site.yml on the `gollum` event:

    python3 scripts/build-wiki.py <wiki-clone-dir> --out docs/wiki
"""

import argparse
import html
import re
import sys
from pathlib import Path

try:
    from markdown_it import MarkdownIt
except ImportError:  # pragma: no cover - the workflow installs this
    sys.exit("markdown-it-py is missing. Run: pip install -r requirements-docs.txt")

SITE = "https://pierry.github.io/harness-kit"
REPO = "https://github.com/Pierry/harness-kit"
HOME = "Home"
SIDEBAR = "_Sidebar"

# A wiki-relative link is a bare page name: no scheme, no slash, no extension.
# [Sensors](Sensors) and [Evals](Evals#retry) match; a github.com URL does not.
WIKI_LINK = re.compile(r"^([A-Za-z0-9][A-Za-z0-9-]*)(#[^\s]*)?$")

FONTS = (
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@"
    "12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:"
    "wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
)


def page_href(name: str) -> str:
    """The generated filename for a wiki page name. Home is the wiki index."""
    return "index.html" if name == HOME else f"{name}.html"


def rewrite_link(href: str) -> str:
    """Turn a wiki-relative link into a link between generated pages."""
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


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{title}} &middot; harness-kit wiki</title>
<meta name="description" content="{{desc}}" />
<meta property="og:title" content="{{title}} &middot; harness-kit wiki" />
<meta property="og:description" content="{{desc}}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="{{canonical}}" />
<meta property="og:image" content="{{site}}/preview.gif" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{{site}}/preview.gif" />
<link rel="canonical" href="{{canonical}}" />
<link rel="icon" href="../favicon.svg" type="image/svg+xml" />
<meta id="theme-color" name="theme-color" content="#08090c" />
<!--
  GENERATED FILE - DO NOT EDIT.
  Source: {{source}} in the harness-kit wiki. Edit the wiki page; the
  wiki-site workflow regenerates this file on the gollum event.
-->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="{{fonts}}" rel="stylesheet" />
<link rel="stylesheet" href="../assets/tokens.css" />
<link rel="stylesheet" href="../assets/wiki.css" />
</head>
<body>
<header>
  <a class="wordmark" href="../index.html">harness<span class="dash">-</span>kit
    <span class="sub">wiki</span></a>
  <nav>
    <a class="hide-sm" href="../index.html">usage guide</a>
    <a class="hide-sm" href="index.html">wiki home</a>
    <a class="cta" href="{{repo}}">github &#8599;</a>
    <span class="controls">
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
        aria-controls="wikinav">Contents</button>

<div class="wikishell">
  <aside class="wikinav" id="wikinav">{{sidebar}}</aside>
  <main class="wikibody">
{{content}}
    <p class="editnote">This page mirrors
      <a href="{{wikiurl}}" target="_blank" rel="noopener">{{source_name}}</a>
      in the wiki. Edit it there.</p>
  </main>
</div>

<footer>
  <div class="wrap">
    <span>harness-kit &middot; idea to merged PR, through one gated pipeline</span>
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


def render_page(name: str, text: str, sidebar_html: str, md: MarkdownIt) -> str:
    title = extract_title(text, name)
    href = page_href(name)
    values = {
        "title": html.escape(title),
        "desc": html.escape(extract_description(text), quote=True),
        "canonical": f"{SITE}/wiki/{href}",
        "site": SITE,
        "repo": REPO,
        "source": f"{name}.md",
        "source_name": title,
        "wikiurl": f"{REPO}/wiki/{name}",
        "fonts": FONTS,
        "sidebar": sidebar_html,
        "content": md.render(text),
    }
    page = TEMPLATE
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", value)
    return page


def build(wiki_dir: Path, out_dir: Path) -> list[str]:
    md = make_renderer()
    sidebar_file = wiki_dir / f"{SIDEBAR}.md"
    sidebar_html = md.render(sidebar_file.read_text()) if sidebar_file.exists() else ""

    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.html"):
        stale.unlink()

    written = []
    for source in sorted(wiki_dir.glob("*.md")):
        if source.stem.startswith("_"):
            continue
        target = out_dir / page_href(source.stem)
        target.write_text(render_page(source.stem, source.read_text(), sidebar_html, md))
        written.append(target.name)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wiki", type=Path, help="path to a clone of the wiki repo")
    parser.add_argument("--out", type=Path, default=Path("docs/wiki"))
    args = parser.parse_args()

    if not args.wiki.is_dir():
        sys.exit(f"not a directory: {args.wiki}")

    written = build(args.wiki, args.out)
    if not written:
        sys.exit(f"no wiki pages found in {args.wiki}")
    print(f"wrote {len(written)} pages to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
