import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';

export const Install = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const termOpacity = interpolate(frame, [20, 44], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [220, 240], [1, 0], { extrapolateRight: 'clamp' });

  const promptColor = theme.color.success;

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
        install in seconds. <span style={{ color: theme.color.text }}>any repo</span>.
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', opacity: termOpacity }}>
        <Terminal title="~/your-repo">
          <Line>
            <span style={{ color: promptColor }}>$</span>{' '}
            <TypingText text="npm i -g @pieerry/harness-kit" startFrame={40} cps={36} />
          </Line>
          <Line>
            <span style={{ color: promptColor }}>$</span>{' '}
            <TypingText text="hk install" startFrame={95} cps={36} />
          </Line>
          <Output start={130}>
            harness-kit v4.1.0 installing at /your-repo
          </Output>
          <Output start={150} dim>
            {'  '}optional: repomix not found · /context:pack disabled
          </Output>
          <Output start={166} dim>
            {'  '}optional: graphify not found · /context:graph disabled
          </Output>
          <Output start={182}>
            done. restart Claude Code to load.
          </Output>
          <Output start={198} accent>
            {'  '}/sse:plan · :dev · :test · :pr · :run · :sdd
          </Output>
          <Output start={212} accent>
            {'  '}/context:pack · :graph
          </Output>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

const Line = ({ children }: { children: React.ReactNode }) => (
  <div style={{ marginBottom: 10 }}>{children}</div>
);

const Output = ({ start, children, dim, accent }: { start: number; children: React.ReactNode; dim?: boolean; accent?: boolean }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        opacity,
        marginBottom: 6,
        color: accent ? theme.color.accent : dim ? theme.color.textFaint : theme.color.text,
        fontFamily: theme.font.mono,
        fontSize: theme.type.codeSmall,
      }}
    >
      {children}
    </div>
  );
};
