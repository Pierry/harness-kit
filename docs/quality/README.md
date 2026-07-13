# Phase quality tracking

Persists per-phase quality signal across every pipeline run so scores stop
getting lost in chat, and answers one question: **is each stage getting better
or worse over time?**

## The loop

```
phase approved  ──►  post-eval hook  ──►  phase-log.py  ──►  phase-log.json  ──►  phase-report.html
```

1. A phase reaches `approved` (the artifact gets its `<!-- approved: DATE score=N -->` marker).
2. The stage's `post-eval-*.sh` hook fires (already wired for prd, prp, plan, dev, test, pr).
3. It calls [`.claude/scripts/phase-log.py`](../../.claude/scripts/phase-log.py), best-effort (never breaks the hook).
4. One entry is appended to `.claude/runtime/outputs/quality/phase-log.json`.
5. Open [`phase-report.html`](phase-report.html) and drop that JSON to see the charts.

## What each entry records (deterministic, zero token cost)

| field    | source                                                        |
|----------|---------------------------------------------------------------|
| `score`  | eval score parsed from the approval marker                    |
| `gaps`   | count of `NOT FOUND - NEEDS REVIEW` markers left in artifact   |
| `sensors`| the stage sensors re-run against the artifact (pass/fail)     |
| `status` | derived: `failed` (sensor blocked) / `degraded` (score<7 or gaps>0) / `ok` |
| `tokens` | phase token totals, if the tokens file exists                 |

No LLM judgment — only signal the harness already computes. That means it
catches "generated wrong / left a gap / broke a gate", not subjective misreads
beyond what a sensor or a low score already reflects.

## The report page

`phase-report.html` is a standalone file (no build, no network). Double-click
it or serve it locally, then drop `phase-log.json`. Shows:

- KPI tiles: phases logged, avg score, failure rate, open gaps
- **Score trend by stage** — the "is it improving?" view
- Failure rate by stage (ok / degraded / failed)
- Average score by stage vs the 7.0 threshold
- Sensors that block most
- Full run table

Click **Load sample** to explore with synthetic data before you have a real log.
When served over HTTP you can also deep-link a log: `phase-report.html?log=<url>`
auto-fetches it (same-origin only).

Material Design 3, dark and light themes (system preference, toggle persisted),
and three locales (en, pt-BR, es) via the language switch.

## Manual use

```bash
python3 .claude/scripts/phase-log.py \
  --feature-id 2026-07-13-billing \
  --stage prd \
  --artifact .claude/runtime/outputs/pm/prd/2026-07-13-billing.md
```
