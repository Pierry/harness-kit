---
description: Watch the active PR for merge with backoff polling. Auto-invoked after /sse:pr. Clears pipeline state on merge.
---

Monitor active PR until it merges. Polls with backoff: 3min → 6min → 12min → 24min → 30min cap, escalating after 5 attempts at each rung.

Runs in active session via ScheduleWakeup. Closing session ends monitor.

## Flow

1. **Read state** from `.claude/.pr-monitor-state.json`.
   - Missing → first run. Detect PR from current branch:
     ```
     gh pr view --json number,url,headRefName,state
     ```
     No PR or state already MERGED → exit silently (nothing to watch).
     Otherwise initialize state:
     ```
     .claude/scripts/pr-monitor.py init <number> <url> <branch>
     ```
     Script prints next-delay in seconds.
   - Present → use `state.pr_number`.

2. **Check merge status**:
   ```
   gh pr view <pr_number> --json state -q .state
   ```

3. **If `MERGED`**:
   - Print one line: `PR #<n> merged → <url>. Pipeline state cleared. Start next: /product-manager:run`
   - Clear monitor state: `.claude/scripts/pr-monitor.py clear`
   - Clear pipeline state: `.claude/scripts/pipeline.py clear`
   - **Do not** call ScheduleWakeup. Done.

4. **If `CLOSED` (not merged)**:
   - Print: `PR #<n> closed without merge. Monitor stopped.`
   - Clear monitor state only. Done.

5. **If `OPEN`**:
   - Bump attempt counter, get next interval:
     ```
     .claude/scripts/pr-monitor.py bump
     ```
     Script prints next-delay in seconds (e.g. `180`, `360`, `720`, `1440`, `1800`).
   - Read state with `.claude/scripts/pr-monitor.py read` for `current_interval_min` and `total_attempts` to include in user-facing line.
   - Print one line: `PR #<n> still open (attempt <total>, next check in <m>min).`
   - Schedule next wake:
     - Load `ScheduleWakeup` via ToolSearch: `select:ScheduleWakeup`
     - Call with `delaySeconds=<next>`, `prompt="/sse:pr-monitor"`, `reason="watching PR #<n> for merge, interval <m>min"`.

## First invocation (right after /sse:pr)

No state file yet. Initialize then schedule first wake at 3min (180s). Print:
```
PR monitor armed for #<n>. First check in 3min, escalates to 30min cap.
```
