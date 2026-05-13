import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CommandScene } from '../components/CommandScene';
import { TypingText } from '../components/TypingText';

export const CommandPlan = () => {
  const frame = useCurrentFrame();
  return (
    <CommandScene
      kicker="step 3 of 6 · engineering"
      title={
        <>
          <span style={{ color: theme.color.accent }}>/sse:plan</span> — technical plan from PRP
        </>
      }
      termTitle="claude code · billing-service"
      artifacts={[
        { kind: 'guide',  name: 'pipeline.md',                showFrame: 35 },
        { kind: 'guide',  name: 'coding-style.md',            showFrame: 50 },
        { kind: 'ref',    name: 'outputs/prp/...billing.md',  showFrame: 70 },
        { kind: 'ref',    name: '.claude/conventions/backend.md', showFrame: 90 },
        { kind: 'sensor', name: 'plan-structure.md',          showFrame: 145 },
        { kind: 'eval',   name: 'plan-quality.md',            showFrame: 175 },
      ]}
      exitStart={220}
      exitEnd={240}
    >
      <Line>
        <Prompt /> <TypingText text="/sse:plan" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 55} />
      </Line>
      {frame >= 65 && <Line dim>&gt; source PRP? <span style={{ color: theme.color.text }}>outputs/prp/2026-05-13-billing-tz-fix.md</span></Line>}
      {frame >= 90 && <Line dim>&gt; area? <span style={{ color: theme.color.text }}>backend</span></Line>}
      {frame >= 110 && <Line dim>loading project conventions...</Line>}
      {frame >= 130 && <Line dim>drafting steps, files, gates, tests...</Line>}
      {frame >= 145 && <Sensor name="plan-structure" pass />}
      {frame >= 175 && <EvalLine name="plan-quality" score="8.3/10" />}
      {frame >= 200 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> saved · <span style={{ color: theme.color.textDim }}>outputs/plan/2026-05-13-billing-tz-fix.md</span>
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

const EvalLine = ({ name, score }: { name: string; score: string }) => (
  <Line dim>
    <span style={{ color: theme.color.success }}>eval</span> {name} · score{' '}
    <span style={{ color: theme.color.text }}>{score}</span>
  </Line>
);
