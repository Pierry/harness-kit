# Pipeline

Shared rules for PRD and PRP generation. Edit retry, approval, publish, token accounting here.

## Stages per artifact

1. Generate artifact using template in skills/{prd|prp}/SKILL.md.
2. Apply sensors listed in skills/{prd|prp}/SKILL.md.
3. Apply evals listed in skills/{prd|prp}/SKILL.md.
4. Append approval marker. Publish hook fires.

## Retry policy

Max attempts: 3 per artifact.

Trigger on:
- any sensor returns non-zero
- eval weighted total below threshold (default 8.0)

Strategy:
1. Read feedback.
2. Regenerate only failed or low-scoring sections.
3. Re-run sensors and eval.

Hard stop after 3 attempts: return blocker, do not proceed.

## Approval marker

PRD:
```
<!-- approved: {YYYY-MM-DD} score={weighted-total} -->
```

PRP:
```
<!-- approved: {YYYY-MM-DD} score={weighted-total} ready-for-handoff: true -->
```

Triggers hooks/post-eval-{prd|prp}.sh.

## Publish

Local: file stays in outputs/{prd|prp}/.

Confluence: fires if JIRA_USERNAME and JIRA_API_TOKEN set. Calls scripts/confluence-publish.py. Missing creds skips silently.

After publish, hook appends:
```
<!-- published: {ISO-timestamp} -->
```

## Token accounting

Each phase brackets measurable token window. Phases:
- prd-generate: from skill invocation to first save in outputs/prd/
- prd-validate: from first save to approval marker (sensors + evals)
- prp-generate: from skill invocation to first save in outputs/prp/
- prp-validate: from first save to approval marker

Markers in outputs/.markers/{feature_id}.{phase}.{start|end}, each `{"timestamp": ISO, "session_id": ""}`. Skill writes .start; hooks write .end.

After eval passes, publish hook runs scripts/token-phase.py for both phases. Script reads Claude transcript JSONL, sums usage tokens (input, output, cache_read, cache_creation) within each window, appends phase entry to outputs/tokens/{feature_id}.json. Markers deleted after consumption.

Post-eval hook also appends inline summary to artifact:
```
<!-- tokens: outputs/tokens/{feature_id}.json in={N} out={N} cache_r={N} -->
```

Future phases (dev, code review, launch) append entries to same outputs/tokens/{feature_id}.json by reusing feature_id slug.

If transcript not readable, script logs warning and exits 0. Token accounting never blocks publish.

## Orchestrator order

1. PRD: stages 1-4.
2. hooks/pre-prp-check.sh validates PRD approved marker.
3. PRP: stages 1-4.
4. Return summary.

## Stop conditions

- 3 failed attempts on same artifact
- missing required input after one clarification
- pre-prp-check.sh denies PRP start
