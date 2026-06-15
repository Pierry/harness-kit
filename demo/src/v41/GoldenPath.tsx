import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { TypingText } from '../components/TypingText';
import { SectionLabel } from './SectionLabel';

// The six gated stages of the golden path, idea → merged PR.
// prd·prp are the PM half (/product-manager:run); plan·dev·test·pr the SSE half (/sse:run).
const stages = [
  { id: 'prd',  group: 'product-manager' },
  { id: 'prp',  group: 'product-manager' },
  { id: 'plan', group: 'staff-software-engineer' },
  { id: 'dev',  group: 'staff-software-engineer' },
  { id: 'test', group: 'staff-software-engineer' },
  { id: 'pr',   group: 'staff-software-engineer' },
];

const NODE_START = 78; // first stage lights up
const NODE_GAP = 24;   // frames between stages
const lastNode = NODE_START + (stages.length - 1) * NODE_GAP;

const gold = theme.color.warning; // the path is literally golden

export const GoldenPath = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOpacity = interpolate(frame, [16, 36], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [54, 74], [0, 1], { extrapolateRight: 'clamp' });
  const mergedActive = frame >= lastNode + 18;
  const mergedSpring = spring({ frame: frame - (lastNode + 14), fps, config: { damping: 12, mass: 0.6 } });
  const tagOpacity = interpolate(frame, [lastNode + 40, lastNode + 64], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [300, 326], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{ padding: theme.space.pad, justifyContent: 'center', alignItems: 'center', opacity: exit }}
    >
      <div style={{ marginBottom: 30 }}>
        <SectionLabel n="04" label="the golden path" />
      </div>

      {/* command */}
      <div
        style={{
          opacity: headOpacity,
          fontFamily: theme.font.mono,
          fontSize: theme.type.h3,
          fontWeight: 700,
          color: theme.color.text,
          letterSpacing: -0.5,
        }}
      >
        <span style={{ color: gold }}>{'>'}</span>{' '}
        <TypingText text="/golden-path" startFrame={28} cps={30} style={{ color: theme.color.text }} />
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
        idea → merged PR · one command · six gated stages
      </div>

      {/* the golden rail */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: 1640,
        }}
      >
        <EndCap label="idea" start={50} frame={frame} fps={fps} />
        <Connector start={NODE_START - 8} frame={frame} />

        {stages.map((stage, i) => {
          const start = NODE_START + i * NODE_GAP;
          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Node stage={stage} start={start} frame={frame} fps={fps} />
              <Connector start={start + NODE_GAP - 8} frame={frame} />
            </div>
          );
        })}

        <EndCap
          label="merged PR"
          start={lastNode + 14}
          frame={frame}
          fps={fps}
          color={theme.color.success}
          spring={mergedSpring}
          active={mergedActive}
        />
      </div>

      {/* grouping legend */}
      <div
        style={{
          marginTop: 48,
          display: 'flex',
          gap: 40,
          opacity: subOpacity,
          fontFamily: theme.font.mono,
          fontSize: theme.type.label,
          color: theme.color.textFaint,
        }}
      >
        <LegendDot color={theme.color.accent} text="/product-manager:run, prd · prp" />
        <LegendDot color={gold} text="/sse:run, plan · dev · test · pr" />
      </div>

      {/* properties tagline */}
      <div
        style={{
          marginTop: 40,
          opacity: tagOpacity,
          fontFamily: theme.font.body,
          fontSize: theme.type.h3,
          fontWeight: 600,
          color: theme.color.text,
          letterSpacing: -0.5,
        }}
      >
        opinionated<Dotsep /> supported<Dotsep /> optional<Dotsep />
        <span style={{ color: gold }}>transparent</span>
      </div>
    </AbsoluteFill>
  );
};

const Node = ({
  stage,
  start,
  frame,
  fps,
}: {
  stage: { id: string; group: string };
  start: number;
  frame: number;
  fps: number;
}) => {
  const active = frame >= start + 4;
  const pop = spring({ frame: frame - start, fps, config: { damping: 12, mass: 0.5 } });
  const isPM = stage.group === 'product-manager';
  const tint = isPM ? theme.color.accent : gold;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: active ? tint : theme.color.codeBg,
          border: `2px solid ${active ? tint : theme.color.borderStrong}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${0.7 + (active ? pop : 0) * 0.3})`,
          boxShadow: active ? `0 0 18px ${tint}66` : 'none',
          transition: 'none',
        }}
      >
        {active && <span style={{ color: theme.color.codeBg, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </div>
      <span
        style={{
          marginTop: 14,
          fontFamily: theme.font.mono,
          fontSize: theme.type.code,
          fontWeight: 700,
          color: active ? theme.color.text : theme.color.textFaint,
        }}
      >
        {stage.id}
      </span>
      <span
        style={{
          marginTop: 6,
          fontFamily: theme.font.mono,
          fontSize: 14,
          color: active ? theme.color.successDim : 'transparent',
          letterSpacing: 0.3,
        }}
      >
        sensors·eval ✓
      </span>
    </div>
  );
};

const Connector = ({ start, frame }: { start: number; frame: number }) => {
  const fill = interpolate(frame, [start, start + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        flex: 1,
        height: 3,
        margin: '0 10px',
        marginBottom: 52, // align with node centers (offset for labels below)
        background: theme.color.border,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${fill * 100}%`,
          background: `linear-gradient(90deg, ${theme.color.accent}, ${gold})`,
          boxShadow: fill > 0 ? `0 0 8px ${gold}88` : 'none',
        }}
      />
    </div>
  );
};

const EndCap = ({
  label,
  start,
  frame,
  fps,
  color = theme.color.textDim,
  spring: springVal,
  active = true,
}: {
  label: string;
  start: number;
  frame: number;
  fps: number;
  color?: string;
  spring?: number;
  active?: boolean;
}) => {
  const op = interpolate(frame, [start, start + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = springVal ?? spring({ frame: frame - start, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: op,
        transform: `scale(${0.8 + s * 0.2})`,
        marginBottom: 52,
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          borderRadius: theme.radius.md,
          background: active ? `${color}18` : theme.color.surface,
          border: `1.5px solid ${active ? color : theme.color.border}`,
          fontFamily: theme.font.mono,
          fontSize: theme.type.codeSmall,
          fontWeight: 700,
          color: active ? color : theme.color.textFaint,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
};

const LegendDot = ({ color, text }: { color: string; text: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
    <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
    {text}
  </span>
);

const Dotsep = () => (
  <span style={{ color: theme.color.textFaint, margin: '0 16px' }}>·</span>
);
