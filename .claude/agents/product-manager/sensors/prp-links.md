# Sensor: PRP Links

Type: deterministic
Execution: computational
Mode: warn-then-gate

Implemented in scripts/link-validator.py. Same rules when agent self-checks.

## Hard checks (block)

Source PRD resolvable. "Source PRD:" line must point to path existing under .claude/runtime/outputs/pm/prd/, relative to PRP file, or relative to repo root.

No localhost URLs. `http://localhost` or `http://127.0.0.1` not allowed as pinned references.

GitHub permalinks. Links like `github.com/.../blob/{main|master|develop}/...` not allowed. Use commit SHA or tag.

## Soft checks (warn)

Path format. Inline code spans looking like file paths (have `/` and end with extension) should end in recognized extension.

URL syntax. http/https URLs must be syntactically valid.

## On failure

Hard-check failures block publish. Soft-check warnings surface for review but do not block.
