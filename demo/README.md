# harness-kit demo

85-second Remotion video walking through install → six commands → ship a feature. Each command scene shows the active guide, sensor, eval, and reference loaded by the plugin, with a persistent footer status bar tracking the active skill and next step.

## Scenes

1. **Intro** — title card with tagline
2. **Pipeline** — six stages animated, approval markers light up
3. **Install** — `npm i -g` + `hk install` terminal recording
4. **StatusBarExplain** — what the footer status bar shows: active skill, stage, next command
5. **CommandPRD** — `/product-manager:prd` running: guides + refs loaded, sensors pass, evals score
6. **CommandPRP** — `/product-manager:prp` running
7. **CommandPlan** — `/sse:plan` running
8. **CommandDev** — `/sse:dev` running: edits, commits, convention sensor
9. **CommandTest** — `/sse:test` running: suite + coverage sensor
10. **CommandPR** — `/sse:pr` opening the draft PR
11. **Anatomy** — every stage = guide + ref + sensor + eval
12. **Outro** — links + npm install CTA

## Run

```bash
cd demo
npm install
npm run studio        # interactive preview at http://localhost:3000
npm run render        # MP4 to demo/out/demo.mp4
npm run render:gif    # GIF to demo/out/demo.gif (raw, big)
```

To build the compact README preview (`demo/preview.gif`):

```bash
ffmpeg -y -i out/demo.mp4 \
  -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
  -loop 0 preview.gif
```

## Output formats

- `demo/out/demo.mp4` — full quality, 1920x1080, h264. Gitignored.
- `demo/out/demo.gif` — Remotion-rendered, full resolution. Big. Gitignored.
- `demo/preview.gif` — compressed via ffmpeg for README embed. Committed.

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
