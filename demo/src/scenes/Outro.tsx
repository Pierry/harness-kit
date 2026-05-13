import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 16 } });
  const subOpacity = interpolate(frame, [18, 38], [0, 1], { extrapolateRight: 'clamp' });
  const linksOpacity = interpolate(frame, [38, 60], [0, 1], { extrapolateRight: 'clamp' });
  const cmdOpacity = interpolate(frame, [60, 84], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, justifyContent: 'center' }}>
      <div style={{ marginLeft: 80, maxWidth: 1500 }}>
        <div
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 30}px)`,
            fontFamily: theme.font.display,
            fontSize: theme.type.h1,
            fontWeight: 800,
            color: theme.color.text,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          Ship the next feature. <span style={{ color: theme.color.accent }}>One pipeline.</span>
        </div>

        <div
          style={{
            opacity: subOpacity,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            marginTop: 32,
            maxWidth: 1200,
          }}
        >
          Free. MIT. Works in any repo Claude Code touches.
        </div>

        <div
          style={{
            opacity: cmdOpacity,
            marginTop: 60,
            padding: '20px 28px',
            display: 'inline-block',
            background: theme.color.codeBg,
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.color.accent}40`,
            fontFamily: theme.font.mono,
            fontSize: theme.type.code,
            color: theme.color.text,
            boxShadow: `0 0 80px ${theme.color.accent}25`,
          }}
        >
          <span style={{ color: theme.color.accent }}>$</span> npm i -g{' '}
          <span style={{ color: theme.color.success }}>@pieerry/harness-kit</span>
        </div>

        <div
          style={{
            opacity: linksOpacity,
            marginTop: 56,
            display: 'flex',
            gap: 40,
            color: theme.color.textDim,
            fontSize: theme.type.body,
            fontFamily: theme.font.mono,
          }}
        >
          <LinkRow label="GitHub" value="github.com/Pierry/harness-kit" />
          <Divider />
          <LinkRow label="npm" value="@pieerry/harness-kit" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const LinkRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: theme.type.label, color: theme.color.textFaint, letterSpacing: 2, textTransform: 'uppercase' }}>
      {label}
    </span>
    <span style={{ color: theme.color.text }}>{value}</span>
  </div>
);

const Divider = () => (
  <div style={{ width: 1, background: theme.color.borderStrong, alignSelf: 'stretch' }} />
);
