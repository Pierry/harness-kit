# Show HN (ready to fire)

Post at https://news.ycombinator.com/submit

**Timing:** Tuesday to Thursday, morning US Eastern (roughly 10:00-12:00 Brasilia). Be present 4-6 hours to answer comments. HN rewards an author who replies.

**Type:** Show HN. Put the repo URL in the URL field. Paste the text below as the first comment right after submitting.

---

## Title

```
Show HN: Harness-kit, an opinionated Claude Code pipeline from idea to merged PR
```

## URL

```
https://github.com/Pierry/harness-kit
```

## First comment (post immediately after submitting)

I kept hitting the same problem with Claude Code. It writes good code, but every project drifted. Different conventions, different doc formats, no consistent quality gates. Every feature felt like starting over.

Harness-kit is my attempt to fix that with structure instead of prompting harder. It is a set of three orchestrator agents that run one pipeline: PRD, then PRP, then technical plan, then dev, test, and PR. Each stage has an approval gate before the next one starts, so you stay in control and nothing runs away from you.

A few things that make it different from a plain agent wrapper:

- Sensors and evals gate every stage, so a bad PRD does not silently become a bad plan. The sensor is a deterministic structure check; the eval is an LLM judge with a score threshold.
- Token accounting per stage, written to disk, so you can see where the spend actually goes.
- Convention override per repo. Drop a file in .claude/conventions and the project wins over my defaults.
- A designer skill with Material Design 3, dark and light themes, and i18n for new UIs.

The design follows the harness engineering idea from Birgitta Bockeler and Martin Fowler: give the agent feedforward through guides, then feedback through sensors and evals, and keep the human on the loop rather than in it. That framing did more for reliability than any single prompt tweak.

The front door is one command, /golden-path, which runs all six stages. You can also step off and run any stage on its own.

It is early and opinionated. I would genuinely like to hear where the pipeline feels too rigid or where the gates get in your way.

---

## Notes for the comment thread

- If asked "why not just prompt better": a single prompt has no place to check its own work partway through. Gates give it checkpoints that regenerate on failure.
- If asked about cost: point to the per-stage token accounting, and note the context-optimization tools (repomix pack, graphify graph, qmd, rtk) that cut input and output tokens.
- If asked "is this lock-in": no, it is plain markdown, Python, and shell under .claude/, MIT licensed, works in any repo Claude Code touches.
