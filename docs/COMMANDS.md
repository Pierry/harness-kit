# Commands & gates

Every command in the harness, and the sensors and evals that gate each stage.

## Pipeline commands

```
/pipeline:run "<idea>"         idea to merged PR with gated autonomy: intake harvests context, stages run on their own, human approves at two gates (--yolo skips them)
/intake:run                    harvest repo + context-library into one intake artifact so later stages never stop to ask
/golden-path                   idea to merged PR, runs the full PM then Eng pipeline
/product-manager:run           draft PRD then PRP
/sse:run                       plan, dev, test, open PR, watch for merge
/sse:run --local               plan, dev, test, stop before PR
/sse:sdd                       spec-driven loop: dev↔test↔eval until the PRP is met, no PR
/context:pack <feature_id>     repomix snapshot of the target repo (per-feature cache)
/context:graph [repo]          graphify knowledge graph of a target repo (per-repo cache)
/pipeline:continue             resume the next pending stage
/pipeline:reset                abandon the active run
```

## Single-stage commands

Each stage is its own slash command. Run one when that's all you need.

| Stage | Command | Gates (sensors · evals) |
|---|---|---|
| `prd` | `/product-manager:prd` | `prd-structure`, `prd-acceptance-criteria` · `prd-quality`, `prd-readiness` |
| `prp` | `/product-manager:prp` | `prp-structure`, `prp-context-quality`, `prp-links`, `link-validator` · `prp-quality`, `prp-context-readiness` |
| `plan` | `/sse:plan` | `plan-structure` · `plan-quality` |
| `dev` | `/sse:dev` | `code-conventions`, `test-coverage`, `dev-structure` · `dev-quality`. Asks once, before coding, whether to apply the designer skill when the work has UI |
| `test` | `/sse:test` | `test-structure` · `test-quality` |
| `pr` | `/sse:pr` | `pr-structure` · `pr-quality` · auto-arms `/sse:pr-monitor` |
| `sdd` | `/sse:sdd` | `prp-has-acceptance-criteria` (pre-flight) · `spec-satisfied` per iter (fresh session) · cap 3 iters |

## How gates work

- **Sensors** are deterministic structure checks. They block on failure, and Claude regenerates the
  artifact until they pass.
- **Evals** are LLM-judge rubrics scored 0-10. Threshold is **8.0**, retried up to 3 times.
- The **SDD eval** (`spec-satisfied`) returns `PASS`/`FAIL` instead of a score. `FAIL` re-enters the
  loop with a `next_iter_focus` hint. The loop predicate is built from the PRP's
  `Success criteria (verifiable)` and `Validation gates` sections, both must be present and
  concrete, or the `prp-has-acceptance-criteria` sensor blocks before the first iteration. Hitting
  the cap without a `PASS` returns a blocker listing the unmet criteria.

An approval marker (`<!-- approved: -->`) gates the next stage. Token spend per phase is appended as
an inline `<!-- tokens: ... -->` comment.

## Modes that skip the PR

```
/sse:run --local          plan → dev → test → STOP            (single shot, no loop)
/sse:sdd                  plan → [dev↔test↔eval] ×3 → STOP    (spec-driven goal loop)
```

`/sse:sdd` never auto-opens a PR. Review the loop transcript at
`.claude/runtime/outputs/sse/sdd/{feature_id}.md`, then run `/sse:pr` when ready.

## Deploy a static site

```
/sse:firebase-publish [project-id] [site-id]   create or reuse a Firebase project, deploy Hosting
```

A standalone post-pipeline step, not part of `/sse:run`. Creates the project if missing (else
reuses it), configures `firebase.json`, stages to a preview channel, then promotes to live. Never
deletes any resource. Hand off to the `firebase-add-domain` skill for a custom domain.

## Resume

State persists at `.claude/.pipeline-state.json`.

```
/pipeline:continue       next pending stage for the active feature
/pipeline:reset          abandon the active run and start fresh
```

When the PR merges, the in-session monitor clears state automatically.
