import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

const STAGES = [
  { key: 'prd',  label: 'PRD',  sub: 'product brief' },
  { key: 'prp',  label: 'PRP',  sub: 'engineering spec' },
  { key: 'plan', label: 'PLAN', sub: 'technical plan' },
  { key: 'dev',  label: 'DEV',  sub: 'implementation' },
  { key: 'test', label: 'TEST', sub: 'gates pass' },
  { key: 'pr',   label: 'PR',   sub: 'opened draft' },
];

export const Pipeline = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 18 } });

  // Stage reveal pacing
  const stageStart = 24;
  const stageStep = 22;
  const exit = interpolate(frame, [330, 360], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, opacity: exit }}>
      <div
        style={{
          marginLeft: 80,
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 20}px)`,
        }}
      >
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          The pipeline
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
          Six stages, one approval marker each.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginTop: 130,
          marginLeft: 80,
          marginRight: 80,
          justifyContent: 'space-between',
        }}
      >
        {STAGES.map((stage, i) => {
          const start = stageStart + i * stageStep;
          const reveal = spring({ frame: frame - start, fps, config: { damping: 14 } });
          const opacity = interpolate(frame, [start, start + 14], [0, 1], { extrapolateRight: 'clamp' });
          const approveStart = start + 90;
          const approve = interpolate(frame, [approveStart, approveStart + 18], [0, 1], { extrapolateRight: 'clamp' });

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: i === STAGES.length - 1 ? '0 0 auto' : 1 }}>
              <Stage
                label={stage.label}
                sub={stage.sub}
                opacity={opacity}
                reveal={reveal}
                approve={approve}
              />
              {i < STAGES.length - 1 && (
                <Connector
                  opacity={interpolate(frame, [start + 10, start + 26], [0, 1], { extrapolateRight: 'clamp' })}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 110,
          marginLeft: 80,
          fontFamily: theme.font.mono,
          fontSize: theme.type.codeSmall,
          color: theme.color.textDim,
          opacity: interpolate(frame, [200, 230], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <span style={{ color: theme.color.accent }}>$</span> hk status
        <div style={{ marginTop: 16, color: theme.color.text }}>
          installed: <span style={{ color: theme.color.success }}>v3.0.0</span>
        </div>
        <div style={{ color: theme.color.text }}>
          pipeline:&nbsp;&nbsp;<span style={{ color: theme.color.textDim }}>billing-tz-fix · prp approved · plan pending · next /sse:plan</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Stage = ({
  label,
  sub,
  opacity,
  reveal,
  approve,
}: {
  label: string;
  sub: string;
  opacity: number;
  reveal: number;
  approve: number;
}) => {
  const filled = approve > 0.5;
  return (
    <div
      style={{
        opacity,
        transform: `scale(${0.85 + reveal * 0.15}) translateY(${(1 - reveal) * 12}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: '0 0 auto',
      }}
    >
      <div
        style={{
          width: 132,
          height: 132,
          borderRadius: 28,
          background: filled ? `${theme.color.accent}22` : theme.color.surface,
          border: `2px solid ${filled ? theme.color.accent : theme.color.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.font.mono,
          fontWeight: 700,
          fontSize: 28,
          color: filled ? theme.color.accent : theme.color.text,
          letterSpacing: 1,
          transition: 'all 0.2s',
          position: 'relative',
          boxShadow: filled ? `0 0 60px ${theme.color.accent}30` : 'none',
        }}
      >
        {label}
        {filled && (
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              width: 32,
              height: 32,
              borderRadius: 999,
              background: theme.color.success,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: theme.color.bg,
              fontWeight: 900,
              opacity: approve,
            }}
          >
            ✓
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: theme.type.label,
          color: theme.color.textDim,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {sub}
      </div>
    </div>
  );
};

const Connector = ({ opacity }: { opacity: number }) => (
  <div
    style={{
      flex: 1,
      height: 2,
      margin: '0 12px',
      background: `linear-gradient(to right, ${theme.color.borderStrong}, ${theme.color.accent}aa)`,
      opacity,
      marginBottom: 36,
    }}
  />
);
