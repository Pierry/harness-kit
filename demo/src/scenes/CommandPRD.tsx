import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CommandScene } from '../components/CommandScene';
import { TypingText } from '../components/TypingText';

export const CommandPRD = () => {
  const frame = useCurrentFrame();
  return (
    <CommandScene
      kicker="step 1 of 6 · product"
      title={
        <>
          <span style={{ color: theme.color.accent }}>/product-manager:prd</span> — draft a PRD
        </>
      }
      termTitle="claude code · billing"
      artifacts={[
        { kind: 'guide',  name: 'prd-guidelines.md',          showFrame: 40 },
        { kind: 'guide',  name: 'writing-style.md',           showFrame: 55 },
        { kind: 'ref',    name: 'business-info.md',           showFrame: 75 },
        { kind: 'ref',    name: 'squads/billing/context.md',  showFrame: 95 },
        { kind: 'sensor', name: 'prd-structure.md',           showFrame: 175 },
        { kind: 'sensor', name: 'prd-acceptance-criteria.md', showFrame: 195 },
        { kind: 'eval',   name: 'prd-quality.md',             showFrame: 225 },
        { kind: 'eval',   name: 'prd-readiness.md',           showFrame: 240 },
      ]}
      exitStart={280}
      exitEnd={300}
    >
      <Line>
        <Prompt /> <TypingText text="/product-manager:prd" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 60} />
      </Line>
      {frame >= 70 && <Line dim>&gt; squad? <span style={{ color: theme.color.text }}>billing</span></Line>}
      {frame >= 90 && <Line dim>&gt; problem? invoice deadlines flag overdue on non-UTC customers</Line>}
      {frame >= 130 && <Line dim>loading guides + references...</Line>}
      {frame >= 160 && <Line dim>drafting...</Line>}
      {frame >= 175 && <Sensor name="prd-structure" pass />}
      {frame >= 200 && <Sensor name="prd-acceptance-criteria" pass />}
      {frame >= 225 && <EvalLine name="prd-quality" score="8.6/10" />}
      {frame >= 245 && <EvalLine name="prd-readiness" score="9.1/10" />}
      {frame >= 265 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> saved · <span style={{ color: theme.color.textDim }}>outputs/prd/2026-05-13-billing-tz-fix.md</span>
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
