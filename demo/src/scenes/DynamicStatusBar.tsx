import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Step = {
  from: number;
  shape: string[];
  feature: string;
  current: { stage: string; state: 'pending' | 'drafting' | 'approved' };
  prevApproved?: string;
  next: string;
};

const STEPS: Step[] = [
  { from: 0,   shape: [], feature: '',                       current: { stage: 'idle', state: 'pending' }, next: '/product-manager:run · /sse:run · /pipeline:continue' },
  { from: 50,  shape: ['plan', 'dev', 'test', 'pr'], feature: 'starting sse-run', current: { stage: 'plan', state: 'pending' },   next: '/sse:plan' },
  { from: 90,  shape: ['plan', 'dev', 'test', 'pr'], feature: 'billing-multi-currency', current: { stage: 'plan', state: 'drafting' }, next: '/sse:plan' },
  { from: 130, shape: ['plan', 'dev', 'test', 'pr'], feature: 'billing-multi-currency', current: { stage: 'dev', state: 'pending' }, prevApproved: 'plan', next: '/sse:dev' },
  { from: 170, shape: ['plan', 'dev', 'test', 'pr'], feature: 'billing-multi-currency', current: { stage: 'dev', state: 'drafting' }, prevApproved: 'plan', next: '/sse:dev' },
  { from: 210, shape: ['plan', 'dev', 'test', 'pr'], feature: 'billing-multi-currency', current: { stage: 'test', state: 'pending' }, prevApproved: 'dev', next: '/sse:test' },
];

export const DynamicStatusBar = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [250, 270], [1, 0], { extrapolateRight: 'clamp' });

  const active = [...STEPS].reverse().find((s) => frame >= s.from) ?? STEPS[0];

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, paddingBottom: 140, opacity: exit }}>
      <div
        style={{
          marginLeft: 80,
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 20}px)`,
        }}
      >
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          status bar · v3.1
        </div>
        <div
          style={{
            fontFamily: theme.font.display,
            fontSize: theme.type.h1,
            fontWeight: 700,
            color: theme.color.text,
            marginTop: 14,
            letterSpacing: -2,
          }}
        >
          Now <span style={{ color: theme.color.accent }}>dynamic.</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: theme.type.h3,
            color: theme.color.textDim,
            maxWidth: 1400,
            lineHeight: 1.35,
          }}
        >
          Updates the moment you type a slash command. Tracks pipeline shape, current stage, next step, live.
        </div>
      </div>

      <div
        style={{
          marginTop: 64,
          marginLeft: 80,
          marginRight: 80,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <StatusBarMock step={active} />
      </div>

      <div
        style={{
          marginTop: 56,
          marginLeft: 80,
          marginRight: 80,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 22,
        }}
      >
        <ShapeCard label="PM only" shape={['prd', 'prp']} entry={frame > 60 ? 1 : 0} />
        <ShapeCard label="SSE only" shape={['plan', 'dev', 'test', 'pr']} entry={frame > 70 ? 1 : 0} highlight />
        <ShapeCard label="Full pipeline" shape={['prd', 'prp', 'plan', 'dev', 'test', 'pr']} entry={frame > 80 ? 1 : 0} />
      </div>
    </AbsoluteFill>
  );
};

const StatusBarMock = ({ step }: { step: Step }) => {
  const isIdle = step.current.stage === 'idle';
  return (
    <div
      style={{
        padding: '20px 30px',
        background: theme.color.surface,
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.color.borderStrong}`,
        fontFamily: theme.font.mono,
        fontSize: 26,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        minWidth: 1500,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: isIdle ? theme.color.textFaint : theme.color.accent,
          boxShadow: isIdle ? 'none' : `0 0 14px ${theme.color.accent}`,
        }}
      />
      {isIdle ? (
        <>
          <span style={{ color: theme.color.textDim }}>idle</span>
          <Sep />
          <span style={{ color: theme.color.textFaint }}>{step.next}</span>
        </>
      ) : (
        <>
          <span style={{ color: theme.color.text, fontWeight: 600 }}>{step.feature}</span>
          <ShapeBrackets shape={step.shape} current={step.current.stage} approved={collectApproved(step)} />
          {step.prevApproved && (
            <>
              <Sep />
              <span style={{ color: theme.color.success }}>
                {step.prevApproved} approved
              </span>
            </>
          )}
          <Sep />
          <span style={{ color: stateColor(step.current.state) }}>
            {step.current.stage} {step.current.state}
          </span>
          <Sep />
          <span style={{ color: theme.color.textDim }}>next</span>
          <span style={{ color: theme.color.accent }}>{step.next}</span>
        </>
      )}
    </div>
  );
};

const collectApproved = (step: Step): string[] => {
  const out: string[] = [];
  for (const s of step.shape) {
    if (s === step.current.stage) break;
    out.push(s);
  }
  return out;
};

const stateColor = (s: 'pending' | 'drafting' | 'approved') =>
  s === 'approved' ? theme.color.success : s === 'drafting' ? theme.color.warning : theme.color.textDim;

const Sep = () => <span style={{ color: theme.color.textFaint }}>·</span>;

const ShapeBrackets = ({
  shape,
  current,
  approved,
}: {
  shape: string[];
  current: string;
  approved: string[];
}) => (
  <span style={{ color: theme.color.textFaint, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span>[</span>
    {shape.map((s, i) => {
      const isCurrent = s === current;
      const isApproved = approved.includes(s);
      const c = isCurrent ? theme.color.accent : isApproved ? theme.color.success : theme.color.textFaint;
      return (
        <span key={s} style={{ color: c, fontWeight: isCurrent ? 600 : 400 }}>
          {s}
          {i < shape.length - 1 ? <span style={{ color: theme.color.textFaint, fontWeight: 400 }}>+</span> : null}
        </span>
      );
    })}
    <span>]</span>
  </span>
);

const ShapeCard = ({
  label,
  shape,
  entry,
  highlight,
}: {
  label: string;
  shape: string[];
  entry: number;
  highlight?: boolean;
}) => (
  <div
    style={{
      padding: 24,
      background: theme.color.surface,
      borderRadius: theme.radius.md,
      border: `1px solid ${highlight ? theme.color.accent + '60' : theme.color.borderStrong}`,
      opacity: entry,
      transform: `translateY(${(1 - entry) * 20}px)`,
      transition: 'all 0.3s',
    }}
  >
    <div
      style={{
        fontSize: theme.type.label,
        color: highlight ? theme.color.accent : theme.color.textDim,
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      {label}
    </div>
    <div style={{ fontFamily: theme.font.mono, fontSize: 22, color: theme.color.text }}>
      {shape.join(' → ')}
    </div>
  </div>
);
