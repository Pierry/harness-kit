import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';

export const Install = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const termSpring = spring({ frame: frame - 8, fps, config: { damping: 16, mass: 0.8 } });
  const exit = interpolate(frame, [220, 240], [1, 0], { extrapolateRight: 'clamp' });

  const F = {
    cmd1Start: 10,
    cmd1End: 50,
    out1Start: 55,
    out1End: 85,
    cmd2Start: 90,
    cmd2End: 130,
    out2Start: 135,
    out2End: 200,
    cursor: 215,
  };

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, paddingBottom: 140, opacity: exit }}>
      <div
        style={{
          marginLeft: 80,
          opacity: titleOpacity,
        }}
      >
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          install
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
          Two commands. <span style={{ color: theme.color.accent }}>That's it.</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 80,
          marginLeft: 80,
          marginRight: 80,
          flex: 1,
          transform: `translateY(${(1 - termSpring) * 30}px) scale(${0.97 + termSpring * 0.03})`,
          opacity: termSpring,
        }}
      >
        <Terminal title="~/repo · zsh">
          <Line>
            <Prompt /> <TypingText text="npm i -g @pieerry/harness-kit" startFrame={F.cmd1Start} style={{ color: theme.color.text }} cursor={frame < F.cmd1End} />
          </Line>
          {frame >= F.out1Start && (
            <Line dim>
              <span style={{ color: theme.color.textDim }}>
                added 24 packages in 3.1s
              </span>
            </Line>
          )}
          {frame >= F.out1End && (
            <Line>
              <Prompt /> <TypingText text="hk install" startFrame={F.cmd2Start} style={{ color: theme.color.text }} cursor={frame < F.cmd2End} />
            </Line>
          )}
          {frame >= F.out2Start && (
            <>
              <Line>
                <span style={{ color: theme.color.success }}>harness-kit v3.0.0</span> installing at <span style={{ color: theme.color.textDim }}>~/repo</span>
              </Line>
              {frame >= F.out2Start + 14 && <Line dim>writing .claude/plugins/product-manager</Line>}
              {frame >= F.out2Start + 22 && <Line dim>writing .claude/plugins/staff-software-engineer</Line>}
              {frame >= F.out2Start + 30 && <Line dim>writing .claude/hooks/status-line.sh</Line>}
              {frame >= F.out2Start + 38 && <Line dim>writing .claude/settings.json</Line>}
              {frame >= F.out2Start + 50 && (
                <Line>
                  <span style={{ color: theme.color.success }}>done.</span> restart Claude Code to load.
                </Line>
              )}
              {frame >= F.out2Start + 62 && (
                <Line dim>
                  &nbsp;&nbsp;/product-manager:prd | :prp | :run
                </Line>
              )}
              {frame >= F.out2Start + 70 && (
                <Line dim>
                  &nbsp;&nbsp;/sse:plan | :dev | :test | :pr | :run
                </Line>
              )}
            </>
          )}
          {frame >= F.cursor && (
            <Line>
              <Prompt />{' '}
              <span
                style={{
                  display: 'inline-block',
                  width: '0.6ch',
                  background: theme.color.cursor,
                  height: '1em',
                  verticalAlign: 'text-bottom',
                  opacity: Math.floor(frame / 15) % 2 === 0 ? 0.9 : 0,
                }}
              />
            </Line>
          )}
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

const Line: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <div style={{ marginBottom: 10, color: dim ? theme.color.textDim : theme.color.text }}>{children}</div>
);

const Prompt = () => <span style={{ color: theme.color.accent }}>$</span>;
