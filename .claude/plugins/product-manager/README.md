# Product Manager Plugin

Native Claude Code plugin for the product team. Drafts PRDs and PRPs with sensor + eval gates, retry loop, token accounting per phase, and optional Confluence publish via hooks.

## Slash commands

- `/product-manager:prd`: generate a PRD (skills/prd/SKILL.md)
- `/product-manager:prp`: generate a PRP, needs an approved PRD (skills/prp/SKILL.md)
- `/product-manager:run`: full pipeline, PRD then PRP (commands/run.md)

Also invokable as sub-agent via Task tool with `subagent_type: "product-manager"`.

## Tree

```
.claude/plugins/product-manager/
├── .claude-plugin/plugin.json
├── agents/product-manager.md sub-agent
├── commands/run.md orchestrator (calls the two skills)
├── skills/
│ ├── prd/SKILL.md workflow PRD
│ └── prp/SKILL.md workflow PRP
├── hooks/ 5 .sh, registered in .claude/settings.json
├── scripts/ 4 .py, called by hooks
├── guides/
│ ├── pipeline.md retry, approval marker, publish, token accounting
│ ├── product-guidelines.md team product rules
│ ├── prd-guidelines.md PRD-specific rules
│ ├── prp-guidelines.md PRP-specific rules
│ ├── writing-style.md voice, banned words
│ ├── templates/{prd,prp}.md artifact templates
│ └── examples/ reference PRDs and PRPs
├── sensors/ deterministic checks (markdown)
├── evals/ LLM-judge rubrics (markdown)
└── outputs/
 ├── prd/ generated PRDs
 ├── prp/ generated PRPs
 ├── tokens/ per-feature phase tokens JSON
 └── .markers/ phase start/end markers (transient)
```

## Where to edit

| Change | File |
|--------|------|
| Retry count | guides/pipeline.md (Max attempts) |
| Eval threshold | evals/{prd|prp}-quality.md (Threshold) |
| What the skill asks | skills/{prd|prp}/SKILL.md |
| Artifact template | guides/templates/{prd|prp}.md |
| Artifact rules | guides/{prd|prp}-guidelines.md |
| Voice and style | guides/writing-style.md |
| Deterministic checks | sensors/*.md + scripts/sensor-runner.py |
| Rubric dimensions | evals/*.md |
| Publish behavior | guides/pipeline.md + hooks/post-eval-{prd|prp}.sh |
| Confluence target | scripts/confluence-publish.py (parent IDs, space) |
| Token phase logic | scripts/token-phase.py + guides/pipeline.md |

## How it runs

1. User invokes a slash command.
2. Skill writes a `prd-generate.start` marker (timestamp + session_id).
3. Claude reads guides, generates the artifact, saves to outputs/.
4. PostToolUse hook fires sensor-runner.py with real regex. Blocks on failure, returns feedback. On pass, writes `prd-generate.end` and `prd-validate.start` markers.
5. Claude applies eval rubric. Retry up to 3 times if score below threshold (rules in guides/pipeline.md).
6. On pass, Claude appends approval marker. Hook fires: writes `prd-validate.end`, calls token-phase.py for both phases, then confluence-publish.py if creds set.
7. Token data lands in outputs/tokens/{feature_id}.json. Inline summary comment is appended to the artifact.

## Token accounting

Per phase: prd-generate, prd-validate, prp-generate, prp-validate.

Per feature, a single file `outputs/tokens/{feature_id}.json` collects all phase entries, with `totals` aggregated. Future workflows (dev, code review) can append their own phases to the same file by reusing feature_id.

Query examples:

```
# total tokens across all features
jq -s 'map(.totals.input + .totals.output) | add' outputs/tokens/*.json

# tokens for one feature, by phase
jq '.phases[] | {phase, tokens}' outputs/tokens/2026-05-12-billing-tz-fix.json

# features touched by dispatch squad
jq -s '.[] | select(.feature_id | contains("dispatch"))' outputs/tokens/*.json
```

## Engineering handoff

After a PRP is approved, engineering picks it up via the [staff-software-engineer plugin](../staff-software-engineer/README.md). The SSE plugin reads `outputs/prp/{feature_id}.md` and runs plan → dev → test → pr stages, all writing to the same `outputs/tokens/{feature_id}.json` file. Full feature lifecycle in one token log.

## Status bar

The repo's status-line (`.claude/hooks/status-line.sh`) detects PM activity automatically. If any PRD or PRP file under this plugin was modified in the last hour, it switches the status bar to pipeline mode and falls back to the engineering picker otherwise.

The status bar tracks the active feature across both plugins (PM and SSE). Seven stages in order: prd, prp, plan, dev, test, pr. State per stage: pending, drafting, approved.

Examples (PM portion):

```
idle · start /product-manager:run or /sse:run (no active feature)
tz-fix · prd drafting · next /product-manager:prd (PRD in progress)
tz-fix · prd approved · prp pending · next /product-manager:prp (PRD ok, PRP not started)
tz-fix · prd approved · prp drafting · next /product-manager:prp (PRP in progress)
tz-fix · prp approved · plan pending · next /sse:plan (PRP ok, SSE turn)
```

After PRP approval the bar transitions naturally into the SSE stages. State is derived from file presence and the `<!-- approved: -->` marker. No extra config needed.

## Setup

Hooks are registered in `.claude/settings.json` under PreToolUse and PostToolUse.

Confluence publish needs:

```
export JIRA_USERNAME=...
export JIRA_API_TOKEN=...
```

Without them, the hook skips Confluence and keeps the local file.
