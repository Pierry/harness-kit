# PRP Template

Fill this template when drafting a Product Requirements Prompt. Keep section numbering. Replace placeholders. Pin every reference to a real file or URL.

---

# PRP: {Title}

**Source PRD:** {path}
**Target executor:** coding-agent | engineer | mixed
**Squad:** {squad} | **Tech lead:** {name} | **Date:** {YYYY-MM-DD}

## 1) Goal

One paragraph. What the executor must ship. Tied to the PRD's hypothesis.

## 2) Why

- business value
- user impact
- strategic tie

## 3) What

**User-visible behavior:**
- {bullet}

**Out of scope:**
- {what NOT to build}

**Success criteria (verifiable):**
- [ ] {Given/When/Then or measurable check}

## 4) Context

### Repos and files touched

| Repo | File | Change type | Reference |
|------|------|-------------|-----------|
| {repo} | {file:line} | new \| modify \| delete | {link or PR id} |

### Patterns to follow

- **Pattern:** {name}
  **Example in codebase:** `{file:line}`
  **Why follow it:** {1 sentence}

### External documentation

- {URL}: {what to read, which section}

### Known gotchas

- {gotcha}: {how to handle}

## 5) Implementation blueprint

```
1. Add {class} at {path}
2. Wire into {existing class} at {file:line}
3. Add migration {script name}
4. Expose endpoint {METHOD /path}
```

**Data:**
- Schema changes: {DDL or migration file name}
- Volumes expected: {rows/day, peak rps}

**Observability:**
- Logs: {what to log, level, where}
- Metrics: {metric name + dashboard link}
- Alerts: {condition: action}

## 6) Validation gates

```bash
{commands the executor MUST run}
```

**Manual verification:**
- [ ] {step that requires human or browser check}

## 7) Rollout

- [ ] Feature flag: {flag name or "none"}
- [ ] Migration required: {yes/no, plan}
- [ ] Rollback plan: {one-line description}

## 8) Open items

- [ ] {item}, owner @{name}

## 9) References

- PRD: {path}
- ADR: {link}
- Design doc: {link}
- Dashboards: {link}
