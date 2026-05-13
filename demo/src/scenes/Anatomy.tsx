import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Card = {
  kind: string;
  color: string;
  what: string;
  example: string;
  delay: number;
};

const CARDS: Card[] = [
  {
    kind: 'GUIDE',
    color: '#a78bfa',
    what: 'how to write it',
    example: 'prd-guidelines.md  ·  coding-style.md',
    delay: 30,
  },
  {
    kind: 'REF',
    color: '#60a5fa',
    what: 'context to pull in',
    example: 'business-info.md  ·  squads/billing/',
    delay: 55,
  },
  {
    kind: 'SENSOR',
    color: '#fbbf24',
    what: 'must-pass structure check',
    example: 'prd-structure  ·  code-conventions',
    delay: 80,
  },
  {
    kind: 'EVAL',
    color: '#6ee7b7',
    what: 'scored quality rubric',
    example: 'prd-quality  ·  plan-quality',
    delay: 105,
  },
];

export const Anatomy = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [210, 240], [1, 0], { extrapolateRight: 'clamp' });

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
          anatomy of every stage
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
          Same four ingredients. <span style={{ color: theme.color.accent }}>Every time.</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 60,
          marginLeft: 80,
          marginRight: 80,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 26,
        }}
      >
        {CARDS.map((c, i) => {
          const op = interpolate(frame, [c.delay, c.delay + 18], [0, 1], { extrapolateRight: 'clamp' });
          const reveal = spring({ frame: frame - c.delay, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${(1 - reveal) * 24}px) scale(${0.96 + reveal * 0.04})`,
                background: theme.color.surface,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.color.borderStrong}`,
                borderLeft: `5px solid ${c.color}`,
                padding: 36,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: theme.font.mono,
                    fontWeight: 700,
                    fontSize: 22,
                    color: c.color,
                    letterSpacing: 3,
                  }}
                >
                  {c.kind}
                </div>
                <div
                  style={{
                    fontFamily: theme.font.display,
                    fontSize: 40,
                    color: theme.color.text,
                    marginTop: 12,
                    letterSpacing: -0.5,
                  }}
                >
                  {c.what}
                </div>
              </div>
              <div
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: 20,
                  color: theme.color.textDim,
                  marginTop: 20,
                }}
              >
                {c.example}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
