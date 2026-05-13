# Pipeline

Shared rules for PRD and PRP generation. Edit retry, approval, publish, and token accounting here.

## Stages per artifact

1. Generate the artifact using the template in skills/{prd|prp}/SKILL.md.
2. Apply sensors listed in skills/{prd|prp}/SKILL.md.
3. Apply evals listed in skills/{prd|prp}/SKILL.md.
4. Append the approval marker. Publish hook fires.

## Retry policy

Max attempts: 3 per artifact.

Trigger on:
- any sensor returns non-zero
- eval weighted total below threshold (default 8.0)

Strategy:
1. Read the feedback.
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

Confluence: fires if JIRA_USERNAME and JIRA_API_TOKEN are set. Calls scripts/confluence-publish.py. Missing creds skips silently.

After publish, hook appends:
```
<!-- published: {ISO-timestamp} -->
```

## Token accounting

Each phase brackets a measurable token window. Phases for this plugin:
- prd-generate: from skill invocation to first save in outputs/prd/
- prd-validate: from first save to approval marker (covers sensors and evals)
- prp-generate: from skill invocation to first save in outputs/prp/
- prp-validate: from first save to approval marker

Markers live in outputs/.markers/{feature_id}.{phase}.{start|end}, each with `{"timestamp": ISO, "session_id": ""}`. Skill writes the .start marker; hooks write the .end markers.

After each artifact's eval passes, the publish hook runs scripts/token-phase.py for both of its phases. The script reads the Claude transcript JSONL, sums usage tokens (input, output, cache_read, cache_creation) within each window, and appends a phase entry to outputs/tokens/{feature_id}.json. Markers are deleted after consumption.

The post-eval hook also appends an inline summary comment to the artifact:
```
<!-- tokens: outputs/tokens/{feature_id}.json in={N} out={N} cache_r={N} -->
```

Future phases (dev, code review, launch) append new entries to the same outputs/tokens/{feature_id}.json by reusing the feature_id slug.

If the transcript is not readable, the script logs a warning and exits 0. Token accounting never blocks publish.

## Orchestrator order

1. PRD: stages 1-4.
2. hooks/pre-prp-check.sh validates the PRD approved marker.
3. PRP: stages 1-4.
4. Return summary.

## Stop conditions

- 3 failed attempts on the same artifact
- missing required input after one clarification
- pre-prp-check.sh denies PRP start
