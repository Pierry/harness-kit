import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';

const LINES: { from: number; text: React.ReactNode }[] = [
  { from: 0,   text: <Prompt>~/svc/billing</Prompt> },
  { from: 12,  text: <><Prompt>~/svc/billing</Prompt> <Cmd>claude</Cmd></> },
  { from: 28,  text: <Faint>opening session...</Faint> },
  { from: 44,  text: <Accent>pipeline resume available:</Accent> },
  { from: 58,  text: <Mono><Tag color={theme.color.text}>billing-multi-currency</Tag> <Bracket>[plan+dev+test+pr]</Bracket> <Sep/> <Approved>plan approved</Approved> <Sep/> <Drafting>dev drafting</Drafting> <Sep/> next <NextCmd>/sse:dev</NextCmd></Mono> },
  { from: 74,  text: <Faint>run /pipeline:continue or /pipeline:reset to abandon</Faint> },
  { from: 92,  text: <><Prompt>&gt;</Prompt> <Cmd>/pipeline:continue</Cmd></> },
  { from: 116, text: <Faint>reading state...</Faint> },
  { from: 130, text: <Mono>feature: <Tag color={theme.color.text}>billing-multi-currency</Tag></Mono> },
  { from: 140, text: <Mono>next:    <NextCmd>/sse:dev</NextCmd></Mono> },
  { from: 156, text: <Accent>resuming /sse:dev...</Accent> },
];

export const Resume = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const termSpring = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const exit = interpolate(frame, [200, 220], [1, 0], { extrapolateRight: 'clamp' });

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
          resume
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
          Close, reopen, <span style={{ color: theme.color.accent }}>continue.</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            maxWidth: 1400,
            lineHeight: 1.35,
          }}
        >
          State lives on disk. The SessionStart hook surfaces it. <Mono>/pipeline:continue</Mono> picks up at the next pending stage.
        </div>
      </div>

      <div
        style={{
          marginTop: 64,
          marginLeft: 200,
          marginRight: 200,
          flex: 1,
          minHeight: 0,
          transform: `translateY(${(1 - termSpring) * 24}px)`,
          opacity: termSpring,
        }}
      >
        <Terminal title="zsh ~ billing">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 24 }}>
            {LINES.map((line, i) => {
              if (frame < line.from) return null;
              const lineOpacity = interpolate(frame, [line.from, line.from + 10], [0, 1], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ opacity: lineOpacity }}>
                  {line.text}
                </div>
              );
            })}
          </div>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

function Prompt({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.success, fontFamily: theme.font.mono }}>{children}</span>;
}
function Cmd({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.accent, fontFamily: theme.font.mono }}>{children}</span>;
}
function Faint({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.textFaint, fontFamily: theme.font.mono, fontStyle: 'italic' }}>{children}</span>;
}
function Accent({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.accent, fontFamily: theme.font.mono, fontWeight: 600 }}>{children}</span>;
}
function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: theme.font.mono, color: theme.color.text }}>{children}</span>;
}
function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ color, fontWeight: 600 }}>{children}</span>;
}
function Bracket({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.textFaint }}>{children}</span>;
}
function Sep() {
  return <span style={{ color: theme.color.textFaint }}> · </span>;
}
function Approved({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.success }}>{children}</span>;
}
function Drafting({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.warning }}>{children}</span>;
}
function NextCmd({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.accent }}>{children}</span>;
}
