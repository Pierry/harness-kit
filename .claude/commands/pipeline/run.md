---
description: Idea to merged PR with gated autonomy. Harvests context, runs every stage on its own, and pauses only at two gates: approve direction after the PRD, approve the PR before it opens.
---

Gated-autonomy pipeline. One idea in, a merged PR out, with the human on the loop at two points instead
of in the loop before every artifact. You are the **orchestrator**: you own state and gates, you
dispatch each stage, you do not author artifacts yourself.

Take the idea from the invocation argument. If none was given, ask once for a one-line idea, then
proceed autonomously from there.

## Sequence

Record intent:

```
.claude/scripts/pipeline.py intent full-auto
```

Then drive the stages. After each stage completes (artifact written, approval marker applied, hooks
update state), read the next pending stage with `pipeline.py next` and run it. The full order is:

```
intake → prd → [GATE 1] → prp → plan → dev → test → [GATE 2] → pr
```

1. **intake** — run `/intake:run`. It dispatches the intake subagent, which harvests the repo +
   context-library and writes `intake.md` with the inferred inputs and an `unknowns` list.
2. **GATE 1 — approve direction.** Before spending tokens on prp/plan/dev, show the human: the PRD's
   problem + hypothesis + metric, and intake's `unknowns`. Ask for one approval (or a correction). This
   is the highest-leverage 30 seconds in the run. `--yolo` skips this gate.
3. **prp → plan → dev → test** — run each via `pipeline.py next`, autonomously. No human contact. Each
   stage carries any `NEEDS REVIEW` markers forward (resolve-mark-proceed); it does not stop to ask.
4. **GATE 2 — approve the PR.** Opening a PR is outward-facing and hard to retract. Show the PR title +
   summary and confirm before `/sse:pr` runs. `--yolo` skips this gate too.
5. **pr** — open the PR; `/sse:pr` auto-arms the merge monitor.

## Autonomy rules

- **Never block on a missing input mid-run.** Inputs come from intake; unknowns are markers, surfaced at
  GATE 1, not interrupts.
- **Gates are the only stops.** Everything between GATE 1 and GATE 2 runs without asking.
- **Adversarial gating stays on.** Each stage's eval is dispatched to a fresh subagent that did not
  author the artifact (see the stage commands). Sensors and evals gate exactly as they do in the
  single-stage flow.

## Flags

- `--local` — stop after test, no PR (skips GATE 2 and the pr stage). Passes through to the SSE half.
- `--yolo` — remove both human gates; fully unattended. Use only for trusted, low-risk flows.
- `--no-monitor` — open the PR but skip the auto merge-watch.

## Resuming

State persists at `.claude/.pipeline-state.json`. If a run is interrupted, `/pipeline:continue` resumes
at the next pending stage. `/pipeline:reset` abandons the run.
