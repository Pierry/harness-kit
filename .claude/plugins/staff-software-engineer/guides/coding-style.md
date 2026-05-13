# Coding Style

How code reads . Applies to all areas unless a `{repo}/.claude/conventions/{area}.md` says otherwise.

## Principles

- Read before write. At least 3 similar files in the repo before producing new code.
- Match repo conventions. Do not mix stacks (no JPA in repos using AbstractRepository, no Composition API in Vue 2 repos).
- Pragmatic over perfect. Small PRs, 1-4 files, under 100 lines ideal.
- Test service logic always. Feature or bugfix without tests is incomplete.
- Clean dead code when touching related files. Do not leave commented-out blocks.
- Temp code marked: `// please remove me` so reviewers catch it.
- Revert if issues, investigate second.
- Defensive: null-safe, guards, edge cases.
- No speculative abstraction. Three similar lines beats premature DRY.

## Never invent

If a class, helper, or pattern is not in the repo, do not fabricate it.

Java/Kotlin:
```java
// TBD - verify with tech lead: {what you searched, where, what is missing}
```

Vue:
```vue
<!-- TBD - verify with tech lead: {what is missing} -->
```

A TODO with context beats fabricated code.

## Backend defaults (Java/Kotlin/team)

See skills/backend/SKILL.md.

## Web defaults (Vue/team)

See skills/web/SKILL.md.

## Mobile defaults

See skills/mobile/SKILL.md.

## DevOps defaults

See skills/devops/SKILL.md.

## Project overrides

A repo can override any rule via `.claude/conventions/{area}.md`. See guides/conventions-override.md.
