import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';
import { SectionLabel } from './SectionLabel';

const DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
const BODY = '"Hanken Grotesk", system-ui, sans-serif';
const gold = theme.color.warning;

// 05 · how to use, write the brief on the site, copy it, paste /golden-path into
// Claude Code, watch the six gated stages run to a merged PR.

const briefRows = [
  { tag: 'IF WE',   text: 'add one-tap payment retry' },
  { tag: 'THEN',    text: 'checkout completion rises 5 points' },
  { tag: 'BECAUSE', text: 'most first-attempt declines are transient' },
];

const stages = [
  { id: 'prd',  desc: 'problem + hypothesis framed', pm: true },
  { id: 'prp',  desc: 'engineering spec written',    pm: true },
  { id: 'plan', desc: 'approach approved',           pm: false },
  { id: 'dev',  desc: 'branch · 4 commits',          pm: false },
  { id: 'test', desc: 'suite green',                 pm: false },
  { id: 'pr',   desc: 'opened · merged',             pm: false },
];

const COPY_AT = 150;
const TYPE_AT = 182;
const TICK_AT = 250;
const TICK_GAP = 20;
const lastTick = TICK_AT + (stages.length - 1) * TICK_GAP;

export const UseIt = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [10, 32], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [420, 446], [1, 0], { extrapolateRight: 'clamp' });

  const copied = frame >= COPY_AT + 8;
  const copyPulse = spring({ frame: frame - COPY_AT, fps, config: { damping: 11, mass: 0.5 } });
  const pasteGlow = interpolate(frame, [COPY_AT + 10, TYPE_AT], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, justifyContent: 'center', alignItems: 'center', opacity: exit }}>
      <div style={{ marginBottom: 30 }}>
        <SectionLabel n="06" label="how to use" />
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 30, width: '100%', maxWidth: 1680, opacity: enter }}>
        {/* LEFT, the brief site */}
        <div style={{ flex: '1 1 0', display: 'flex' }}>
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: theme.color.surface,
              border: `1px solid ${theme.color.borderStrong}`,
              borderRadius: theme.radius.lg,
              padding: 30,
              boxShadow: '0 24px 70px rgba(0,0,0,.45)',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${gold}66, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, letterSpacing: -0.5 }}>
                harness<span style={{ color: gold }}>-</span>kit
              </span>
              <span style={{ fontFamily: theme.font.mono, fontSize: 14, color: theme.color.textFaint }}>idea brief</span>
            </div>

            <Field label="Squad" start={30} frame={frame} fps={fps}>checkout</Field>
            <Field label="Problem" start={48} frame={frame} fps={fps}>
              Returning guests abandon checkout when a card is declined once, no retry, just an error. ~8% of attempts, ~R$120k/mo lost.
            </Field>

            {/* hypothesis builder */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 16, color: theme.color.text, marginBottom: 8 }}>Hypothesis</div>
              <div style={{ position: 'relative', paddingLeft: 16 }}>
                <div style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, borderRadius: 3, background: `linear-gradient(180deg, ${theme.color.accent}, ${gold})` }} />
                {briefRows.map((r, i) => {
                  const st = 70 + i * 16;
                  const op = interpolate(frame, [st, st + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  const x = spring({ frame: frame - st, fps, config: { damping: 18 } });
                  return (
                    <div key={r.tag} style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '7px 0', opacity: op, transform: `translateX(${(1 - x) * 16}px)` }}>
                      <span style={{ fontFamily: theme.font.mono, fontSize: 12, fontWeight: 700, letterSpacing: 1, color: theme.color.accent, minWidth: 84 }}>{r.tag}</span>
                      <span style={{ fontFamily: BODY, fontSize: 16, color: theme.color.textDim }}>{r.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* copy button */}
            <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  fontFamily: theme.font.mono, fontSize: 15, fontWeight: 700,
                  color: copied ? '#052e22' : '#1a1205',
                  background: copied
                    ? `linear-gradient(100deg, ${theme.color.success}, ${theme.color.successDim})`
                    : `linear-gradient(100deg, ${gold}, ${theme.color.warning})`,
                  padding: '12px 24px', borderRadius: theme.radius.sm,
                  transform: `scale(${frame >= COPY_AT ? 1 + copyPulse * 0.06 : 1})`,
                  boxShadow: `0 8px 24px ${(copied ? theme.color.success : gold)}33`,
                }}
              >
                {copied ? 'Copied ✓' : 'Copy brief'}
              </div>
              <span style={{ fontFamily: theme.font.mono, fontSize: 13, color: theme.color.textFaint }}>
                {copied ? 'now paste it →' : 'ready'}
              </span>
            </div>
          </div>
        </div>

        {/* HANDOFF arrow */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 40 }}>
          <div style={{ fontSize: 32, color: gold, opacity: 0.3 + pasteGlow * 0.7, transform: `translateX(${pasteGlow * 4}px)` }}>→</div>
        </div>

        {/* RIGHT, claude code terminal */}
        <div style={{ flex: '1 1 0', display: 'flex' }}>
          <Terminal title="claude code">
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: gold }}>{'>'}</span>{' '}
              <TypingText text="/golden-path" startFrame={TYPE_AT} cps={26} style={{ color: theme.color.text }} />
            </div>

            <Ctx start={TYPE_AT + 28} frame={frame}>{'  '}Squad: checkout · Stage: Planning Review</Ctx>
            <Ctx start={TYPE_AT + 40} frame={frame}>{'  '}Problem: guests lose the cart on a one-off decline</Ctx>
            <Ctx start={TYPE_AT + 52} frame={frame}>{'  '}Hypothesis: 1-tap retry → +5pts completion</Ctx>

            <div style={{ height: 14 }} />

            {stages.map((s, i) => (
              <Tick key={s.id} stage={s} start={TICK_AT + i * TICK_GAP} frame={frame} fps={fps} />
            ))}

            <div style={{ height: 12 }} />
            <Final start={lastTick + 22} frame={frame} />
          </Terminal>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Field = ({ label, start, frame, fps, children }: { label: string; start: number; frame: number; fps: number; children: React.ReactNode }) => {
  const op = interpolate(frame, [start, start + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = spring({ frame: frame - start, fps, config: { damping: 18 } });
  return (
    <div style={{ marginBottom: 16, opacity: op, transform: `translateY(${(1 - y) * 10}px)` }}>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 16, color: theme.color.text, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: BODY, fontSize: 16, color: theme.color.textDim, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
};

const Ctx = ({ start, frame, children }: { start: number; frame: number; children: React.ReactNode }) => {
  const op = interpolate(frame, [start, start + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, fontFamily: theme.font.mono, fontSize: theme.type.codeSmall, color: theme.color.textFaint, marginBottom: 4 }}>
      {children}
    </div>
  );
};

const Tick = ({ stage, start, frame, fps }: { stage: { id: string; desc: string; pm: boolean }; start: number; frame: number; fps: number }) => {
  const op = interpolate(frame, [start, start + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = spring({ frame: frame - start, fps, config: { damping: 18 } });
  const tint = stage.pm ? theme.color.accent : gold;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 5, opacity: op, transform: `translateX(${(1 - x) * 14}px)`, fontFamily: theme.font.mono, fontSize: theme.type.codeSmall }}>
      <span style={{ color: theme.color.success, fontWeight: 700 }}>✓</span>
      <span style={{ color: tint, fontWeight: 700, minWidth: 52 }}>{stage.id}</span>
      <span style={{ color: theme.color.textDim }}>{stage.desc}</span>
    </div>
  );
};

const Final = ({ start, frame }: { start: number; frame: number }) => {
  const op = interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, fontFamily: theme.font.mono, fontSize: theme.type.code, fontWeight: 700, color: theme.color.success, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: theme.color.success }} />
      PR #128 · merged
    </div>
  );
};
