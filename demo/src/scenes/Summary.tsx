import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';

type StageBlock = {
  from: number;
  label: string;
  artifact: string;
  rows: { k: string; v: React.ReactNode }[];
};

const BLOCKS: StageBlock[] = [
  {
    from: 30,
    label: 'PRD',
    artifact: 'outputs/prd/2026-05-13-billing-multi-currency.md',
    rows: [
      { k: 'sensors', v: <Pass>prd-structure</Pass> },
      { k: '       ', v: <Pass>prd-acceptance-criteria</Pass> },
      { k: 'eval',    v: <Score>prd-quality 8.6/10</Score> },
      { k: 'guides',  v: <Mono>prd-guidelines.md, writing-style.md, templates/prd.md</Mono> },
      { k: 'refs',    v: <Mono>business-info.md, squads/billing/context.md</Mono> },
    ],
  },
  {
    from: 70,
    label: 'PRP',
    artifact: 'outputs/prp/2026-05-13-billing-multi-currency.md',
    rows: [
      { k: 'sensors', v: <Pass>prp-structure, prp-context-quality, prp-links</Pass> },
      { k: 'eval',    v: <Score>prp-quality 8.4/10, prp-context-readiness 9.0/10</Score> },
      { k: 'guides',  v: <Mono>prp-guidelines.md, templates/prp.md</Mono> },
      { k: 'refs',    v: <Mono>prd/2026-05-13-billing-multi-currency.md</Mono> },
    ],
  },
  {
    from: 110,
    label: 'Plan',
    artifact: 'outputs/plan/2026-05-13-billing-multi-currency.md',
    rows: [
      { k: 'sensors', v: <Pass>plan-structure (problem, files, gates, scope)</Pass> },
      { k: 'eval',    v: <Score>plan-quality 8.3/10</Score> },
      { k: 'guides',  v: <Mono>pipeline.md, coding-style.md, skills/backend/SKILL.md</Mono> },
      { k: 'refs',    v: <Mono>prp/2026-05-13-billing-multi-currency.md, conventions/backend.md</Mono> },
    ],
  },
  {
    from: 150,
    label: 'Dev',
    artifact: 'branch feat/PROJ-123-multi-currency',
    rows: [
      { k: 'changes', v: <Mono>5 files, 3 commits (a1b2c3d, d4e5f6g, h7i8j9k)</Mono> },
      { k: 'sensors', v: <Pass>code-conventions, test-coverage</Pass> },
      { k: 'guides',  v: <Mono>coding-style.md, commit-style.md, skills/backend/SKILL.md</Mono> },
    ],
  },
  {
    from: 185,
    label: 'Test',
    artifact: 'outputs/test/2026-05-13-billing-multi-currency.md',
    rows: [
      { k: 'command', v: <Mono>./mvnw test</Mono> },
      { k: 'result',  v: <Pass>24 passed, 0 failed (12.4s)</Pass> },
    ],
  },
  {
    from: 215,
    label: 'PR',
    artifact: 'github.com/your-org/billing-service/pull/567',
    rows: [
      { k: 'title',  v: <Mono>feat(PROJ-123): timezone-aware deadline check</Mono> },
      { k: 'draft',  v: <Mono>yes</Mono> },
      { k: 'guides', v: <Mono>pr-template.md, commit-style.md</Mono> },
    ],
  },
];

export const Summary = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const termSpring = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const exit = interpolate(frame, [255, 270], [1, 0], { extrapolateRight: 'clamp' });

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
          /sse:run · final summary
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
          Every <span style={{ color: theme.color.accent }}>sensor, eval, guide</span> — named.
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
          No generic "ok" lines. The summary tells you exactly what was checked, scored, and loaded.
        </div>
      </div>

      <div
        style={{
          marginTop: 48,
          marginLeft: 100,
          marginRight: 100,
          flex: 1,
          minHeight: 0,
          transform: `translateY(${(1 - termSpring) * 24}px)`,
          opacity: termSpring,
        }}
      >
        <Terminal title="claude code · pipeline complete">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 20 }}>
            {BLOCKS.map((b, i) => {
              if (frame < b.from) return null;
              const op = interpolate(frame, [b.from, b.from + 12], [0, 1], { extrapolateRight: 'clamp' });
              const slide = interpolate(frame, [b.from, b.from + 12], [12, 0], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ opacity: op, transform: `translateY(${slide}px)`, marginBottom: 12 }}>
                  <div style={{ color: theme.color.text, fontFamily: theme.font.mono, fontWeight: 600 }}>
                    <span style={{ color: theme.color.accent }}>{b.label}:</span>{' '}
                    <span style={{ color: theme.color.textDim }}>{b.artifact}</span>
                  </div>
                  {b.rows.map((r, j) => (
                    <div key={j} style={{ display: 'flex', gap: 16, fontFamily: theme.font.mono, paddingLeft: 28 }}>
                      <span style={{ color: theme.color.textFaint, minWidth: 88 }}>{r.k}:</span>
                      <span>{r.v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.text }}>{children}</span>;
}
function Pass({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.success }}>{children} ok</span>;
}
function Score({ children }: { children: React.ReactNode }) {
  return <span style={{ color: theme.color.warning }}>{children}</span>;
}
