import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { SectionLabel } from './SectionLabel';

// 05 · how it's gated. Zoom into ONE stage of the golden path: the agent
// generates the artifact, a deterministic sensor checks structure, an
// LLM-judge eval scores it, and only then a human approves. Failures loop
// back and self-correct. Mirrors the diagram on the usage-guide site.

const gold = theme.color.warning;

type NodeDef = {
  id: string;
  label: string;
  sub: string;
  kind: 'box' | 'gate';
  tint: string;
};

const nodes: NodeDef[] = [
  { id: 'gen',     label: 'generate',   sub: 'the artifact',    kind: 'box',  tint: theme.color.textDim },
  { id: 'sensor',  label: 'sensor',     sub: 'structure check', kind: 'gate', tint: theme.color.accent },
  { id: 'eval',    label: 'eval',       sub: 'LLM judge',       kind: 'gate', tint: theme.color.accent },
  { id: 'approve', label: 'human',      sub: 'approves',        kind: 'box',  tint: theme.color.success },
  { id: 'next',    label: 'next stage', sub: '',                kind: 'box',  tint: theme.color.successDim },
];

const NODE_START = 70;
const NODE_GAP = 22;
const lastNode = NODE_START + (nodes.length - 1) * NODE_GAP;
const LOOP1_AT = lastNode + 26; // sensor "fail → regenerate"
const LOOP2_AT = LOOP1_AT + 32; // eval "score < 8.0 → retry x3"

export const GatedStage = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOpacity = interpolate(frame, [16, 36], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [40, 62], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [300, 326], [1, 0], { extrapolateRight: 'clamp' });
  const tagOpacity = interpolate(frame, [LOOP2_AT + 30, LOOP2_AT + 54], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, justifyContent: 'center', alignItems: 'center', opacity: exit }}>
      <div style={{ marginBottom: 26 }}>
        <SectionLabel n="05" label="how it's gated" />
      </div>

      <div
        style={{
          opacity: headOpacity,
          fontFamily: theme.font.display,
          fontSize: theme.type.h2,
          fontWeight: 700,
          color: theme.color.text,
          letterSpacing: -1,
          textAlign: 'center',
        }}
      >
        Every stage is a <span style={{ color: gold }}>self-correcting</span> loop.
      </div>
      <div
        style={{
          marginTop: 14,
          marginBottom: 64,
          opacity: subOpacity,
          fontFamily: theme.font.mono,
          fontSize: theme.type.codeSmall,
          color: theme.color.textDim,
        }}
      >
        nothing reaches you until the sensor passes and the eval scores it ≥ 8.0
      </div>

      {/* the forward chain + loop-back arcs */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 1640, paddingBottom: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {nodes.map((n, i) => {
            const start = NODE_START + i * NODE_GAP;
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', flex: i === nodes.length - 1 ? '0 0 auto' : 1 }}>
                <GateNode node={n} start={start} frame={frame} fps={fps} />
                {i < nodes.length - 1 && <Connector start={start + NODE_GAP - 8} frame={frame} />}
              </div>
            );
          })}
        </div>

        {/* loop-back arcs, beneath the chain, returning to "generate" */}
        <LoopBack toPct={7} fromPct={31} start={LOOP1_AT} frame={frame} label="fail" depth={66} />
        <LoopBack toPct={10} fromPct={54} start={LOOP2_AT} frame={frame} label="score < 8.0 · retry ×3" depth={128} />
      </div>

      {/* the harness vocabulary */}
      <div
        style={{
          marginTop: 8,
          opacity: tagOpacity,
          display: 'flex',
          gap: 34,
          fontFamily: theme.font.mono,
          fontSize: theme.type.label,
          color: theme.color.textFaint,
        }}
      >
        <Vocab tint={theme.color.accent} k="sensor" v="deterministic" />
        <Vocab tint={theme.color.accent} k="eval" v="inferential" />
        <Vocab tint={theme.color.success} k="human" v="on the loop" />
      </div>
    </AbsoluteFill>
  );
};

const GateNode = ({ node, start, frame, fps }: { node: NodeDef; start: number; frame: number; fps: number }) => {
  const active = frame >= start + 4;
  const pop = spring({ frame: frame - start, fps, config: { damping: 12, mass: 0.5 } });
  const scale = 0.7 + (active ? pop : 0) * 0.3;
  const tint = node.tint;
  const isGate = node.kind === 'gate';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
      <div
        style={{
          width: isGate ? 112 : 150,
          height: isGate ? 112 : 86,
          borderRadius: isGate ? 18 : theme.radius.md,
          transform: `scale(${scale}) ${isGate ? 'rotate(45deg)' : ''}`,
          background: active ? `${tint}1c` : theme.color.codeBg,
          border: `2px solid ${active ? tint : theme.color.borderStrong}`,
          boxShadow: active ? `0 0 22px ${tint}55` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ transform: isGate ? 'rotate(-45deg)' : 'none', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: theme.font.mono,
              fontSize: theme.type.codeSmall,
              fontWeight: 700,
              color: active ? theme.color.text : theme.color.textFaint,
              lineHeight: 1.1,
            }}
          >
            {node.label}
          </div>
          {node.sub && (
            <div
              style={{
                marginTop: 4,
                fontFamily: theme.font.mono,
                fontSize: 14,
                color: active ? tint : 'transparent',
                lineHeight: 1.1,
              }}
            >
              {node.sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Connector = ({ start, frame }: { start: number; frame: number }) => {
  const fill = interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ flex: 1, height: 3, margin: '0 14px', background: theme.color.border, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${fill * 100}%`,
          background: `linear-gradient(90deg, ${theme.color.accent}, ${gold})`,
          boxShadow: fill > 0 ? `0 0 8px ${gold}88` : 'none',
        }}
      />
    </div>
  );
};

// A dashed "U" that returns from a gate back to "generate", drawn beneath the chain.
const LoopBack = ({
  toPct,
  fromPct,
  start,
  frame,
  label,
  depth,
}: {
  toPct: number;
  fromPct: number;
  start: number;
  frame: number;
  label: string;
  depth: number;
}) => {
  const op = interpolate(frame, [start, start + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame, [start + 12, start + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const danger = theme.color.danger;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${toPct}%`,
        top: 56,
        width: `${fromPct - toPct}%`,
        height: depth,
        opacity: op,
      }}
    >
      {/* the U-shaped return path */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderLeft: `2px dashed ${danger}`,
          borderRight: `2px dashed ${danger}`,
          borderBottom: `2px dashed ${danger}`,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          opacity: 0.55,
        }}
      />
      {/* arrowhead at the left (generate) end, pointing up */}
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: -9,
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `10px solid ${danger}`,
          opacity: 0.7,
        }}
      />
      {/* label centered under the bottom of the U */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -28,
          textAlign: 'center',
          opacity: labelOp,
          fontFamily: theme.font.mono,
          fontSize: 17,
          color: danger,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Vocab = ({ tint, k, v }: { tint: string; k: string; v: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
    <span style={{ width: 10, height: 10, borderRadius: 999, background: tint }} />
    <span style={{ color: theme.color.text, fontWeight: 700 }}>{k}</span>
    <span>{v}</span>
  </span>
);
