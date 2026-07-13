# Dev.to / Hashnode teardown (ready to publish)

Publish at https://dev.to/new from your own account. Durable, ranks on Google over time, no timing window.

**Tags:** ai, productivity, softwareengineering, claude
**Canonical:** if you cross-post to Hashnode or your own blog, set the canonical URL to whichever you consider primary so Google does not split credit.

---

## Title

Why I stopped one-shotting features with Claude Code and built a gated pipeline instead

## Body

Claude Code can write a whole feature from a paragraph. That is exactly what got me into trouble.

The code it produced was usually fine on its own. What fell apart was everything around the code. One project used one set of conventions, the next used another. Acceptance criteria lived in my head or nowhere. There was no point in the process where something said "this spec is too thin to build from" before I had already built from it. Every feature felt like starting the whole discipline over from zero.

The reflex is to prompt harder. Longer system prompt, more rules, more examples. I did that for a while and it plateaus, because a single prompt has no place to check its own work partway through.

So I stopped treating it as one big generation and started treating it as a pipeline with gates.

### The shape

A feature moves through six stages: PRD, PRP, plan, dev, test, PR. Two agents own them. A product manager takes the raw problem to an engineering-ready spec. A staff engineer takes that spec to a merged pull request.

The important part is not the stages. It is what sits between them.

Every stage produces a markdown artifact and has to clear two gates before the next stage starts:

- A sensor. A deterministic structure check. Does the PRD actually have a hypothesis, a success metric, named customers. This is a script, not a judgment. It passes or it fails.
- An eval. An LLM judge scores the artifact's quality. Below the threshold, the stage regenerates and tries again, up to three times.

Only after both gates does a human approve and unlock the next stage. A weak PRD gets caught and fixed before it can quietly become a weak plan, and a weak plan before it becomes weak code. The errors that are cheapest to fix at the start are also the ones that compound the most if they slip through, so that is where the gates are strictest.

### Where the idea comes from

This is not something I invented. It is a direct implementation of harness engineering, which Birgitta Bockeler and Martin Fowler wrote up on martinfowler.com. The framing that stuck with me:

- Guides steer the agent before it acts. That is feedforward.
- Sensors give deterministic feedback. Pass or fail, no argument.
- Evals give inferential feedback. A judgment call, scored.
- The human stays on the loop, improving the guides and the gates, instead of in the loop hand-fixing every output.

That last point changed how I work more than any prompt did. When an output is bad, I do not patch the output. I ask which gate should have caught it, and I fix the gate. The fix compounds across every future run instead of dying with one feature.

### The parts that earned their keep

A few pieces I would not give up now:

Per-repo convention overrides. Drop a file under .claude/conventions and it wins over the agent's defaults. I stopped fighting the agent to match a project's style and just wrote the style down once.

Token accounting per stage, written to disk. When cost matters, guessing where the tokens go is a waste. Now I can look.

A designer skill for new UIs, with Material Design 3, dark and light themes, and i18n from the start, so a fresh interface does not come out looking like a default template.

### What I would still change

The gates can feel heavy for a two-line change. A tiny fix does not need a PRD. There is a lighter path for small work, but the ergonomics of choosing it are still rougher than I want.

Onboarding is still too much reading. The demo needs to be the first thing a new user sees, not the third.

### If you want to try it

It is a Claude Code plugin, MIT licensed. One command, /golden-path, runs the whole pipeline from a short brief. You can also step off and run any single stage.

Repo, docs, and a worked example: https://github.com/Pierry/harness-kit

I am most interested in one kind of feedback: where does a gate get in your way rather than help. That is the line I am still trying to find.
