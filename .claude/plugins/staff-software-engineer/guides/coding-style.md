# Coding Style

How code reads. Applies to all areas unless `{repo}/.claude/conventions/{area}.md` says otherwise.

## Principles

- Read before write. At least 3 similar files in repo before producing new code.
- Match repo conventions. No mixing stacks (no JPA in repos using AbstractRepository, no Composition API in Vue 2 repos).
- Pragmatic over perfect. Small PRs, 1-4 files, under 100 lines ideal.
- Test service logic always. Feature or bugfix without tests is incomplete.
- Clean dead code when touching related files. No commented-out blocks.
- Temp code marked: `// please remove me` so reviewers catch it.
- Revert if issues, investigate second.
- Defensive: null-safe, guards, edge cases.
- No speculative abstraction. Three similar lines beats premature DRY.

## Never invent

If class, helper, or pattern not in repo, do not fabricate.

Java/Kotlin:
```java
// TBD - verify with tech lead: {what you searched, where, what is missing}
```

Vue:
```vue
<!-- TBD - verify with tech lead: {what is missing} -->
```

TODO with context beats fabricated code.

## Backend defaults (Java/Kotlin/team)

See skills/backend/SKILL.md.

## Web defaults (Vue/team)

See skills/web/SKILL.md.

## Mobile defaults

See skills/mobile/SKILL.md.

## DevOps defaults

See skills/devops/SKILL.md.

## Project overrides

Repo can override any rule via `.claude/conventions/{area}.md`. See guides/conventions-override.md.
