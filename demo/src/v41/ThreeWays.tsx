import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Card = {
  cmd: string;
  title: string;
  steps: string[];
  endsWith: string;
  accent: boolean;
};

const cards: Card[] = [
  {
    cmd: '/sse:run',
    title: 'full pipeline',
    steps: ['plan', 'dev', 'test', 'pr'],
    endsWith: 'opens PR · auto-watches merge',
    accent: false,
  },
  {
    cmd: '/sse:run --local',
    title: 'stop before PR',
    steps: ['plan', 'dev', 'test'],
    endsWith: 'no push · review diff locally',
    accent: false,
  },
  {
    cmd: '/sse:sdd',
    title: 'spec-driven loop',
    steps: ['plan', 'dev ↔ test ↔ eval'],
    endsWith: 'loops until PRP met · cap 3',
    accent: true,
  },
];

export const ThreeWays = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [320, 360], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        opacity: exit,
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          textAlign: 'center',
          marginBottom: 60,
          color: theme.color.textDim,
          fontSize: theme.type.h3,
          fontWeight: 400,
        }}
      >
        three ways to ship.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 36,
          margin: '0 auto',
          maxWidth: 1700,
        }}
      >
        {cards.map((c, i) => {
          const start = 30 + i * 28;
          const opacity = interpolate(frame, [start, start + 24], [0, 1], { extrapolateRight: 'clamp' });
          const y = spring({ frame: frame - start, fps, config: { damping: 18 } });
          return (
            <div
              key={c.cmd}
              style={{
                opacity,
                transform: `translateY(${(1 - y) * 40}px)`,
                background: c.accent ? `${theme.color.accent}10` : theme.color.surface,
                border: `1px solid ${c.accent ? theme.color.accent : theme.color.borderStrong}`,
                borderRadius: theme.radius.lg,
                padding: 36,
                minHeight: 380,
              }}
            >
              <div
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: theme.type.h3,
                  fontWeight: 700,
                  color: c.accent ? theme.color.accent : theme.color.text,
                  letterSpacing: -0.5,
                }}
              >
                {c.cmd}
              </div>
              <div
                style={{
                  marginTop: 12,
                  color: theme.color.textDim,
                  fontSize: theme.type.body,
                  textTransform: 'lowercase',
                  letterSpacing: 0.4,
                }}
              >
                {c.title}
              </div>
              <div
                style={{
                  marginTop: 36,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  fontFamily: theme.font.mono,
                  fontSize: theme.type.code,
                  color: theme.color.text,
                }}
              >
                {c.steps.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ color: theme.color.textFaint, fontSize: theme.type.label }}>{idx + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 36,
                  paddingTop: 24,
                  borderTop: `1px dashed ${theme.color.border}`,
                  color: c.accent ? theme.color.success : theme.color.textDim,
                  fontSize: theme.type.label,
                  fontFamily: theme.font.mono,
                  lineHeight: 1.5,
                }}
              >
                {c.endsWith}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
