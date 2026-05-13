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
        { kind: 'guide', name: 'commit-style.md',           showFrame: 35 },
        { kind: 'ref',   name: 'outputs/prd/...billing.md', showFrame: 55 },
        { kind: 'ref',   name: 'outputs/prp/...billing.md', showFrame: 70 },
        { kind: 'ref',   name: 'gh CLI · auth status',      showFrame: 90 },
      ]}
      exitStart={155}
      exitEnd={180}
    >
      <Line>
        <Prompt /> <TypingText text="/sse:pr" startFrame={20} style={{ color: theme.color.accent }} cursor={frame < 55} />
      </Line>
      {frame >= 70 && <Line dim>composing title + body from PRD/PRP...</Line>}
      {frame >= 100 && <Line dim>$ gh pr create --draft</Line>}
      {frame >= 130 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> PR opened:{' '}
          <span style={{ color: theme.color.accent }}>github.com/your-org/billing-service/pull/567</span>
        </Line>
      )}
      {frame >= 150 && (
        <Line>
          <span style={{ color: theme.color.success }}>✓</span> pipeline complete · <span style={{ color: theme.color.textDim }}>idea → merged PR</span>
        </Line>
      )}
    </CommandScene>
  );
};

const Line: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <div style={{ marginBottom: 9, color: dim ? theme.color.textDim : theme.color.text }}>{children}</div>
);

const Prompt = () => <span style={{ color: theme.color.accent }}>$</span>;
