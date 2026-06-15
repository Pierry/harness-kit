---
description: Pack target repo with repomix. Snapshot for AI context. Cached per feature_id.
---

Build repomix snapshot of target repo. Used by `/sse:plan`, `/sse:sdd` supervisor eval, and multi-repo PRPs.

## Inputs

- Arg 1 (required): `feature_id` (matches PRD/PRP filename basename)
- Arg 2 (optional): target repo path (default = cwd)
- `--include "glob"`: narrow scope (e.g. `--include "src/auth/**"`). Repeat with comma-separated globs.
- `--style xml|markdown`: output format. Default xml.

## Pre-flight

Run `command -v repomix`. Missing → block with install hint:
```
repomix not installed
install: npm i -g repomix  |  brew install repomix
docs:    https://repomix.com
```

## Steps

1. Bash: `.claude/scripts/pack-repo.sh <feature_id> [target] [--include glob] [--style xml]`
2. Script writes `.claude/runtime/cache/repomix/{feature_id}.{style}`
3. Report path + size + token estimate

## When to use

- Target repo > 50 files and stages keep re-grepping same context
- Multi-repo feature: pack each repo, supervisor eval reads concat
- SDD loop: pack `{changed files} ∪ {PRP "Repos and files touched"}` for cheaper per-iter eval

When NOT to use:
- Small repo (<20 files): grep is fine
- Pack would exceed context budget (>200k tokens): narrow with `--include`

## Reply format

```
Pack complete.
  feature:  {feature_id}
  target:   {target_dir}
  style:    {xml|markdown}
  include:  {glob | (default .gitignore aware)}
  path:     .claude/runtime/cache/repomix/{feature_id}.{ext}
  size:     {N} bytes
  tokens:   {N} (repomix estimate)
  next:     consumed automatically by /sse:plan, /sse:sdd if cache present
```

## Cleanup

Pack invalidated when:
- `/pipeline:reset` runs (clears all caches for active feature)
- Manual: `rm .claude/runtime/cache/repomix/{feature_id}.*`

Pack is **snapshot, not live**. Re-run when target repo materially changes mid-feature.
