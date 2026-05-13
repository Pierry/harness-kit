# harness-kit demo

60-second Remotion video showing install → run → ship a feature.

## Scenes

1. **Intro** — title card with tagline
2. **Pipeline** — six stages animated, status-bar example
3. **Install** — `npm i -g` + `hk install` terminal recording
4. **Session** — `/product-manager:run` → `/sse:run` end-to-end
5. **Outro** — links + npm install CTA

## Run

```bash
cd demo
npm install
npm run studio        # interactive preview at http://localhost:3000
npm run render        # MP4 to demo/out/demo.mp4
npm run render:gif    # GIF to demo/out/demo.gif (embed in README)
```

## Output formats

- `demo/out/demo.mp4` — full quality, 1920x1080, h264. Gitignored.
- `demo/out/demo.gif` — smaller, README-friendly. Committed.

## Structure

```
demo/
├── src/
│   ├── index.ts          # registerRoot entry
│   ├── Root.tsx          # composition registry
│   ├── Video.tsx         # scene sequencer
│   ├── theme.ts          # color/type tokens
│   ├── components/
│   │   ├── Terminal.tsx
│   │   └── TypingText.tsx
│   └── scenes/
│       ├── Intro.tsx
│       ├── Pipeline.tsx
│       ├── Install.tsx
│       ├── Session.tsx
│       └── Outro.tsx
└── remotion.config.ts
```
