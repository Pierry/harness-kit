import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Agent = {
  name: string;
  tag: string;
  blurb: string;
  commands: string[];
  assets: { kind: string; items: string[] }[];
  accent: string;
  delay: number;
};

const AGENTS: Agent[] = [
  {
    name: 'product-manager',
    tag: 'PM orchestrator',
    blurb: 'Turns problem statement into engineering-ready spec.',
    commands: ['/product-manager:prd', '/product-manager:prp', '/product-manager:run'],
    assets: [
      { kind: 'sensors', items: ['prd-structure', 'prd-acceptance-criteria', 'prp-structure', 'prp-context-quality', 'prp-links'] },
      { kind: 'evals', items: ['prd-quality', 'prd-readiness', 'prp-quality', 'prp-context-readiness'] },
      { kind: 'guides', items: ['pipeline', 'prd-guidelines', 'prp-guidelines', 'writing-style', 'templates/'] },
      { kind: 'skills', items: ['prd', 'prp'] },
    ],
    accent: '#a78bfa',
    delay: 28,
  },
  {
    name: 'staff-software-engineer',
    tag: 'SSE orchestrator',
    blurb: 'Turns approved PRP into a merged PR. Picks the right area skill.',
    commands: ['/sse:plan', '/sse:dev', '/sse:test', '/sse:pr', '/sse:run'],
    assets: [
      { kind: 'sensors', items: ['plan-structure', 'code-conventions', 'test-coverage', 'dev-structure', 'test-structure', 'pr-structure'] },
      { kind: 'evals', items: ['plan-quality', 'dev-quality', 'test-quality', 'pr-quality'] },
      { kind: 'guides', items: ['pipeline', 'coding-style', 'commit-style', 'conventions-override'] },
      { kind: 'skills', items: ['backend', 'web', 'mobile', 'devops'] },
    ],
    accent: '#6ee7b7',
    delay: 70,
  },
];

export const Agents = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [165, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, paddingBottom: 140, opacity: exit }}>
      <div
        style={{
          marginLeft: 80,
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 20}px)`,
        }}
      >
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          two agents · one pipeline
        </div>
        <div
          style={{
            fontFamily: theme.font.display,
            fontSize: theme.type.h1,
            fontWeight: 700,
            color: theme.color.text,
            marginTop: 14,
            letterSpacing: -2,
          }}
        >
          Registered in <span style={{ color: theme.color.accent, fontFamily: theme.font.mono }}>AGENTS.md</span>.
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            maxWidth: 1400,
            lineHeight: 1.35,
          }}
        >
          Each agent ships its own sensors, evals, guides, and skills.
        </div>
      </div>

      <div
        style={{
          marginTop: 56,
          marginLeft: 80,
          marginRight: 80,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 30,
        }}
      >
        {AGENTS.map((a, i) => {
          const op = interpolate(frame, [a.delay, a.delay + 18], [0, 1], { extrapolateRight: 'clamp' });
          const reveal = spring({ frame: frame - a.delay, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${(1 - reveal) * 24}px) scale(${0.96 + reveal * 0.04})`,
                background: theme.color.surface,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.color.borderStrong}`,
                borderLeft: `5px solid ${a.accent}`,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: theme.font.mono,
                    fontSize: 16,
                    color: a.accent,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {a.tag}
                </div>
                <div
                  style={{
                    fontFamily: theme.font.mono,
                    fontSize: 36,
                    color: theme.color.text,
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    color: theme.color.textDim,
                    marginTop: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {a.blurb}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {a.commands.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontFamily: theme.font.mono,
                      fontSize: 17,
                      padding: '4px 12px',
                      borderRadius: 999,
                      background: `${a.accent}1a`,
                      color: a.accent,
                      border: `1px solid ${a.accent}40`,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {a.assets.map((asset, j) => (
                  <div key={j} style={{ display: 'flex', gap: 14, fontFamily: theme.font.mono, fontSize: 17 }}>
                    <span style={{ color: theme.color.textFaint, minWidth: 80, letterSpacing: 1, textTransform: 'uppercase', fontSize: 14 }}>
                      {asset.kind}
                    </span>
                    <span style={{ color: theme.color.text, flex: 1 }}>
                      {asset.items.map((it, k) => (
                        <span key={k}>
                          {k > 0 && <span style={{ color: theme.color.textFaint }}>{'  ·  '}</span>}
                          <span>{it}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
