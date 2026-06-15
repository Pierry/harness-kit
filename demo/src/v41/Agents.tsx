import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';
import { SectionLabel } from './SectionLabel';

const agents = [
  { at: '@product-manager', desc: 'PRD → PRP', accent: false },
  { at: '@staff-software-engineer', desc: 'plan → dev → test → pr', accent: true },
  { at: '@system-architect', desc: 'System Design Doc → adversarial review', accent: false },
];

export const Agents = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const termOpacity = interpolate(frame, [20, 44], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [350, 384], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, justifyContent: 'center', alignItems: 'center', opacity: exit }}>
      <div style={{ marginBottom: 36 }}>
        <SectionLabel n="03" label="the agents" />
      </div>

      <div style={{ maxWidth: 1500, margin: '0 auto', width: '100%', opacity: termOpacity }}>
        <Terminal title="~/your-repo">
          {/* launch the agents view */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: theme.color.success }}>$</span>{' '}
            <TypingText text="claude agents" startFrame={40} cps={24} />
          </div>
          <Output start={96} dim>
            {'  '}Claude Code · agents view · 3 project agents
          </Output>

          {/* agent roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0 26px' }}>
            {agents.map((a, i) => {
              const start = 114 + i * 22;
              const op = interpolate(frame, [start, start + 18], [0, 1], { extrapolateRight: 'clamp' });
              const y = spring({ frame: frame - start, fps, config: { damping: 18 } });
              return (
                <div
                  key={a.at}
                  style={{
                    opacity: op,
                    transform: `translateX(${(1 - y) * 24}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '12px 18px',
                    borderRadius: theme.radius.md,
                    background: a.accent ? `${theme.color.accent}12` : theme.color.surface,
                    border: `1px solid ${a.accent ? theme.color.accent : theme.color.border}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: theme.font.mono,
                      fontSize: theme.type.code,
                      fontWeight: 700,
                      color: a.accent ? theme.color.accent : theme.color.text,
                    }}
                  >
                    {a.at}
                  </span>
                  <span style={{ color: theme.color.textFaint, fontSize: theme.type.label }}>·</span>
                  <span
                    style={{
                      fontFamily: theme.font.mono,
                      fontSize: theme.type.codeSmall,
                      color: theme.color.textDim,
                    }}
                  >
                    {a.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* mention usage */}
          <Mention start={184} at="@product-manager" text=" draft a PRD for checkout retry" />
          <Output start={242} dim>
            {'  '}→ runs /product-manager:run · sensors + eval gate each stage
          </Output>

          <div style={{ height: 16 }} />

          <Mention start={276} at="@staff-software-engineer" text=" ship it end to end" accent />
          <Output start={334} accent>
            {'  '}→ runs /sse:run · plan → dev → test → pr · auto-watch merge
          </Output>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

const Mention = ({ start, at, text, accent }: { start: number; at: string; text: string; accent?: boolean }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start - 6, start + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ marginBottom: 6, opacity }}>
      <span style={{ color: theme.color.accent }}>{'>'}</span>{' '}
      <span style={{ color: accent ? theme.color.accent : theme.color.accentDim, fontWeight: 700 }}>{at}</span>
      <TypingText text={text} startFrame={start} cps={34} />
    </div>
  );
};

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
