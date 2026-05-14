import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CommandScene } from '../components/CommandScene';
import { TypingText } from '../components/TypingText';

export const CommandPR = () => {
  const frame = useCurrentFrame();
  return (
    <CommandScene
      kicker="step 6 of 6 · engineering"
      title={
        <>
          <span style={{ color: theme.color.accent }}>/sse:pr</span> — open draft PR
        </>
      }
      termTitle="claude code · billing-service"
      artifacts={[
        { kind: 'guide',  name: 'commit-style.md',           showFrame: 35 },
        { kind: 'ref',    name: 'outputs/prd/...billing.md', showFrame: 50 },
        { kind: 'ref',    name: 'outputs/prp/...billing.md', showFrame: 65 },
        { kind: 'ref',    name: 'gh CLI · auth status',      showFrame: 80 },
        { kind: 'sensor', name: 'pr-structure.md',           showFrame: 115 },
        { kind: 'eval',   name: 'pr-quality.md',             showFrame: 130 },
      ]}
      exitStart={160}
      exitEnd={180}
    >
      <Line>
        <Prompt /> <TypingText text="/sse:pr" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 55} />
      </Line>
      {frame >= 60 && <Line dim>composing title + body from PRD/PRP...</Line>}
      {frame >= 85 && <Line dim>$ gh pr create --draft</Line>}
      {frame >= 105 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> PR opened:{' '}
          <span style={{ color: theme.color.accent }}>github.com/your-org/billing-service/pull/567</span>
        </Line>
      )}
      {frame >= 115 && <Sensor name="pr-structure" pass />}
      {frame >= 130 && <Eval name="pr-quality" score="8.9/10" />}
      {frame >= 145 && (
        <Line>
          <span style={{ color: theme.color.accent }}>◐</span> pr-monitor armed · <span style={{ color: theme.color.textDim }}>3min → 30min cap, until merged</span>
        </Line>
      )}
    </CommandScene>
  );
};

const Line: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <div style={{ marginBottom: 9, color: dim ? theme.color.textDim : theme.color.text }}>{children}</div>
);

const Prompt = () => <span style={{ color: theme.color.accent }}>$</span>;

const Sensor = ({ name, pass }: { name: string; pass: boolean }) => (
  <Line dim>
    <span style={{ color: theme.color.warning }}>sensor</span> {name}{' '}
    <span style={{ color: pass ? theme.color.success : theme.color.danger }}>
      {pass ? 'pass' : 'fail'}
    </span>
  </Line>
);

const Eval = ({ name, score }: { name: string; score: string }) => (
  <Line dim>
    <span style={{ color: theme.color.warning }}>eval</span> {name}{' '}
    <span style={{ color: theme.color.success }}>{score}</span>
  </Line>
);
