import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const Title = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [28, 52], [0, 1], { extrapolateRight: 'clamp' });
  const subY = spring({ frame: frame - 28, fps, config: { damping: 16 } });
  const chipOpacity = interpolate(frame, [54, 76], [0, 1], { extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(frame, [150, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: exitOpacity,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 1500 }}>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${(1 - titleY) * 50}px)`,
            fontFamily: theme.font.display,
            fontWeight: 800,
            fontSize: theme.type.hero,
            lineHeight: 0.92,
            letterSpacing: -4,
            color: theme.color.text,
          }}
        >
          harness<span style={{ color: theme.color.accent }}>-</span>kit
        </div>
        <div
          style={{
            marginTop: 32,
            opacity: subOpacity,
            transform: `translateY(${(1 - subY) * 30}px)`,
            fontSize: theme.type.h3,
            fontWeight: 400,
            color: theme.color.textDim,
            lineHeight: 1.3,
          }}
        >
          From idea to <span style={{ color: theme.color.text }}>spec-satisfied code</span>.
        </div>
        <div
          style={{
            marginTop: 44,
            opacity: chipOpacity,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 24px',
            borderRadius: 999,
            border: `1px solid ${theme.color.borderStrong}`,
            background: `${theme.color.surface}cc`,
            color: theme.color.textDim,
            fontSize: theme.type.label,
            fontFamily: theme.font.mono,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.color.accent }} />
          v4.1.0 · SDD loop · context tools
        </div>
      </div>
    </AbsoluteFill>
  );
};
