---
description: Pick the eval judge. local = fresh Claude evaluator (default). jev = Jev by TypeSafe AI, needs API key.
argument-hint: "[jev|local]"
---

Set eval judge. State in `.claude/hk-config.json`, read by `.claude/scripts/jev-judge.py`.

## No arg

Run `python3 .claude/scripts/hk-config.py get eval`, show line. Ask which judge: `local` or `jev`. Continue below.

## `local`

`python3 .claude/scripts/hk-config.py eval local`. Done. Evals dispatch Claude evaluator, as default.

## `jev`

1. `python3 .claude/scripts/hk-config.py get eval`. If `key=set` already, run `python3 .claude/scripts/hk-config.py eval jev --key-env {key_env}` and stop.
2. Else ask user (AskUserQuestion), two options:
   - **Already in env var**: ask var name (default `TYPESAFE_API_KEY`). Run `python3 .claude/scripts/hk-config.py eval jev --key-env {NAME}`.
   - **Paste key**: warn first, key pasted in chat lands in session transcript. Safer path: user runs it themselves with `!` so stdin never echoes back:
     `! printf '%s' 'tsk_...' | python3 .claude/scripts/hk-config.py eval jev --key -`
     If user pastes key in chat anyway, pipe it the same way. Never echo key back, never write it anywhere except via script.
3. Exit 4 = key still missing. Relay stderr line verbatim. Judge stays `jev` but evals fall back to Claude until key present.
4. Key source: https://console.typesafe.ai/keys. Paid API (input tokens only, ~$0.042/Mtok). Local only, never CI.
5. Tell user restart Claude Code if key was just stored, so `env` block from `settings.local.json` loads.

## What changes

Weighted-rubric evals (`### Name (weight N%)`) scored by Jev: each `- check:` one yes/no question, `- absent:` regex in code, one call per artifact. Failed checks become retry feedback. Jev unsure on checks that decide pass/fail → escalates to Claude evaluator. `spec-satisfied` + readiness gates stay Claude. Any Jev failure (no key, artifact over 32k tokens, API error) → exit 3 → Claude evaluator. Runs logged to `.claude/runtime/outputs/evals/jev-judge.jsonl`. Full flow: `.claude/shared/pipeline-pattern.md` section 4.
