import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: 'clamp' });
  const subY = spring({ frame: frame - 22, fps, config: { damping: 16 } });
  const chipOpacity = interpolate(frame, [40, 58], [0, 1], { extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(frame, [125, 145], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        opacity: exitOpacity,
      }}
    >
      <div style={{ marginLeft: 80, maxWidth: 1500 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 20px',
            borderRadius: 999,
            border: `1px solid ${theme.color.borderStrong}`,
            background: `${theme.color.surface}cc`,
            color: theme.color.textDim,
            fontSize: theme.type.label,
            opacity: chipOpacity,
            marginBottom: 36,
            transform: `translateY(${(1 - titleY) * 12}px)`,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.color.accent }} />
          claude code · AGENTS.md harness · v4.0.0
        </div>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${(1 - titleY) * 60}px)`,
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
            marginTop: 28,
            opacity: subOpacity,
            transform: `translateY(${(1 - subY) * 30}px)`,
            fontSize: theme.type.h3,
            fontWeight: 400,
            color: theme.color.textDim,
            maxWidth: 1100,
            lineHeight: 1.3,
          }}
        >
          From idea to merged PR. One pipeline. <span style={{ color: theme.color.text }}>Six stages.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
