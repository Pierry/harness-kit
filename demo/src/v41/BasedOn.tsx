import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';

export const BasedOn = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [120, 150], [1, 0], { extrapolateRight: 'clamp' });
  const lineOpacity = interpolate(frame, [40, 64], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: opacity * exit,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 1400 }}>
        <div
          style={{
            color: theme.color.textFaint,
            fontSize: theme.type.label,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          based on
        </div>
        <div
          style={{
            fontSize: theme.type.h2,
            color: theme.color.text,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          Claude Code <span style={{ color: theme.color.accent, fontFamily: theme.font.mono }}>/goal</span> pattern
        </div>
        <div
          style={{
            marginTop: 32,
            opacity: lineOpacity,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            fontWeight: 400,
            lineHeight: 1.4,
            maxWidth: 1200,
            margin: '32px auto 0',
          }}
        >
          separate <span style={{ color: theme.color.text }}>the agent that works</span> from{' '}
          <span style={{ color: theme.color.text }}>the one that decides it&apos;s done</span>.
        </div>
        <div
          style={{
            marginTop: 28,
            color: theme.color.textFaint,
            fontSize: theme.type.label,
            fontFamily: theme.font.mono,
          }}
        >
          Anthropic · Code with Claude · May 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
