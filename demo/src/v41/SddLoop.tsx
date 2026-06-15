import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const SddLoop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [420, 460], [1, 0], { extrapolateRight: 'clamp' });

  // iter timeline (frames): 1 starts 60, 2 starts 160, 3 starts 260, pass at 340
  const iterAt = (start: number) => interpolate(frame, [start, start + 18], [0, 1], { extrapolateRight: 'clamp' });
  const iter1 = iterAt(60);
  const iter2 = iterAt(160);
  const iter3 = iterAt(260);
  const passOpacity = interpolate(frame, [340, 370], [0, 1], { extrapolateRight: 'clamp' });

  const predicateOpacity = interpolate(frame, [30, 56], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        opacity: exit,
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          textAlign: 'center',
          marginBottom: 36,
          fontSize: theme.type.h3,
          color: theme.color.textDim,
        }}
      >
        <span style={{ color: theme.color.accent, fontFamily: theme.font.mono }}>/sse:sdd</span>, until the spec is met.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 60,
          margin: '0 auto',
          maxWidth: 1700,
          alignItems: 'center',
        }}
      >
        {/* Left: PRP predicate */}
        <div
          style={{
            opacity: predicateOpacity,
            background: theme.color.surface,
            border: `1px solid ${theme.color.borderStrong}`,
            borderRadius: theme.radius.lg,
            padding: 36,
          }}
        >
          <div style={{ color: theme.color.textFaint, fontSize: theme.type.label, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>
            PRP becomes the spec
          </div>
          <div style={{ color: theme.color.text, fontFamily: theme.font.mono, fontSize: theme.type.codeSmall, lineHeight: 1.6 }}>
            <div style={{ color: theme.color.accent }}># 3) What</div>
            <div style={{ marginLeft: 12, color: theme.color.text }}>Success criteria (verifiable):</div>
            <div style={{ marginLeft: 28, color: theme.color.textDim }}>- bullet</div>
            <div style={{ marginLeft: 28, color: theme.color.textDim }}>- bullet</div>
            <div style={{ marginTop: 16, color: theme.color.accent }}># 6) Validation gates</div>
            <div style={{ marginLeft: 12, color: theme.color.textDim }}>{`$ ./gradlew test`}</div>
            <div style={{ marginLeft: 12, color: theme.color.textDim }}>{`$ npm run e2e`}</div>
          </div>
          <div style={{ marginTop: 22, color: theme.color.textFaint, fontSize: theme.type.label, fontStyle: 'italic' }}>
            pre-flight sensor blocks vague PRPs
          </div>
        </div>

        {/* Right: the loop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <IterRow num={1} opacity={iter1} verdict="FAIL" focus="add missing edge case" />
          <Arrow opacity={interpolate(frame, [140, 158], [0, 1], { extrapolateRight: 'clamp' })} />
          <IterRow num={2} opacity={iter2} verdict="FAIL" focus="validation gate red" />
          <Arrow opacity={interpolate(frame, [240, 258], [0, 1], { extrapolateRight: 'clamp' })} />
          <IterRow num={3} opacity={iter3} verdict="PASS" focus="" />

          <div
            style={{
              opacity: passOpacity,
              marginTop: 18,
              padding: 22,
              borderRadius: theme.radius.md,
              background: `${theme.color.success}10`,
              border: `1px solid ${theme.color.success}`,
              color: theme.color.success,
              fontFamily: theme.font.mono,
              fontSize: theme.type.code,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            spec satisfied · transcript saved · user gates /sse:pr
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const IterRow = ({ num, opacity, verdict, focus }: { num: number; opacity: number; verdict: 'PASS' | 'FAIL'; focus: string }) => {
  const isPass = verdict === 'PASS';
  return (
    <div
      style={{
        opacity,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 1fr 1fr auto',
        alignItems: 'center',
        gap: 18,
        padding: '18px 22px',
        background: theme.color.surface,
        border: `1px solid ${isPass ? theme.color.success : theme.color.borderStrong}`,
        borderRadius: theme.radius.md,
        fontFamily: theme.font.mono,
        fontSize: theme.type.codeSmall,
      }}
    >
      <span style={{ color: theme.color.textFaint, fontSize: theme.type.label }}>iter {num}</span>
      <Stage label="dev" />
      <Stage label="test" />
      <Stage label="eval" sub="fresh session" />
      <span
        style={{
          color: isPass ? theme.color.success : theme.color.warning,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {verdict}
      </span>
      {focus && (
        <div
          style={{
            gridColumn: '2 / span 4',
            marginTop: 8,
            color: theme.color.textFaint,
            fontSize: theme.type.label,
            fontStyle: 'italic',
          }}
        >
          ↳ next focus: {focus}
        </div>
      )}
    </div>
  );
};

const Stage = ({ label, sub }: { label: string; sub?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <span style={{ color: theme.color.text }}>{label}</span>
    {sub && <span style={{ color: theme.color.textFaint, fontSize: 14 }}>{sub}</span>}
  </div>
);

const Arrow = ({ opacity }: { opacity: number }) => (
  <div style={{ opacity, textAlign: 'center', color: theme.color.textFaint, fontSize: 24, lineHeight: 0.5 }}>↓</div>
);
