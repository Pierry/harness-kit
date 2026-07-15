# Pipeline Pattern (v5)

The single shape every stage follows. PM, SSE, and system-architect stages all obey this. When a stage
command says "follow the pipeline pattern," it means this file. Full theory:
[Autonomy](https://github.com/Pierry/harness-kit/wiki/Autonomy) and
[Orchestration and Subagents](https://github.com/Pierry/harness-kit/wiki/Orchestration-and-Subagents).

Three concerns stay separated: the **orchestrator** coordinates (state, markers, gates) and never
authors; **author** work produces one artifact; **verification** grades it from a fresh context.

## 1. Inputs: resolve-mark-proceed

A stage never stops to ask the human for an input that context can yield. For every input it needs:

1. **Resolve** it from, in order: the upstream artifact (intake, PRD, PRP, plan), the intake artifact's
   frontmatter (`squad`, `repos`, `customers`, `metric`), `context-library/` (including
   `context-library/repos.md` for repo paths), and the target repo itself (README, code, git history,
   `gh` PRs/issues).
2. **Mark** what genuinely cannot be resolved from any of the above with
   `NOT FOUND - NEEDS REVIEW: {detail}`, inline in the artifact. Do not invent a value.
3. **Proceed.** Never block mid-run. The evals tolerate a bounded number of markers
   (`prp-context-quality` blocks only above five). Unknowns surface at a gate, not as an interrupt.

Do **not** call `AskUserQuestion` for a resolvable input. The only permitted stops:

- **A hard prerequisite is missing** — the upstream artifact does not exist (no approved PRD to build a
  PRP on, no plan to dev from). Abort with the exact next command to run (`run /intake:run first`,
  `run /product-manager:prd first`). This is a dependency error, not an input question.
- **The orchestrator's human gates** — see §5. Only the orchestrator (`/pipeline:run`) stops there, and
  `--yolo` removes even those.

If an input was formerly asked for, harvest it instead: intake exists precisely so the human is not
asked. When in doubt, mark and proceed.

## 2. Author

The stage command authors its artifact, run by its orchestrator agent (each agent is itself
Task-invokable for context isolation). When a step requires heavy exploration that would pollute the
context of later stages — mapping a large repo, reading dozens of files — delegate it to a **read-only
subagent** and consume only its distilled return. `intake` is the canonical example; `prp`'s repo
mapping is another candidate.

## 3. Sensors

Run via the committed runner (`.claude/runtime/scripts/{agent}/run-sensors.sh`). Never improvise
inline grep/for loops. A structural rule does not need a model.

Every sensor declares how it is enforced, per Böckeler's
[taxonomy](https://martinfowler.com/articles/harness-engineering.html):

- **`Execution: computational`** — the runner enforces it. Deterministic, cheap, runs on every change.
  A computational sensor that wires up no check the runner understands exits 2 (spec error). It is not
  a pass: it is a broken sensor.
- **`Execution: inferential`** — needs judgment, so a model or a human applies it. The runner refuses
  it (exit 3) and every caller records `inferential`, never `pass`.

That split is load-bearing. Three sensors once declared `deterministic / hard gate` while expressing
their checks as prose the runner had no handler for; it returned 0 and the quality log recorded them
as `passed` on every run, against a check that never happened. If you are the sensor, say so and say
what you found. A claimed pass that nothing verified is worse than a missing sensor: it is the
"illusion of quality" Böckeler names in
[Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html).

Check your work with `python3 .claude/scripts/check-sensors.py`, which prints the enforcement ledger.

## 4. Eval: adversarial

The evaluator is never the author. Dispatch a **fresh evaluator** via the Task tool
(`subagent_type: general-purpose`) that did not write this artifact. Hand it only:

- the artifact path, and
- the rubric paths (the stage's `evals/*.md`).

Instruct it to score against the rubrics and return the weighted total plus the specific low-scoring
dimensions. A fresh context with no stake in the text is what makes the score honest; the author
grading its own work inflates it. Below threshold (8.0) retries per
`guides/pipeline.md`, regenerating only the flagged dimensions (cap 3 attempts).

For the highest-stakes gates, use a **panel**: three evaluators with distinct lenses run in parallel and
a majority decides.

**Verify the arithmetic, do not trust it.** Pipe the judge's JSON through the score verifier. It reads
the weights out of the rubric, recomputes the total from the dimension scores, and rejects a judge
that scored a dimension the rubric does not weight, skipped one it does, or wrote a total its own
scores do not support:

```
.claude/scripts/eval-score.py --rubric {evals/x-quality.md} --scores judge.json
```

Exit 0 prints the number the approval marker should carry. Exit 1 is below threshold (retry). Exit 2
means the judge's output is malformed and the score is meaningless, so do not approve on it.

**What this does not fix.** The dimension scores are still unvalidated against human labels, and the
threshold of 8.0 is a convention, not a calibrated boundary. Two known biases apply and neither is
mitigated here: LLM judges inflate scores for output from their own family
([Panickssery et al.](https://arxiv.org/abs/2410.21819)), and uncalibrated 1-10 scales get interpreted
differently by every grader ([Husain](https://hamel.dev/blog/posts/llm-judge/), who recommends binary
judgments plus measured agreement with human labels). Treat the score as a rough signal that catches
weak artifacts, not as a measurement. Read the feedback, not just the number.

## 5. Marker, gates, return

- On pass, append the approval marker (`<!-- approved: {date} score={n} -->`; PRP also
  `ready-for-handoff: true`). The marker is the gate the next stage checks.
- **Human gates belong to the orchestrator only.** `/pipeline:run` stops at two: approve direction
  after the PRD, approve the PR before it opens. Individual stages never add their own human gates.
- Return in the stage's documented shape, naming the actual sensors, evals, and guides that ran.

## Checklist for a stage that follows the pattern

- [ ] No `AskUserQuestion` for a resolvable input — resolve from context, mark the rest, proceed
- [ ] Reads the upstream artifact(s) + intake frontmatter for its inputs
- [ ] Sensors via the committed runner (deterministic, no inline loops)
- [ ] Eval dispatched to a fresh `general-purpose` subagent, not self-graded
- [ ] Approval marker on pass; no stage-level human gate
