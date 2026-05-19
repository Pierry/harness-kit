# PRD Template

Fill this template when drafting a Product Requirements Document. Keep section numbering. Replace placeholders. Delete sections that do not apply at the current stage.

---

# PRD: {Title}

**Squad:** {squad} | **DRI (PM):** {name} | **Date:** {YYYY-MM-DD}
**Stage:** Team Kickoff | Planning Review | Solution Review | Launch Readiness
**Bet:** {link or N/A}
**Status:** Draft | In Review | Approved | Shipped

## 1) Problem and Hypothesis

**Problem** (2 sentences max): Who suffers, how often, what it costs.

**Hypothesis:** If we {build X}, then {Y metric} will {change by Z}, because {assumption}.

**Strategy fit:** This supports {pillar} because {why now}.

**Evidence:**
- {user quote / data point / ticket id}

## 2) Customers

| Customer | Why it matters |
|----------|----------------|
| {name}   | {context}      |

## 3) Scope and Non-Goals

**In scope:**
- {bullet}

**Non-goals (max 3):**
- {what we are NOT doing and why}

**Trade-offs accepted:**
- {bullet}

## 4) Solution Overview

**Summary:** 2-3 paragraphs.

**User flow:** numbered steps or Mermaid.

**User stories:**
- As a {persona}, I want {action}, so that {benefit}.

**UX reference:** {Figma or experience expected}.

## 5) Success Metrics

| Metric | Baseline | Target | Horizon |
|--------|----------|--------|---------|
| {name} | {value}  | {value}| {N days}|

**Guardrails (must not harm):**
- {metric}: {range}

**Kill criteria:** If {condition with numeric threshold}, we will {rollback / pause / iterate}.

## 6) Rollout

| Phase | Audience | Duration | Pass criteria |
|-------|----------|----------|---------------|
| 1     |          |          |               |

## 7) Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|

## 8) Owners and Open Questions

**DRI:** {name}
**Reviewers:** {eng, design, legal, support}

**Open questions:**
- [ ] {question}, owner @{name}

## 9) Appendix

**Alternatives considered:**
- {bullet with reason for rejection}

**Research quotes:**
- {direct quote with source}
