import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';
import { SectionLabel } from './SectionLabel';

// What `/harness-kit:install` actually lays down, in install order.
// This is the "behind the scenes" timeline: the harness anatomy.
const steps = [
  { label: 'agents',     desc: 'product-manager · staff-software-engineer · system-architect' },
  { label: 'sensors',    desc: 'input gates that guard each stage' },
  { label: 'guides',     desc: 'conventions · templates · examples' },
  { label: 'evals',      desc: 'quality gate between every stage' },
  { label: 'commands',   desc: '/product-manager · /sse · /pipeline · /context' },
  { label: 'hooks',      desc: 'status bar · token accounting · pipeline state' },
  { label: 'AGENTS.md',  desc: 'routing table at the repo root' },
];

const STEP_START = 214; // first node lights up
const STEP_GAP = 28;    // frames between nodes
const lastStepFrame = STEP_START + (steps.length - 1) * STEP_GAP;

export const Install = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const termOpacity = interpolate(frame, [20, 44], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [500, 530], [1, 0], { extrapolateRight: 'clamp' });

  const promptColor = theme.color.accent;

  // The rail "draws" itself from first node to last as steps stream in.
  const railH = interpolate(frame, [STEP_START + 8, lastStepFrame + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: exit,
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <SectionLabel n="02" label="how to install" />
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', opacity: termOpacity }}>
        <Terminal title="claude code">
          {/* 1, add the marketplace */}
          <Line>
            <span style={{ color: promptColor }}>{'>'}</span>{' '}
            <TypingText text="/plugin marketplace add Pierry/harness-kit" startFrame={40} cps={48} />
          </Line>
          <Output start={88} dim>
            {'  '}added marketplace · harness-kit
          </Output>

          {/* 2, install the plugin (registers it in Claude Code) */}
          <Line>
            <span style={{ color: promptColor }}>{'>'}</span>{' '}
            <TypingText text="/plugin install harness-kit@harness-kit" startFrame={104} cps={48} />
          </Line>
          <Output start={150} dim>
            {'  '}installed · harness-kit v4.3.1
          </Output>

          {/* 3, lay the harness down into the repo */}
          <Line>
            <span style={{ color: promptColor }}>{'>'}</span>{' '}
            <TypingText text="/harness-kit:install" startFrame={166} cps={42} />
          </Line>
          <Output start={196} dim>
            {'  '}harness-kit v4.3.1 → ~/your-repo
          </Output>

          {/* timeline, what gets laid down behind the scenes */}
          <div style={{ position: 'relative', paddingLeft: 46, marginTop: 22, marginBottom: 8 }}>
            {/* base rail */}
            <div
              style={{
                position: 'absolute',
                left: 13,
                top: 16,
                bottom: 16,
                width: 2,
                background: theme.color.border,
              }}
            />
            {/* progress rail (draws as steps arrive) */}
            <div
              style={{
                position: 'absolute',
                left: 13,
                top: 16,
                height: `calc((100% - 32px) * ${railH})`,
                width: 2,
                background: theme.color.accentDim,
              }}
            />
            {steps.map((step, i) => (
              <Step key={step.label} step={step} start={STEP_START + i * STEP_GAP} frame={frame} fps={fps} />
            ))}
          </div>

          <Output start={lastStepFrame + 30} accent>
            {'  '}done. restart Claude Code to load the pipeline.
          </Output>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

const Step = ({
  step,
  start,
  frame,
  fps,
}: {
  step: { label: string; desc: string };
  start: number;
  frame: number;
  fps: number;
}) => {
  const op = interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = spring({ frame: frame - start, fps, config: { damping: 18 } });
  const active = frame >= start + 6;
  const pop = spring({ frame: frame - start, fps, config: { damping: 12, mass: 0.5 } });

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        minHeight: 44,
        opacity: op,
        transform: `translateX(${(1 - x) * 22}px)`,
      }}
    >
      {/* node on the rail */}
      <div
        style={{
          position: 'absolute',
          left: -39,
          top: 6,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: active ? theme.color.accent : theme.color.codeBg,
          border: `2px solid ${active ? theme.color.accent : theme.color.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${0.6 + pop * 0.4})`,
          boxShadow: active ? `0 0 12px ${theme.color.accent}66` : 'none',
        }}
      >
        {active && (
          <span style={{ color: theme.color.codeBg, fontSize: 14, fontWeight: 800, lineHeight: 1 }}>✓</span>
        )}
      </div>

      <span
        style={{
          fontFamily: theme.font.mono,
          fontSize: theme.type.code,
          fontWeight: 700,
          color: theme.color.text,
          minWidth: 200,
        }}
      >
        {step.label}
      </span>
      <span
        style={{
          fontFamily: theme.font.mono,
          fontSize: theme.type.codeSmall,
          color: theme.color.textDim,
        }}
      >
        {step.desc}
      </span>
    </div>
  );
};

const Line = ({ children }: { children: React.ReactNode }) => (
  <div style={{ marginBottom: 8 }}>{children}</div>
);

const Output = ({ start, children, dim, accent }: { start: number; children: React.ReactNode; dim?: boolean; accent?: boolean }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        opacity,
        marginBottom: 6,
        color: accent ? theme.color.success : dim ? theme.color.textFaint : theme.color.text,
        fontFamily: theme.font.mono,
        fontSize: theme.type.codeSmall,
      }}
    >
      {children}
    </div>
  );
};
