import { useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';

export const SectionLabel = ({ n, label }: { n: string; label: string }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        opacity,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 22px',
        borderRadius: 999,
        border: `1px solid ${theme.color.borderStrong}`,
        background: `${theme.color.surface}cc`,
        fontFamily: theme.font.mono,
        fontSize: theme.type.label,
        letterSpacing: 1,
      }}
    >
      <span style={{ color: theme.color.accent, fontWeight: 700 }}>{n}</span>
      <span style={{ width: 1, height: 16, background: theme.color.border }} />
      <span style={{ color: theme.color.textDim, textTransform: 'lowercase' }}>{label}</span>
    </div>
  );
};
