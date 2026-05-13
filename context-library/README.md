# Context Library

Reference material the plugins consult before generating PRDs, PRPs, plans, and PRs. Public-template by default. Fill these in per-org.

## Layout

```
context-library/
├── business-info.md          company snapshot (mission, customers, segments)
├── personal-context.md       per-user role, style, constraints (gitignored)
├── stakeholder-template.md   stakeholder map template
├── writing-style.md          internal writing voice (drop pleasantries, etc)
├── squads/                   per-team folders with squad-specific context
│   └── README.md
├── strategy/                 OKRs, roadmaps, frameworks
│   └── README.md
├── decisions/                ADR-style records
│   └── README.md
├── meetings/                 raw notes that may inform later artifacts
├── metrics/                  dashboards, baselines, north stars
├── research/                 customer research, interviews, synthesis
└── example-prds/             reference artifacts the PM agent reads
    └── README.md
```

Only the templated files ship. Add your own content inside each folder. The plugins read whatever is there.

## How plugins use this

- `product-manager` agent reads `business-info.md`, `writing-style.md`, `squads/{squad}/`, and `example-prds/` before drafting a PRD or PRP.
- `staff-software-engineer` agent reads `decisions/` (for ADRs), `metrics/` (for SLO context), and `squads/{squad}/` (for domain terms).
- Personal files (`personal-context-*.md`, `writing-style-customer.md`, etc) are gitignored. Each user keeps their own copy locally.

## Conventions

- One topic per file. Short, scannable.
- Real numbers, real names. Avoid generic prose.
- Mark unknowns with `NOT FOUND - NEEDS REVIEW: {detail}`.
