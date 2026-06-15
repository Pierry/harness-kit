# Pipeline

Shared rules for design and review. Edit retry, approval, gates here.

## Stages per artifact

1. Generate artifact using template in skills/{design|review}/SKILL.md.
2. Apply sensors listed in the skill (self-applied markdown rules; hard gate).
3. Apply evals listed in the skill (LLM-judge; quality gate).
4. Append approval marker.

## Retry policy

Max attempts: 3 per artifact.

Trigger on:
- any sensor fails (missing section, missing number, no mermaid, forbidden token)
- eval weighted total below threshold (default 8.0)

Strategy:
1. Read feedback.
2. Regenerate only failed or low-scoring sections.
3. Re-run sensors and eval.

Hard stop after 3 attempts: return blocker, do not proceed.

## Approval marker

Design:
```
<!-- approved: {YYYY-MM-DD} score={weighted-total} -->
```

Review:
```
<!-- approved: {YYYY-MM-DD} score={weighted-total} verdict={ship|revise|block} -->
```

## Output paths

- Design: `.claude/runtime/outputs/architect/design/{feature_id}.md`
- Review: `.claude/runtime/outputs/architect/review/{feature_id}.md`

`feature_id = {YYYY-MM-DD}-{slug}`. Create dirs on demand.

## Orchestrator order (/system-design:run)

1. Design: stages 1-4. Approval marker.
2. Review: feed the approved design to the review skill. Stages 1-4.
3. Return combined summary.

Review can run standalone against any design path (own or external).

## Stop conditions

- 3 failed attempts on same artifact
- missing required input after one clarification
- review verdict = block: surface blockers, do not mark design ready
