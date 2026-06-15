import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CommandScene } from '../components/CommandScene';
import { TypingText } from '../components/TypingText';

export const CommandPRP = () => {
  const frame = useCurrentFrame();
  return (
    <CommandScene
      kicker="step 2 of 6 · product"
      title={
        <>
          <span style={{ color: theme.color.accent }}>/product-manager:prp</span>, engineering-ready spec
        </>
      }
      termTitle="claude code · billing"
      artifacts={[
        { kind: 'guide',  name: 'prp-guidelines.md',          showFrame: 40 },
        { kind: 'ref',    name: 'outputs/prd/...billing.md',  showFrame: 55 },
        { kind: 'ref',    name: 'good-prp-example.md',        showFrame: 75 },
        { kind: 'sensor', name: 'prp-structure.md',           showFrame: 165 },
        { kind: 'sensor', name: 'prp-context-quality.md',     showFrame: 185 },
        { kind: 'sensor', name: 'prp-links.md',               showFrame: 205 },
        { kind: 'eval',   name: 'prp-quality.md',             showFrame: 235 },
        { kind: 'eval',   name: 'prp-context-readiness.md',   showFrame: 250 },
      ]}
      exitStart={280}
      exitEnd={300}
    >
      <Line>
        <Prompt /> <TypingText text="/product-manager:prp" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 60} />
      </Line>
      {frame >= 70 && <Line dim>&gt; source PRD? <span style={{ color: theme.color.text }}>outputs/prd/2026-05-13-billing-tz-fix.md</span></Line>}
      {frame >= 100 && <Line dim>loading guide + PRD context...</Line>}
      {frame >= 140 && <Line dim>drafting context, acceptance, files, gates...</Line>}
      {frame >= 165 && <Sensor name="prp-structure" pass />}
      {frame >= 190 && <Sensor name="prp-context-quality" pass />}
      {frame >= 210 && <Sensor name="prp-links" pass />}
      {frame >= 235 && <EvalLine name="prp-quality" score="8.4/10" />}
      {frame >= 250 && <EvalLine name="prp-context-readiness" score="8.8/10" />}
      {frame >= 268 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> saved · <span style={{ color: theme.color.textDim }}>outputs/prp/2026-05-13-billing-tz-fix.md</span>
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
