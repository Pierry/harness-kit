import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';
import { Terminal } from '../components/Terminal';
import { TypingText } from '../components/TypingText';
import { SectionLabel } from './SectionLabel';

export const Install = () => {
  const frame = useCurrentFrame();

  const termOpacity = interpolate(frame, [20, 44], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [232, 252], [1, 0], { extrapolateRight: 'clamp' });

  const promptColor = theme.color.accent;

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: exit,
      }}
    >
      <div style={{ marginBottom: 36 }}>
        <SectionLabel n="02" label="how to install" />
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', opacity: termOpacity }}>
        <Terminal title="claude code">
          <Line>
            <span style={{ color: promptColor }}>{'>'}</span>{' '}
            <TypingText text="/plugin marketplace add Pierry/harness-kit" startFrame={40} cps={42} />
          </Line>
          <Output start={92} dim>
            {'  '}added marketplace · harness-kit
          </Output>
          <Line>
            <span style={{ color: promptColor }}>{'>'}</span>{' '}
            <TypingText text="/plugin install harness-kit@harness-kit" startFrame={108} cps={42} />
          </Line>
          <Output start={156} dim>
            {'  '}installed · harness-kit v4.1.0
          </Output>
          <Line>
            <span style={{ color: promptColor }}>{'>'}</span>{' '}
            <TypingText text="/harness-kit:install" startFrame={172} cps={42} />
          </Line>
          <Output start={206}>
            harness-kit v4.1.0 installing at /your-repo
          </Output>
          <Output start={222} accent>
            {'  '}done. restart Claude Code to load.
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
        color: accent ? theme.color.success : dim ? theme.color.textFaint : theme.color.text,
        fontFamily: theme.font.mono,
        fontSize: theme.type.codeSmall,
      }}
    >
      {children}
    </div>
  );
};
