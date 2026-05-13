import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CommandScene } from '../components/CommandScene';
import { TypingText } from '../components/TypingText';

export const CommandDev = () => {
  const frame = useCurrentFrame();
  return (
    <CommandScene
      kicker="step 4 of 6 · engineering"
      title={
        <>
          <span style={{ color: theme.color.accent }}>/sse:dev</span> — implement the plan
        </>
      }
      termTitle="claude code · billing-service"
      artifacts={[
        { kind: 'guide',  name: 'coding-style.md',                 showFrame: 30 },
        { kind: 'guide',  name: 'commit-style.md',                 showFrame: 45 },
        { kind: 'ref',    name: 'outputs/plan/...billing.md',      showFrame: 65 },
        { kind: 'ref',    name: '.claude/conventions/backend.md',  showFrame: 85 },
        { kind: 'sensor', name: 'code-conventions.md',             showFrame: 175 },
      ]}
      exitStart={220}
      exitEnd={240}
    >
      <Line>
        <Prompt /> <TypingText text="/sse:dev" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 55} />
      </Line>
      {frame >= 70 && <Line dim>loading plan + conventions...</Line>}
      {frame >= 100 && <Line dim>edit · src/billing/invoice_deadline.py</Line>}
      {frame >= 120 && <Line dim>edit · src/billing/timezone.py <span style={{ color: theme.color.success }}>(new)</span></Line>}
      {frame >= 140 && <Line dim>edit · tests/test_invoice_deadline.py</Line>}
      {frame >= 165 && <Line dim>3 commits · conventional commits</Line>}
      {frame >= 175 && <Sensor name="code-conventions" pass />}
      {frame >= 195 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> dev complete · <span style={{ color: theme.color.textDim }}>5 files changed</span>
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
