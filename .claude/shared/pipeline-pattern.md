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

Deterministic, structural, run via the committed runner
(`.claude/runtime/scripts/{agent}/run-sensors.sh`). Never improvise inline grep/for loops. Sensors stay
scripts: a structural rule does not need a model. Unchanged from v4.

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
