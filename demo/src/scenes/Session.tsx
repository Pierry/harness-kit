import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';

export const Session = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [620, 660], [1, 0], { extrapolateRight: 'clamp' });

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const termSpring = spring({ frame: frame - 6, fps, config: { damping: 16 } });

  // Pipeline status timeline (frame ranges per stage)
  const statusStages = [
    { from: 100,  text: 'billing-tz-fix · prd drafting · next /product-manager:prd' },
    { from: 200,  text: 'billing-tz-fix · prd approved · prp drafting · next /product-manager:prp' },
    { from: 300,  text: 'billing-tz-fix · prp approved · plan drafting · next /sse:plan' },
    { from: 400,  text: 'billing-tz-fix · plan approved · dev drafting · next /sse:dev' },
    { from: 500,  text: 'billing-tz-fix · test approved · pr pending · next /sse:pr' },
    { from: 570,  text: 'billing-tz-fix · complete' },
  ];

  const currentStatus = [...statusStages].reverse().find((s) => frame >= s.from)?.text ?? statusStages[0].text;
  const isComplete = frame >= 570;

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, opacity: exit }}>
      <div
        style={{
          marginLeft: 80,
          opacity: titleOpacity,
        }}
      >
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          one session, end to end
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
          PRD → PRP → plan → dev → test → <span style={{ color: theme.color.success }}>PR</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 70,
          marginLeft: 80,
          marginRight: 80,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 30,
          transform: `translateY(${(1 - termSpring) * 30}px)`,
          opacity: termSpring,
        }}
      >
        <Terminal title="claude code" style={{ flex: 1 }}>
          <Line>
            <Prompt /> <TypingText text="/product-manager:run" startFrame={30} style={{ color: theme.color.accent }} cursor={frame < 70} />
          </Line>
          {frame >= 90 && <Line dim>&gt; squad? billing</Line>}
          {frame >= 110 && <Line dim>&gt; problem? invoice deadlines flag overdue on non-UTC customers</Line>}
          {frame >= 175 && (
            <Line>
              <span style={{ color: theme.color.success }}>✓</span> PRD saved at outputs/prd/2026-05-13-billing-tz-fix.md
            </Line>
          )}
          {frame >= 200 && (
            <Line dim>&nbsp;&nbsp;score: 8.6/10</Line>
          )}
          {frame >= 260 && (
            <Line>
              <span style={{ color: theme.color.success }}>✓</span> PRP saved at outputs/prp/2026-05-13-billing-tz-fix.md
            </Line>
          )}
          {frame >= 285 && (
            <Line dim>&nbsp;&nbsp;score: 8.4/10</Line>
          )}
          {frame >= 320 && (
            <Line>
              <Prompt /> <TypingText text="/sse:run" startFrame={320} style={{ color: theme.color.accent }} cursor={frame < 360} />
            </Line>
          )}
          {frame >= 380 && <Line dim>&gt; source PRP? outputs/prp/2026-05-13-billing-tz-fix.md</Line>}
          {frame >= 410 && <Line dim>&gt; area? backend</Line>}
          {frame >= 440 && (
            <Line>
              <span style={{ color: theme.color.success }}>✓</span> Plan saved · score 8.3/10
            </Line>
          )}
          {frame >= 470 && (
            <Line dim>Dev complete · 5 files changed · 3 commits</Line>
          )}
          {frame >= 505 && (
            <Line>
              <span style={{ color: theme.color.success }}>✓</span> Tests: 24 passed, 0 failed
            </Line>
          )}
          {frame >= 535 && (
            <Line>
              <span style={{ color: theme.color.success }}>✓</span> PR opened: <span style={{ color: theme.color.accent }}>github.com/your-org/billing-service/pull/567</span>
            </Line>
          )}
        </Terminal>

        <StatusBar text={currentStatus} complete={isComplete} />
      </div>
    </AbsoluteFill>
  );
};

const StatusBar = ({ text, complete }: { text: string; complete: boolean }) => (
  <div
    style={{
      padding: '20px 28px',
      background: theme.color.surface,
      borderRadius: theme.radius.md,
      border: `1px solid ${theme.color.borderStrong}`,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      fontFamily: theme.font.mono,
      fontSize: theme.type.codeSmall,
    }}
  >
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        background: complete ? theme.color.success : theme.color.accent,
        boxShadow: `0 0 12px ${complete ? theme.color.success : theme.color.accent}`,
      }}
    />
    <span style={{ color: theme.color.textDim, fontSize: theme.type.label, letterSpacing: 2, textTransform: 'uppercase' }}>
      status bar
    </span>
    <span style={{ color: theme.color.text, flex: 1, textAlign: 'right' }}>{text}</span>
  </div>
);

const Line: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <div style={{ marginBottom: 10, color: dim ? theme.color.textDim : theme.color.text }}>{children}</div>
);

const Prompt = () => <span style={{ color: theme.color.accent }}>$</span>;
