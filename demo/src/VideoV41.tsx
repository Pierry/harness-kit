import { AbsoluteFill, Sequence } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { theme } from './theme';
import { Title } from './v41/Title';
import { ThreeWays } from './v41/ThreeWays';
import { SddLoop } from './v41/SddLoop';
import { BasedOn } from './v41/BasedOn';
import { ContextTools } from './v41/ContextTools';
import { Install } from './v41/Install';
import { Agents } from './v41/Agents';
import { Outro } from './v41/Outro';

loadInter();
loadMono();

export const V41_FPS = 30;
export const V41_WIDTH = 1920;
export const V41_HEIGHT = 1080;

const s = (sec: number) => sec * V41_FPS;

type Scene = { id: string; component: React.ComponentType; duration: number };

export const v41Scenes: Scene[] = [
  { id: 'title',    component: Title,        duration: s(7) },
  { id: 'three',    component: ThreeWays,    duration: s(13) },
  { id: 'sdd',      component: SddLoop,      duration: s(16) },
  { id: 'based',    component: BasedOn,      duration: s(6) },
  { id: 'context',  component: ContextTools, duration: s(13) },
  { id: 'install',  component: Install,      duration: s(9) },
  { id: 'agents',   component: Agents,       duration: s(14) },
  { id: 'outro',    component: Outro,        duration: s(6) },
];

export const V41_DURATION_FRAMES = v41Scenes.reduce((acc, x) => acc + x.duration, 0);

export const VideoV41 = () => (
  <AbsoluteFill style={{ backgroundColor: theme.color.bg, fontFamily: theme.font.body }}>
    <BackgroundGrid />
    {(() => {
      let off = 0;
      return v41Scenes.map((scene) => {
        const Comp = scene.component;
        const from = off;
        off += scene.duration;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={scene.duration}>
            <Comp />
          </Sequence>
        );
      });
    })()}
  </AbsoluteFill>
);

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
