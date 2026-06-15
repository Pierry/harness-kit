import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { theme } from './theme';
import { Intro } from './scenes/Intro';
import { Pipeline } from './scenes/Pipeline';
import { Agents } from './scenes/Agents';
import { Skills } from './scenes/Skills';
import { Install } from './scenes/Install';
import { StatusBarExplain } from './scenes/StatusBarExplain';
import { DynamicStatusBar } from './scenes/DynamicStatusBar';
import { CommandPRD } from './scenes/CommandPRD';
import { CommandPRP } from './scenes/CommandPRP';
import { CommandPlan } from './scenes/CommandPlan';
import { CommandDev } from './scenes/CommandDev';
import { CommandTest } from './scenes/CommandTest';
import { CommandPR } from './scenes/CommandPR';
import { SensorsEvalsMatrix } from './scenes/SensorsEvalsMatrix';
import { Summary } from './scenes/Summary';
import { Resume } from './scenes/Resume';
import { Anatomy } from './scenes/Anatomy';
import { Outro } from './scenes/Outro';

loadInter();
loadMono();

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

type SceneSpec = {
  id: string;
  component: React.ComponentType;
  duration: number;
  status: { skill: string; stage: string; next: string } | null;
};

const s = (sec: number) => sec * FPS;

export const scenes: SceneSpec[] = [
  { id: 'intro',    component: Intro,             duration: s(4),  status: null },
  { id: 'pipeline', component: Pipeline,          duration: s(7),  status: { skill: ',', stage: 'overview', next: ',' } },
  { id: 'agents',   component: Agents,            duration: s(6),  status: { skill: 'AGENTS.md', stage: 'registry', next: 'product-manager · staff-software-engineer' } },
  { id: 'skills',   component: Skills,            duration: s(6),  status: { skill: 'agent skills', stage: 'area + role', next: 'loaded per stage' } },
  { id: 'install',  component: Install,           duration: s(8),  status: { skill: 'installer', stage: 'install', next: 'restart claude code' } },
  { id: 'sb',       component: StatusBarExplain,  duration: s(5),  status: { skill: ',', stage: 'idle', next: '/product-manager:run · /sse:run · /pipeline:continue' } },
  { id: 'sbdyn',    component: DynamicStatusBar,  duration: s(9),  status: { skill: 'status bar', stage: 'live shape · live state', next: 'reflects every action' } },
  { id: 'prd',      component: CommandPRD,        duration: s(10), status: { skill: 'product-manager:prd',  stage: 'prd drafting',  next: '/product-manager:prd  →  approve' } },
  { id: 'prp',      component: CommandPRP,        duration: s(10), status: { skill: 'product-manager:prp',  stage: 'prp drafting',  next: '/product-manager:prp  →  approve' } },
  { id: 'plan',     component: CommandPlan,       duration: s(8),  status: { skill: 'sse:plan',             stage: 'plan drafting', next: '/sse:plan  →  approve' } },
  { id: 'dev',      component: CommandDev,        duration: s(8),  status: { skill: 'sse:dev (backend)',    stage: 'dev running',   next: '/sse:dev  →  approve' } },
  { id: 'test',     component: CommandTest,       duration: s(5),  status: { skill: 'sse:test',             stage: 'test running',  next: '/sse:test  →  approve' } },
  { id: 'pr',       component: CommandPR,         duration: s(7),  status: { skill: 'sse:pr + pr-monitor',  stage: 'pr opening',    next: 'auto-watch PR · 3min → 30min cap' } },
  { id: 'matrix',   component: SensorsEvalsMatrix,duration: s(7),  status: { skill: 'gates', stage: 'sensors + evals per stage', next: 'pass/fail + score ≥ 8.0' } },
  { id: 'summary',  component: Summary,           duration: s(10), status: { skill: 'pipeline complete',    stage: 'summary',       next: 'every sensor · eval · guide named' } },
  { id: 'resume',   component: Resume,            duration: s(8),  status: { skill: 'pipeline:continue',    stage: 'resume',        next: 'next pending stage' } },
  { id: 'anatomy',  component: Anatomy,           duration: s(8),  status: { skill: 'anatomy of a stage',   stage: 'guide · sensor · eval · refs', next: 'every stage runs this loop' } },
  { id: 'outro',    component: Outro,             duration: s(5),  status: null },
];

export const DURATION_FRAMES = scenes.reduce((acc, x) => acc + x.duration, 0);

export const Video = () => {
  let offset = 0;
  const ranges: { from: number; to: number; status: SceneSpec['status'] }[] = [];
  scenes.forEach((sc) => {
    ranges.push({ from: offset, to: offset + sc.duration, status: sc.status });
    offset += sc.duration;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.bg, fontFamily: theme.font.body }}>
      <BackgroundGrid />
      {(() => {
        let off = 0;
        return scenes.map((scene) => {
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
      <FooterStatusBar ranges={ranges} />
    </AbsoluteFill>
  );
};

const FooterStatusBar = ({
  ranges,
}: {
  ranges: { from: number; to: number; status: SceneSpec['status'] }[];
}) => {
  const frame = useCurrentFrame();
  const active = ranges.find((r) => frame >= r.from && frame < r.to);
  if (!active?.status) return null;
  const { skill, stage, next } = active.status;
  const elapsed = frame - active.from;
  const opacity = interpolate(elapsed, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        bottom: 36,
        padding: '14px 24px',
        background: `${theme.color.surface}f0`,
        backdropFilter: 'blur(8px)',
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.color.borderStrong}`,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        fontFamily: theme.font.mono,
        fontSize: 18,
        opacity,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: theme.color.accent,
          boxShadow: `0 0 12px ${theme.color.accent}`,
        }}
      />
      <Label>status bar</Label>
      <Pill label="skill" value={skill} accent />
      <Pill label="stage" value={stage} />
      <Pill label="next" value={next} dim />
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: theme.color.textFaint, letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>
    {children}
  </span>
);

const Pill = ({
  label,
  value,
  accent,
  dim,
}: {
  label: string;
  value: string;
  accent?: boolean;
  dim?: boolean;
}) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span style={{ color: theme.color.textFaint, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>
      {label}
    </span>
    <span
      style={{
        color: accent ? theme.color.accent : dim ? theme.color.textDim : theme.color.text,
        fontWeight: accent ? 600 : 400,
      }}
    >
      {value}
    </span>
  </span>
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
