import { Composition } from 'remotion';
import { Video, FPS, WIDTH, HEIGHT, DURATION_FRAMES } from './Video';
import { VideoV41, V41_FPS, V41_WIDTH, V41_HEIGHT, V41_DURATION_FRAMES } from './VideoV41';

export const Root = () => (
  <>
    <Composition
      id="Demo"
      component={Video}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="DemoV41"
      component={VideoV41}
      durationInFrames={V41_DURATION_FRAMES}
      fps={V41_FPS}
      width={V41_WIDTH}
      height={V41_HEIGHT}
    />
  </>
);
