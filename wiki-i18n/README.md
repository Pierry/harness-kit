# wiki-i18n

The pt-BR and es translations of the [wiki](https://github.com/Pierry/harness-kit/wiki).

English lives in the wiki and stays editable in the browser. These are the other two
languages, because the site is trilingual and the wiki is half the project's value.

## Why these are files and not an API call

There is no `ANTHROPIC_API_KEY` in this repo and there will not be one. Translation is
manual. That is a deliberate trade: machine translation of dense technical prose gets the
register wrong in exactly the way this project spends effort avoiding, and an unreviewed
translation shipping straight to a public site is not worth the convenience.

## The catch, and the check

Manual translation rots. Edit an English page, forget these, and the site serves last
month's Portuguese as if it were current. Nobody notices, because a stale page looks
exactly like a fresh one.

So `sources.json` records the SHA of the English each translation was made from, and the
build refuses to publish when they drift:

```
$ python3 scripts/build-wiki.py <wiki> --check
Stale translations. The English moved and pt/es did not follow:

  Sensors
```

A failing `wiki to site` job after a wiki edit is the system working, not a bug.

## Editing an English page

1. Edit it in the wiki, as normal. The `wiki to site` job runs and fails.
2. Update `pt/{Page}.md` and `es/{Page}.md` to match.
3. Record the new English SHAs:

   ```
   python3 scripts/build-wiki.py <path-to-wiki-clone> --update-manifest
   ```

4. Commit. The job re-runs and publishes all three languages.

To get a wiki clone: `git clone https://github.com/Pierry/harness-kit.wiki.git`

## Adding a new page

Same flow. A new English page with no translation counts as stale, so the build blocks
until `pt/` and `es/` have it too.

## Rules that break the site if broken

- **Link targets stay English.** `[Sensores](Sensors)`, never `[Sensores](Sensores)`.
  The target is a page name the build resolves to a file; translate it and you ship a 404.
- **Mermaid blocks stay byte-identical**, node labels included. Translating a label
  risks breaking the diagram's syntax.
- **Code blocks, paths, commands and flags stay verbatim.**
- **No em-dashes, no emojis**, same as everywhere else in this repo.

Domain terms stay English (harness, sensor, eval, gate, golden path, PRD, PRP, subagent,
inverted index, cache, sharding), inflected naturally: "os sensors", "el inverted index".
Direct quotations from cited authors stay in the author's original English, with a
parenthetical gloss. A translated quotation attributed to a named person puts words in
their mouth they never wrote.

## Adding a language

`LANGS` in `scripts/build-wiki.py`, plus a `STRINGS` entry for the page chrome, plus a
directory here. The build, the hreflang tags and the EN/PT/ES switch pick it up from there.
