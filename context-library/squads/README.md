# Squads

One folder per squad. Each folder contains squad-specific context the agents will read when drafting artifacts owned by that squad.

## Per-squad layout

```
squads/
└── {squad-slug}/
    ├── domain.md           what the squad owns, key entities, lifecycle
    ├── stack.md            languages, frameworks, infra, datastores
    ├── owners.md           tech lead, EM, PM, on-call rotation
    ├── runbooks/           common incident playbooks
    └── decisions/          squad-level ADRs
```

## Slug rules

- kebab-case, short (e.g. `billing`, `checkout`, `growth`).
- The status-line hook uses the slug as a prefix on artifact filenames: `YYYY-MM-DD-{squad}-{slug}.md`.

## Example

```
squads/
├── billing/
│   ├── domain.md
│   ├── stack.md
│   └── owners.md
└── checkout/
    └── domain.md
```
