import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { SectionLabel } from './SectionLabel';

export const Title = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.7 } });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [40, 64], [0, 1], { extrapolateRight: 'clamp' });
  const subY = spring({ frame: frame - 40, fps, config: { damping: 16 } });
  const exitOpacity = interpolate(frame, [180, 210], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: exitOpacity,
      }}
    >
      <SectionLabel n="01" label="what it is" />
      <div style={{ textAlign: 'center', maxWidth: 1500, marginTop: 30 }}>
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
            marginTop: 36,
            opacity: subOpacity,
            transform: `translateY(${(1 - subY) * 30}px)`,
            fontSize: theme.type.h3,
            fontWeight: 400,
            color: theme.color.textDim,
            lineHeight: 1.35,
          }}
        >
          Three Claude Code agents.{' '}
          <span style={{ color: theme.color.text }}>From idea to merged PR, one gated pipeline.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
