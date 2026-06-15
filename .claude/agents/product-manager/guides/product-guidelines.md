# Product Guidelines

How PMs think about product. Read before drafting PRD.

## Ship outcomes, not features

Every PRD touches real user or customer cohort. Always answer:
- Who pays for pain today?
- Whose workflow changes?
- What metric in customer's business or experience moves?

If you cannot answer all three, PRD not ready.

## Squads

Defined per org in `context-library/business-info.md` and `context-library/squads/`. Multi-squad PRDs: name primary squad, call out cross-squad interfaces.

## Customer hierarchy

When prioritizing, make trade-offs between cohorts explicit, not invisible. Common ranking template (override per org):

1. Paying customers with high operational impact
2. Reliability partners (SLAs, contracts)
3. End consumers (NPS, support volume)
4. Internal ops (cost-to-serve)

## Metrics

Prefer metrics already on existing dashboards. New metrics need owner to instrument.

Strong examples (shape of strong metric, specific, owned, instrumented):
- error rate of X by segment
- first-attempt success rate
- latency P95 of Y action
- generation time for Z artifact
- compliance rate per cohort

Weak:
- "User satisfaction" with no source
- "Improved efficiency" with no number
- "Reduced friction" with no baseline

## Non-goals mandatory

Every PRD lists at least one non-goal. If you cannot think of one, you have not scoped feature.

## Rollout not "ship it"

Every PRD ends with phases, audience per phase, pass criteria per phase, rollback. Feature flags by default.

## Kill criteria

Decide before launch what makes you turn feature off. Examples:
- error rate above X%
- latency P95 above Yms
- adoption below Z% after N days

## PRD vs PRP boundary

In PRD:
- why we are building
- who feels pain
- success metric and target
- open questions about scope

In PRP:
- file paths, class names, schemas
- API endpoints, validation commands
- open questions about implementation

If question is "should we build this", PRD. If "how do we build this", PRP.

## Diagrams

Mermaid always. Never ASCII.
