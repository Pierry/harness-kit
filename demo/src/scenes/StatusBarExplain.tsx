import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const StatusBarExplain = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const arrowOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [160, 180], [1, 0], { extrapolateRight: 'clamp' });

  const callouts = [
    { from: 50, text: 'which skill is running right now',    top: 380 },
    { from: 75, text: 'which pipeline stage it belongs to',  top: 440 },
    { from: 100, text: 'the exact slash command to run next', top: 500 },
  ];

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
          status bar
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
          Always shows <span style={{ color: theme.color.accent }}>where you are.</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            maxWidth: 1300,
            lineHeight: 1.35,
          }}
        >
          One footer bar follows the active feature through all six stages.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 200,
          right: 200,
          top: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          opacity: arrowOpacity,
        }}
      >
        {callouts.map((c, i) => {
          const op = interpolate(frame, [c.from, c.from + 16], [0, 1], { extrapolateRight: 'clamp' });
          const slide = interpolate(frame, [c.from, c.from + 16], [-20, 0], { extrapolateRight: 'clamp' });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${slide}px)`,
                fontSize: 26,
                color: theme.color.textDim,
                fontFamily: theme.font.mono,
              }}
            >
              <span style={{ color: theme.color.accent, marginRight: 14 }}>→</span>
              {c.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
