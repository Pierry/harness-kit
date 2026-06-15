import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Row = {
  stage: string;
  sensors: string[];
  evals: string[];
  preGate: string;
  delay: number;
};

const ROWS: Row[] = [
  {
    stage: 'prd',
    sensors: ['prd-structure', 'prd-acceptance-criteria'],
    evals: ['prd-quality', 'prd-readiness'],
    preGate: ',',
    delay: 28,
  },
  {
    stage: 'prp',
    sensors: ['prp-structure', 'prp-context-quality', 'prp-links', 'link-validator'],
    evals: ['prp-quality', 'prp-context-readiness'],
    preGate: 'approved PRD',
    delay: 50,
  },
  {
    stage: 'plan',
    sensors: ['plan-structure'],
    evals: ['plan-quality'],
    preGate: 'approved PRP',
    delay: 72,
  },
  {
    stage: 'dev',
    sensors: ['code-conventions', 'test-coverage', 'dev-structure'],
    evals: ['dev-quality'],
    preGate: 'approved plan',
    delay: 92,
  },
  {
    stage: 'test',
    sensors: ['test-structure'],
    evals: ['test-quality'],
    preGate: 'dev approved',
    delay: 112,
  },
  {
    stage: 'pr',
    sensors: ['pr-structure'],
    evals: ['pr-quality'],
    preGate: 'test approved',
    delay: 130,
  },
];

export const SensorsEvalsMatrix = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [195, 210], [1, 0], { extrapolateRight: 'clamp' });

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
          gates matrix
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
          Every stage. <span style={{ color: theme.color.accent }}>Every gate.</span>
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
          Sensors are pass/fail. Evals are scored (threshold 8.0). Both must clear.
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          marginLeft: 80,
          marginRight: 80,
          background: theme.color.surface,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.color.borderStrong}`,
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1.4fr 1fr 0.8fr',
            padding: '14px 24px',
            background: theme.color.surfaceElev,
            borderBottom: `1px solid ${theme.color.borderStrong}`,
            fontSize: 16,
            color: theme.color.textFaint,
            fontFamily: theme.font.mono,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <span>stage</span>
          <span style={{ color: '#fbbf24' }}>sensors (deterministic)</span>
          <span style={{ color: '#6ee7b7' }}>evals (≥ 8.0)</span>
          <span>pre-gate</span>
        </div>

        {ROWS.map((r, i) => {
          const op = interpolate(frame, [r.delay, r.delay + 12], [0, 1], { extrapolateRight: 'clamp' });
          const slide = interpolate(frame, [r.delay, r.delay + 12], [16, 0], { extrapolateRight: 'clamp' });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${slide}px)`,
                display: 'grid',
                gridTemplateColumns: '120px 1.4fr 1fr 0.8fr',
                padding: '16px 24px',
                borderBottom: i < ROWS.length - 1 ? `1px solid ${theme.color.border}` : 'none',
                fontFamily: theme.font.mono,
                alignItems: 'center',
                fontSize: 20,
              }}
            >
              <span style={{ color: theme.color.accent, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                {r.stage}
              </span>
              <span style={{ color: theme.color.text, lineHeight: 1.5 }}>
                {r.sensors.map((s, k) => (
                  <span key={k}>
                    {k > 0 && <span style={{ color: theme.color.textFaint }}>{', '}</span>}
                    <span style={{ color: '#fbbf24' }}>{s}</span>
                  </span>
                ))}
              </span>
              <span style={{ color: theme.color.text, lineHeight: 1.5 }}>
                {r.evals.map((e, k) => (
                  <span key={k}>
                    {k > 0 && <span style={{ color: theme.color.textFaint }}>{', '}</span>}
                    <span style={{ color: '#6ee7b7' }}>{e}</span>
                  </span>
                ))}
              </span>
              <span style={{ color: theme.color.textDim }}>{r.preGate}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
