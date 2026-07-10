# Repos

> Template. Rename to `repos.md` and fill in. The `intake` stage and the PRP/SSE stages read this to
> resolve target repo paths **without asking** (resolve-mark-proceed). One row per repo a squad owns.

Map each squad to the repositories it works in, so a stage can look up where a feature lands instead of
stopping to ask. Paths may be local (absolute or relative to the workspace root) or `https://` git URLs.

| Squad | Repo | Path | Area | Notes |
|-------|------|------|------|-------|
| {squad-1} | {repo-name} | {/abs/path or https://…} | backend/web/mobile/devops | {what it holds} |
| {squad-1} | {repo-name-2} | {…} | web | {…} |
| {squad-2} | {repo-name} | {…} | backend | {…} |

## Resolution order (how stages use this)

1. Intake artifact `repos` frontmatter (already resolved for the current feature).
2. This file, matched by squad.
3. Auto-detect from the current working directory and git remotes.
4. If none yield a path: `NOT FOUND - NEEDS REVIEW: target repo` and proceed.

## Conventions

- One row per repo. Keep paths current; a stale path sends a stage to the wrong tree.
- Prefer local paths for repos already checked out in the workspace; use git URLs otherwise.
- `area` seeds the SSE agent's area-skill choice (backend, web, mobile, devops).
