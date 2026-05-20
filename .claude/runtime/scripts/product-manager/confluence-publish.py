#!/usr/bin/env python3
"""
Publish a PRD or PRP to Confluence.

Reads credentials from environment:
  - JIRA_USERNAME (email)
  - JIRA_API_TOKEN (API token)

Targets the Confluence at https://YOUR-DOMAIN.atlassian.net.

Usage:
  confluence-publish.py --artifact PATH.md --kind {prd|prp}

Exit 0 on success, 1 on failure. Stays silent on routine output, prints
errors to stderr.
"""

import argparse
import base64
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

CONFLUENCE_BASE = "https://YOUR-DOMAIN.atlassian.net/wiki/rest/api/content"
SPACE_KEY = "TET1"

# Parent page IDs per kind. Override via env if needed.
PARENT_IDS = {
    "prd": os.environ.get("CONFLUENCE_PARENT_PRD", "11351457795"),
    "prp": os.environ.get("CONFLUENCE_PARENT_PRP", "11351457795"),
}


def md_to_storage(md: str) -> str:
    """Minimal Markdown to Confluence storage XHTML.
    Good enough for headings, paragraphs, fenced code, lists, tables.
    For richer rendering, swap for a real converter later.
    """
    lines = md.splitlines()
    out: list[str] = []
    in_code = False
    in_list: str | None = None  # 'ul' or 'ol'
    in_table = False

    def close_list():
        nonlocal in_list
        if in_list:
            out.append(f"</{in_list}>")
            in_list = None

    def close_table():
        nonlocal in_table
        if in_table:
            out.append("</tbody></table>")
            in_table = False

    for line in lines:
        if line.startswith("```"):
            close_list()
            close_table()
            if not in_code:
                lang = line[3:].strip() or "none"
                out.append(
                    f'<ac:structured-macro ac:name="code">'
                    f'<ac:parameter ac:name="language">{html.escape(lang)}</ac:parameter>'
                    f'<ac:plain-text-body><![CDATA['
                )
                in_code = True
            else:
                out.append("]]></ac:plain-text-body></ac:structured-macro>")
                in_code = False
            continue

        if in_code:
            out.append(line)
            continue

        h = re.match(r"^(#{1,6})\s+(.+)$", line)
        if h:
            close_list()
            close_table()
            level = len(h.group(1))
            out.append(f"<h{level}>{html.escape(h.group(2))}</h{level}>")
            continue

        if re.match(r"^[-*]\s+", line):
            close_table()
            if in_list != "ul":
                close_list()
                out.append("<ul>")
                in_list = "ul"
            item = re.sub(r"^[-*]\s+", "", line)
            out.append(f"<li>{html.escape(item)}</li>")
            continue

        if re.match(r"^\d+\.\s+", line):
            close_table()
            if in_list != "ol":
                close_list()
                out.append("<ol>")
                in_list = "ol"
            item = re.sub(r"^\d+\.\s+", "", line)
            out.append(f"<li>{html.escape(item)}</li>")
            continue

        if line.startswith("|") and "|" in line[1:]:
            close_list()
            cells = [c.strip() for c in line.strip("|").split("|")]
            if not in_table:
                out.append("<table><tbody>")
                in_table = True
                out.append(
                    "<tr>"
                    + "".join(f"<th>{html.escape(c)}</th>" for c in cells)
                    + "</tr>"
                )
            elif all(re.fullmatch(r":?-+:?", c) for c in cells):
                # separator row, skip
                pass
            else:
                out.append(
                    "<tr>"
                    + "".join(f"<td>{html.escape(c)}</td>" for c in cells)
                    + "</tr>"
                )
            continue

        # paragraph or blank
        close_list()
        close_table()
        if line.strip():
            out.append(f"<p>{html.escape(line)}</p>")

    close_list()
    close_table()
    return "\n".join(out)


def extract_title(md: str) -> str:
    for line in md.splitlines():
        m = re.match(r"^#\s+(.+)$", line)
        if m:
            return m.group(1).strip()
    return "Untitled"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--kind", required=True, choices=["prd", "prp"])
    args = parser.parse_args()

    username = os.environ.get("JIRA_USERNAME")
    token = os.environ.get("JIRA_API_TOKEN")
    if not username or not token:
        print("[confluence-publish] JIRA_USERNAME/JIRA_API_TOKEN not set", file=sys.stderr)
        return 1

    md = args.artifact.read_text(encoding="utf-8")
    title = extract_title(md)
    storage = md_to_storage(md)

    payload = {
        "type": "page",
        "title": title,
        "ancestors": [{"id": PARENT_IDS[args.kind]}],
        "space": {"key": SPACE_KEY},
        "body": {"storage": {"value": storage, "representation": "storage"}},
    }

    auth = base64.b64encode(f"{username}:{token}".encode()).decode()
    req = urllib.request.Request(
        CONFLUENCE_BASE,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            page_url = data.get("_links", {}).get("base", "") + data.get(
                "_links", {}
            ).get("webui", "")
            print(f"[confluence-publish] published: {page_url}", file=sys.stderr)
            return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[confluence-publish] HTTP {e.code}: {body[:500]}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[confluence-publish] error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
