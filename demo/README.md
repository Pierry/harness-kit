# harness-kit demo

~110-second Remotion video walking through install → six commands → ship + auto-watch PR until merged. Each command scene shows the active guide, sensor, eval, and reference loaded by the plugin, with a persistent footer status bar tracking the active skill and next step.

## Scenes

1. **Intro**: title card with tagline
2. **Pipeline**: six stages animated, approval markers light up
3. **Install**: `npm i -g` + `hk install` terminal recording
4. **StatusBarExplain**: what the footer status bar shows: active skill, stage, next command
5. **DynamicStatusBar**: status bar shape + state mutating live as commands run
6. **CommandPRD**: `/product-manager:prd` running: guides + refs loaded, sensors pass, evals score
7. **CommandPRP**: `/product-manager:prp` running
8. **CommandPlan**: `/sse:plan` running
9. **CommandDev**: `/sse:dev` running: edits, commits, `code-conventions` + `dev-structure` sensors, `dev-quality` eval
10. **CommandTest**: `/sse:test` running: suite + `test-coverage` + `test-structure` sensors, `test-quality` eval
11. **CommandPR**: `/sse:pr` opens draft PR, `pr-structure` + `pr-quality` gates, then **pr-monitor armed** (auto-watch with 3→6→12→24→30min backoff until merged)
12. **Summary**: final tally: every sensor, eval, guide, token spend per phase, named
13. **Resume**: `/pipeline:continue` picks up at next pending stage
14. **Anatomy**: every stage = guide + ref + sensor + eval
15. **Outro**: links + npm install CTA

## Run

```bash
cd demo
npm install
npm run studio        # interactive preview at http://localhost:3000
npm run render        # MP4 to demo/out/demo.mp4
npm run render:gif    # GIF to demo/out/demo.gif (raw, big)
```

To build the compact README preview (`demo/preview.gif`): rendered from the **DemoV41** composition (`src/VideoV41.tsx`), a ~90s end-to-end walkthrough: **01 what it is** (three Claude Code agents, idea to merged PR, one gated pipeline) → **02 how to install** (marketplace add + plugin install + `/harness-kit:install`, with a streamed timeline of what the installer lays down: agents · sensors · guides · evals · commands · hooks · AGENTS.md) → **03 the agents** (`claude agents` + `@agent` mentions: product-manager · staff-software-engineer · system-architect) → **04 the golden path** (`/golden-path`: idea → merged PR through six gated stages, prd·prp via `/product-manager:run` then plan·dev·test·pr via `/sse:run`) → **05 how it's gated** (one stage as a self-correcting loop: generate → sensor → eval → human approves → next, with fail/retry loop-backs) → **06 how to use** (write the idea brief on the [Pages site](https://pierry.github.io/harness-kit/brief/), copy it, paste `/golden-path` into Claude Code, watch the six stages run to a merged PR) → **07 grounded on** (harness engineering, Böckeler/martinfowler.com, plus the system-design canon) → outro. Type: Bricolage Grotesque · Hanken Grotesk · JetBrains Mono:

```bash
npm run render:v41        # MP4 to demo/out/demo-v41.mp4 (README preview source)
ffmpeg -y -i out/demo-v41.mp4 \
  -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 preview.gif
```

## Output formats

- `demo/out/demo.mp4`, full quality, 1920x1080, h264. Gitignored.
- `demo/out/demo.gif`, Remotion-rendered, full resolution. Big. Gitignored.
- `demo/preview.gif`, compressed via ffmpeg for README embed. Committed.

## Structure

```
demo/
├── src/
│   ├── index.ts          # registerRoot entry
│   ├── Root.tsx          # composition registry
│   ├── Video.tsx         # scene sequencer + persistent footer status bar
│   ├── theme.ts          # color/type tokens
│   ├── components/
│   │   ├── Terminal.tsx
│   │   ├── TypingText.tsx
│   │   └── CommandScene.tsx     # shared terminal + artifacts panel layout
│   └── scenes/
│       ├── Intro.tsx
│       ├── Pipeline.tsx
│       ├── Install.tsx
│       ├── StatusBarExplain.tsx
│       ├── CommandPRD.tsx
│       ├── CommandPRP.tsx
│       ├── CommandPlan.tsx
│       ├── CommandDev.tsx
│       ├── CommandTest.tsx
│       ├── CommandPR.tsx
│       ├── Anatomy.tsx
│       └── Outro.tsx
└── remotion.config.ts
```
