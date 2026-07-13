// Engine: everything the cockpit needs to read and drive the harness-kit pipeline.
// Reads state and artifacts off disk (live), and drives stages by spawning `claude -p`.
// The pipeline.py CLI remains the source of truth for state mutations.
import { readFileSync, existsSync, watch as fsWatch, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export type StageState = 'pending' | 'drafting' | 'approved';

export interface Stage {
  key: string;
  label: string;
  short: string; // fixed 3-char tag for aligned column headers
  desc: string; // one-line purpose, shown in the idle overview
  dir: string; // output dir, relative to target
  cmd: string; // slash command that runs it
  gateAfter?: boolean; // human gate after this stage (approve direction)
  gateBefore?: boolean; // human gate before this stage (approve PR)
}

// Mirrors .claude/scripts/pipeline.py STAGE maps. Keep in sync.
export const STAGES: Stage[] = [
  { key: 'intake', label: 'INTAKE', short: 'itk', desc: 'harvest repo and context', dir: '.claude/runtime/outputs/intake', cmd: '/intake:run' },
  { key: 'prd', label: 'PRD', short: 'prd', desc: 'draft the business spec', dir: '.claude/runtime/outputs/pm/prd', cmd: '/product-manager:prd', gateAfter: true },
  { key: 'prp', label: 'PRP', short: 'prp', desc: 'engineering-ready spec', dir: '.claude/runtime/outputs/pm/prp', cmd: '/product-manager:prp' },
  { key: 'plan', label: 'PLAN', short: 'pln', desc: 'technical plan', dir: '.claude/runtime/outputs/sse/plan', cmd: '/sse:plan' },
  { key: 'dev', label: 'DEV', short: 'dev', desc: 'implement and run gates', dir: '.claude/runtime/outputs/sse/dev', cmd: '/sse:dev' },
  { key: 'test', label: 'TEST', short: 'tst', desc: 'run the test suite', dir: '.claude/runtime/outputs/sse/test', cmd: '/sse:test' },
  { key: 'pr', label: 'PR', short: ' pr', desc: 'open the pull request', dir: '.claude/runtime/outputs/sse/pr', cmd: '/sse:pr', gateBefore: true },
];

export interface PipelineState {
  feature_id: string | null;
  pipeline: string[];
  stages: Record<string, StageState>;
  current: string | null;
  intent: string | null;
  started_at?: string;
  updated_at?: string;
}

export class Engine {
  readonly target: string;
  private readonly stateFile: string;
  private readonly claudeBin: string;

  constructor(target: string) {
    this.target = target;
    this.stateFile = join(target, '.claude', '.pipeline-state.json');
    this.claudeBin = process.env.HK_CLAUDE_BIN || 'claude';
  }

  /** True when this looks like a harness-kit install. */
  isInstalled(): boolean {
    return existsSync(join(this.target, '.claude', 'scripts', 'pipeline.py'));
  }

  readState(): PipelineState | null {
    try {
      return JSON.parse(readFileSync(this.stateFile, 'utf8')) as PipelineState;
    } catch {
      return null;
    }
  }

  /** Stages to show: the state's pipeline if present, else the full canonical order. */
  stagesInPlay(state: PipelineState | null): Stage[] {
    if (state?.pipeline?.length) {
      return STAGES.filter((s) => state.pipeline.includes(s.key));
    }
    return STAGES;
  }

  stageState(state: PipelineState | null, key: string): StageState {
    return state?.stages?.[key] ?? 'pending';
  }

  artifactPath(stage: Stage, featureId: string | null): string | null {
    if (!featureId) return null;
    const p = join(this.target, stage.dir, `${featureId}.md`);
    return existsSync(p) ? p : null;
  }

  readArtifact(stage: Stage, featureId: string | null): string | null {
    const p = this.artifactPath(stage, featureId);
    if (!p) return null;
    try {
      return readFileSync(p, 'utf8');
    } catch {
      return null;
    }
  }

  /** Parse the intake artifact's unknowns list, for the direction gate. */
  readUnknowns(featureId: string | null): string[] {
    const intake = STAGES[0];
    const body = this.readArtifact(intake, featureId);
    if (!body) return [];
    const out: string[] = [];
    const add = (v: string) => {
      const t = v.trim();
      if (t && !/^-+$/.test(t) && !out.includes(t)) out.push(t);
    };
    // Only look inside the YAML frontmatter for the `unknowns:` block.
    const fmBlock = body.match(/^---\n([\s\S]*?)\n---/);
    if (fmBlock) {
      const um = fmBlock[1].match(/unknowns:\s*\n((?:[ \t]*-[ \t]*.+\n?)*)/i);
      if (um) {
        for (const line of um[1].split('\n')) {
          const m = line.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/);
          if (m) add(m[1]);
        }
      }
    }
    // Plus any explicit NEEDS REVIEW markers in the body.
    for (const m of body.matchAll(/NEEDS REVIEW:\s*(.+)/g)) add(m[1]);
    return out;
  }

  /** Watch state file + output dirs; debounced. Returns a stop function. */
  watch(onChange: () => void): () => void {
    const watchers: Array<{ close(): void }> = [];
    let timer: NodeJS.Timeout | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onChange, 120);
    };
    const claudeDir = join(this.target, '.claude');
    for (const dir of [claudeDir, join(claudeDir, 'runtime', 'outputs')]) {
      try {
        if (existsSync(dir)) watchers.push(fsWatch(dir, { recursive: true }, fire));
      } catch {
        /* recursive watch unsupported on some platforms; state-file watch below still fires */
      }
    }
    try {
      if (existsSync(this.stateFile)) watchers.push(fsWatch(this.stateFile, fire));
    } catch {
      /* ignore */
    }
    return () => {
      if (timer) clearTimeout(timer);
      for (const w of watchers) {
        try {
          w.close();
        } catch {
          /* ignore */
        }
      }
    };
  }

  /** Spawn `claude -p "<idea>? <command>"` to run one stage, streaming output. */
  runStage(
    stage: Stage,
    idea: string | null,
    onData: (chunk: string) => void,
    onExit: (code: number | null) => void,
  ): ChildProcess {
    const prompt = stage.key === 'intake' && idea ? `${stage.cmd} ${idea}` : stage.cmd;
    const child = spawn(this.claudeBin, ['-p', prompt], {
      cwd: this.target,
      env: process.env,
    });
    child.stdout?.on('data', (b) => onData(b.toString()));
    child.stderr?.on('data', (b) => onData(b.toString()));
    child.on('error', (e) => onData(`\n[cockpit] failed to spawn ${this.claudeBin}: ${e.message}\n`));
    child.on('close', (code) => onExit(code));
    return child;
  }

  /** Direct state mutation via pipeline.py (source of truth). */
  private pipeline(args: string[]): void {
    spawnSync('python3', [join('.claude', 'scripts', 'pipeline.py'), ...args], {
      cwd: this.target,
    });
  }

  setStage(key: string, st: StageState): void {
    this.pipeline(['set-stage', key, st]);
  }

  reset(): void {
    this.pipeline(['clear']);
  }

  lastModified(): number {
    try {
      return statSync(this.stateFile).mtimeMs;
    } catch {
      return 0;
    }
  }

  // ---- feature-level view ----

  /** Stage states for one feature, derived from its artifacts on disk. */
  deriveStages(featureId: string): Record<string, StageState> {
    const out: Record<string, StageState> = {};
    for (const s of STAGES) {
      const body = this.readArtifact(s, featureId);
      out[s.key] = body == null ? 'pending' : /<!--\s*approved:/.test(body) ? 'approved' : 'drafting';
    }
    // If this is the active feature, live state (drafting/current) wins.
    const st = this.readState();
    if (st?.feature_id === featureId && st.stages) {
      for (const [k, v] of Object.entries(st.stages)) out[k] = v;
    }
    return out;
  }

  /** A readable title: first heading of the PRD (else intake/prp), stripped of prefix. */
  featureTitle(featureId: string): string {
    for (const key of ['prd', 'intake', 'prp']) {
      const s = STAGES.find((x) => x.key === key)!;
      const body = this.readArtifact(s, featureId);
      const m = body?.match(/^#\s+(.+)$/m);
      if (m) return m[1].replace(/^(PRD|Intake|PRP|Dev Summary):\s*/i, '').trim();
    }
    // strip leading YYYY-MM-DD-
    return featureId.replace(/^\d{4}-\d{2}-\d{2}-/, '') || featureId;
  }

  /** Every feature that has at least one artifact, newest first. */
  listFeatures(): Feature[] {
    const seen = new Map<string, number>(); // id -> newest mtime
    for (const s of STAGES) {
      const dir = join(this.target, s.dir);
      let names: string[] = [];
      try {
        names = readdirSync(dir);
      } catch {
        continue;
      }
      for (const n of names) {
        if (!n.endsWith('.md')) continue;
        const id = n.slice(0, -3);
        let mtime = 0;
        try {
          mtime = statSync(join(dir, n)).mtimeMs;
        } catch {
          /* ignore */
        }
        seen.set(id, Math.max(seen.get(id) ?? 0, mtime));
      }
    }
    const active = this.readState()?.feature_id ?? null;
    const feats: Feature[] = [...seen.entries()].map(([id, mtime]) => {
      const stages = this.deriveStages(id);
      let reached = 'pending';
      for (const s of STAGES) if (stages[s.key] !== 'pending') reached = s.key;
      const done = STAGES.every((s) => stages[s.key] === 'approved');
      return { id, title: this.featureTitle(id), stages, reached, done, mtime, active: id === active };
    });
    feats.sort((a, b) => b.mtime - a.mtime);
    return feats;
  }
}

export interface Feature {
  id: string;
  title: string;
  stages: Record<string, StageState>;
  reached: string; // furthest stage key touched
  done: boolean;
  mtime: number;
  active: boolean;
}
