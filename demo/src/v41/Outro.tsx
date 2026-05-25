import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const urlOpacity = interpolate(frame, [30, 54], [0, 1], { extrapolateRight: 'clamp' });
  const tagOpacity = interpolate(frame, [58, 80], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${(1 - titleY) * 30}px)`,
            fontFamily: theme.font.display,
            fontSize: theme.type.h1,
            fontWeight: 800,
            color: theme.color.text,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          ship with <span style={{ color: theme.color.accent }}>specs</span>.
        </div>
        <div
          style={{
            marginTop: 36,
            opacity: urlOpacity,
            fontFamily: theme.font.mono,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            letterSpacing: -0.5,
          }}
        >
          github.com/Pierry/<span style={{ color: theme.color.text }}>harness-kit</span>
        </div>
        <div
          style={{
            marginTop: 40,
            opacity: tagOpacity,
            display: 'inline-flex',
            gap: 14,
            alignItems: 'center',
            padding: '12px 24px',
            borderRadius: 999,
            background: `${theme.color.accent}14`,
            border: `1px solid ${theme.color.accent}`,
            color: theme.color.accent,
            fontFamily: theme.font.mono,
            fontSize: theme.type.label,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.color.accent }} />
          v4.1.0 · MIT
        </div>
      </div>
    </AbsoluteFill>
  );
};
