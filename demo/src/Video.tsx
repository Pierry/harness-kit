import { AbsoluteFill, Sequence } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { theme } from './theme';
import { Intro } from './scenes/Intro';
import { Pipeline } from './scenes/Pipeline';
import { Install } from './scenes/Install';
import { Session } from './scenes/Session';
import { Outro } from './scenes/Outro';

loadInter();
loadMono();

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const scenes = [
  { id: 'intro',    component: Intro,    duration: 5 * FPS  },  // 0   - 150
  { id: 'pipeline', component: Pipeline, duration: 12 * FPS },  // 150 - 510
  { id: 'install',  component: Install,  duration: 14 * FPS },  // 510 - 930
  { id: 'session',  component: Session,  duration: 22 * FPS },  // 930 - 1590
  { id: 'outro',    component: Outro,    duration: 7 * FPS  },  // 1590 - 1800
];

export const DURATION_FRAMES = scenes.reduce((acc, s) => acc + s.duration, 0);

export const Video = () => {
  let offset = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.bg, fontFamily: theme.font.body }}>
      <BackgroundGrid />
      {scenes.map((scene) => {
        const Comp = scene.component;
        const from = offset;
        offset += scene.duration;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.duration}>
            <Comp />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const BackgroundGrid = () => (
  <AbsoluteFill
    style={{
      backgroundImage: `
        radial-gradient(ellipse 80% 60% at 70% 30%, ${theme.color.accent}10, transparent 70%),
        radial-gradient(ellipse 60% 50% at 20% 80%, ${theme.color.successDim}08, transparent 70%),
        linear-gradient(${theme.color.border}30 1px, transparent 1px),
        linear-gradient(90deg, ${theme.color.border}30 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 64px 64px, 64px 64px',
    }}
  />
);
