import { Composition } from 'remotion';
import { Video, FPS, WIDTH, HEIGHT, DURATION_FRAMES } from './Video';

export const Root = () => (
  <Composition
    id="Demo"
    component={Video}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
