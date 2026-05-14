# Eval: PRP Context Readiness

Type: composite (executor simulation plus sensor pass-through)
Mode: handoff gate

Pass criteria:
- all structural sensors passed
- shippable in {yes, partial}
- blocking_questions count <= 2
- one_shot_likelihood >= 0.7

Run last, after prp-quality passes.

## Phase 1: structural

Pass-through. Required green:
- sensors/prp-structure.md
- sensors/prp-context-quality.md
- sensors/prp-links.md

If any fail, abort and return sensor feedback.

## Phase 2: executor simulation

You are coding agent that has never seen this codebase. Handed only this PRP. Cannot ask PM follow-ups. Read end-to-end and answer:

1. Could you ship with only what is in PRP plus linked files? (yes / partial / no)
2. List every place you would need to stop and ask a human.
3. List every claim looking plausible but you cannot verify from PRP alone.
4. Rate one-shot-success likelihood from 0 to 1.

## Output format

```json
{
  "shippable": "yes | partial | no",
  "blocking_questions": ["question"],
  "unverifiable_claims": ["claim"],
  "one_shot_likelihood": 0.0
}
```

## Phase 3: PM signoff (manual)

PM confirms or requests another iteration.

## On failure

Phase 1 fails: re-run failing sensor, regenerate failed sections.
Phase 2 fails criteria: regenerate weakest section based on blocking_questions.
Phase 3 rejects: collect PM feedback, retry loop.
