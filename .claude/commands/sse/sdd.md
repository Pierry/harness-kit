---
description: Spec-driven dev loop. Plan once, then dev↔test↔eval loop until PRP spec satisfied. Local only, no PR.
---

Run spec-driven dev loop. Follow .claude/agents/staff-software-engineer/guides/sdd-loop.md.

## Inputs

- Optional arg: path to source PRP. Default = latest approved PRP in `.claude/runtime/outputs/pm/prp/`.
- None found → abort. Tell user to run `/product-manager:prp` first.

feature_id = basename of PRP file (no .md).

## Pre-flight (hard gate)

Run sensor `.claude/agents/staff-software-engineer/sensors/prp-has-acceptance-criteria.md` on source PRP. Fail → block, return blocker. Do not proceed.

Print header card. Format: `.claude/scripts/stage-card.md`.

```
━━━ /sse:sdd · {feature_id} ━━━
**guides:**  sdd-loop.md, pipeline.md
**refs:**    prp/{feature_id}.md
**sensors:** prp-has-acceptance-criteria
**eval:**    spec-satisfied (supervisor, per iter)
**next:**    /sse:pr (after PASS, manual trigger)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Steps

1. **Plan once.** Invoke `/sse:plan`. Wait approved marker. Hard stop if plan fails.

2. **Goal loop. Cap = 3 iters.**

   For iter in 1..3:

   a. Write marker `.claude/runtime/outputs/sse/.markers/{feature_id}.sdd-iter{N}-dev.start`.
   b. Invoke `/sse:dev`. If iter > 1, pass `--focus="{next_iter_focus from prior eval}"`.
   c. Invoke `/sse:test`. Capture report path.
   d. Run supervisor eval `.claude/agents/staff-software-engineer/evals/spec-satisfied.md`. **Use fresh session** (Task tool with subagent_type=general-purpose, prompt includes PRP path + dev summary path + test report path + `git diff main...HEAD`). Worker context must not leak.
   e. Parse eval JSON output. Verdict PASS → break. FAIL → record `next_iter_focus`, continue.

3. **Write transcript** `.claude/runtime/outputs/sse/sdd/{feature_id}.md`. Format per `guides/sdd-loop.md` § Output artifact.

4. **PASS path:** append approval marker:
   ```
   <!-- approved: {YYYY-MM-DD} verdict=PASS iters={N} -->
   ```

5. **FAIL path (cap hit):** append:
   ```
   <!-- blocked: {YYYY-MM-DD} verdict=FAIL iters=3 -->
   ```
   Return blocker listing NOT_MET criteria + UNCLEAR items.

## Reply format

PASS:
```
SDD loop PASS. {N} iter(s).
  feature:    {feature_id}
  branch:     {branch}
  commits:    {M} ({short-sha}, ...)
  criteria:   {met}/{total} MET
  gates:      {green}/{total} GREEN
  manual:     {N} pending (user verify)
  transcript: .claude/runtime/outputs/sse/sdd/{feature_id}.md
  next:       review diff, run /sse:pr when ready
```

FAIL (cap hit):
```
SDD loop FAIL. cap hit at 3 iters.
  feature:    {feature_id}
  branch:     {branch}
  blockers:
    - criterion: "{text}" status: NOT_MET reason: {evidence}
    - gate: "{cmd}" status: RED exit: {N}
  transcript: .claude/runtime/outputs/sse/sdd/{feature_id}.md
  next:       address blockers, re-run /sse:sdd
```

## Context tiers

Before iter 1, check for cached context per `.claude/shared/context-strategy.md`:
- repomix pack at `.claude/runtime/cache/repomix/{feature_id}.xml` → supervisor eval reads it for richer judgment
- graphify graph at `.claude/runtime/cache/graphify/{slug}/graphify-out/graph.json` → supervisor eval queries for "does diff break callers"

Neither present + repo big → suggest user run `/context:pack {feature_id} --include "{paths from PRP}"` once before continuing. Don't auto-build (manual cmds only, per harness pattern).

## Rules

- **No PR.** This command never opens PR. User decides via `/sse:pr`.
- **No push.** Commits stay local on dev branch.
- **Fresh evaluator session.** Worker self-eval defeats supervisor pattern.
- **3 iter cap.** Do not exceed. Cap hit = real signal of spec/code mismatch.
- **Print iter banner** between iters: `━━━ SDD iter {N}/3 ━━━` so user can follow loop.
