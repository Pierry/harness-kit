import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { SectionLabel } from './SectionLabel';

// 07 · grounded on. This is not invented method: harness-kit implements
// harness engineering (Böckeler, martinfowler.com), and the system-architect
// reasons from the established engineering canon. Mirrors the README
// "Foundations" section and the usage-guide site.

const canon = [
  'Kleppmann · DDIA',
  'Ousterhout · PoSD',
  'Nygard · Release It',
  'Jeff Dean',
  'Vogels',
  'Helland',
];

export const BasedOn = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [170, 200], [1, 0], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame: frame - 18, fps, config: { damping: 16 } });
  const lineOpacity = interpolate(frame, [44, 66], [0, 1], { extrapolateRight: 'clamp' });
  const attrOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' });
  const canonOpacity = interpolate(frame, [86, 108], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, justifyContent: 'center', alignItems: 'center', opacity: enter * exit }}>
      <div style={{ marginBottom: 30 }}>
        <SectionLabel n="07" label="grounded on" />
      </div>

      <div style={{ textAlign: 'center', maxWidth: 1500 }}>
        <div
          style={{
            transform: `translateY(${(1 - titleY) * 28}px)`,
            fontFamily: theme.font.display,
            fontSize: theme.type.h1,
            color: theme.color.text,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          Harness <span style={{ color: theme.color.accent }}>engineering</span>.
        </div>

        <div
          style={{
            marginTop: 30,
            opacity: lineOpacity,
            fontFamily: theme.font.mono,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            fontWeight: 400,
            lineHeight: 1.4,
          }}
        >
          guides steer<Sep /> sensors gate<Sep /> evals score<Sep />
          <span style={{ color: theme.color.text }}>humans on the loop</span>
        </div>

        <div
          style={{
            marginTop: 28,
            opacity: attrOpacity,
            color: theme.color.textFaint,
            fontSize: theme.type.label,
            fontFamily: theme.font.mono,
          }}
        >
          Birgitta Böckeler · martinfowler.com
        </div>

        {/* the engineering canon behind system-architect */}
        <div
          style={{
            marginTop: 48,
            opacity: canonOpacity,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          {canon.map((c, i) => {
            const st = 90 + i * 8;
            const op = interpolate(frame, [st, st + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <span
                key={c}
                style={{
                  opacity: op,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: `1px solid ${theme.color.border}`,
                  background: theme.color.surface,
                  fontFamily: theme.font.mono,
                  fontSize: theme.type.label,
                  color: theme.color.textDim,
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Sep = () => <span style={{ color: theme.color.textFaint, margin: '0 14px' }}>·</span>;
