import { useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';

type Props = {
  text: string;
  startFrame: number;
  cps?: number;
  style?: React.CSSProperties;
  cursor?: boolean;
};

export const TypingText: React.FC<Props> = ({ text, startFrame, cps = 32, style, cursor = true }) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const elapsed = Math.max(0, frame - startFrame);
  const charsShown = Math.min(text.length, Math.floor((elapsed / fps) * cps));
  const done = charsShown >= text.length;
  const showCursor = cursor && (!done || Math.floor(frame / 15) % 2 === 0);
  const visible = text.slice(0, charsShown);

  return (
    <span style={style}>
      {visible}
      {showCursor && (
        <span
          style={{
            display: 'inline-block',
            width: '0.6ch',
            background: theme.color.cursor,
            height: '1em',
            verticalAlign: 'text-bottom',
            marginLeft: 2,
            opacity: 0.9,
          }}
        />
      )}
    </span>
  );
};
