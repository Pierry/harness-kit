# Commit Style

Conventional Commits with team ticket prefix.

## Format

```
{type}({TICKET}): {description} (#PR)
```

Types: feat, fix, chore, refactor, build, docs, test.

Examples:
- `feat(PROJ-123): adding timezone-aware deadline check (#456)`
- `fix(PROJ-42): correcting late flag for region-1 customers`
- `chore(PROJ-7): updating Spring Boot to 2.7`
- `refactor(PROJ-91): extracting DeadlineEvaluator from OrderService`

## Description

- Imperative/gerund mood. "Adding", "Removing", "Enhancing", "Fixing".
- Single line. Under 70 characters.
- PR number when available.

## Body (optional)

- Why, not what. Diff already shows what.
- Reference linked tickets or related PRs.
- Mention breaking changes explicitly with `BREAKING CHANGE:` footer.

## Bad

- "WIP", "fixes", "more changes", "asdf"
- Ticket missing
- Description that just repeats the type ("fix(...): fix the bug")
- Multi-line title

## Co-author

When pairing or AI-assisted:

```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
