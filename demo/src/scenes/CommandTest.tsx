import { useCurrentFrame } from 'remotion';
import { theme } from '../theme';
import { CommandScene } from '../components/CommandScene';
import { TypingText } from '../components/TypingText';

export const CommandTest = () => {
  const frame = useCurrentFrame();
  return (
    <CommandScene
      kicker="step 5 of 6 · engineering"
      title={
        <>
          <span style={{ color: theme.color.accent }}>/sse:test</span> — run project test suite
        </>
      }
      termTitle="claude code · billing-service"
      artifacts={[
        { kind: 'sensor', name: 'test-coverage.md',  showFrame: 60 },
        { kind: 'ref',    name: 'pytest.ini',        showFrame: 75 },
        { kind: 'sensor', name: 'test-structure.md', showFrame: 105 },
        { kind: 'eval',   name: 'test-quality.md',   showFrame: 120 },
      ]}
      exitStart={130}
      exitEnd={150}
    >
      <Line>
        <Prompt /> <TypingText text="/sse:test" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 55} />
      </Line>
      {frame >= 55 && <Line dim>$ pytest -q</Line>}
      {frame >= 70 && <Line dim>.................. <span style={{ color: theme.color.textDim }}>(18 collected)</span></Line>}
      {frame >= 85 && <Line dim>......</Line>}
      {frame >= 95 && <Sensor name="test-coverage" pass />}
      {frame >= 105 && <Sensor name="test-structure" pass />}
      {frame >= 120 && <Eval name="test-quality" score="8.7/10" />}
      {frame >= 135 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> 24 passed · 0 failed · <span style={{ color: theme.color.textDim }}>1.84s</span>
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
