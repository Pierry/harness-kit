// Engine: everything the cockpit needs to read and drive the harness-kit pipeline.
// Reads state and artifacts off disk (live), and drives stages by spawning `claude -p`.
// The pipeline.py CLI remains the source of truth for state mutations.
import { readFileSync, existsSync, watch as fsWatch, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export type StageState = 'pending' | 'drafting' | 'approved';

/** Flatten one stream-json line into a compact human line for the pane.
 * Returns '' for noise (hooks, init, tool results) to keep the tail readable. */
function formatEvent(line: string): string {
  const s = line.trim();
  if (!s) return '';
  let ev: any;
  try { ev = JSON.parse(s); } catch { return ''; }

  if (ev.type === 'assistant' && ev.message?.content) {
    let out = '';
    for (const c of ev.message.content) {
      if (c.type === 'text' && c.text?.trim()) {
        out += c.text.trim() + '\n';
      } else if (c.type === 'tool_use') {
        const a = c.input ?? {};
        const arg = a.command ?? a.file_path ?? a.path ?? a.pattern ?? a.description ?? '';
        out += `  · ${c.name}${arg ? ' ' + String(arg).split('\n')[0].slice(0, 80) : ''}\n`;
      }
    }
    return out;
  }
  if (ev.type === 'result') {
    const r = (ev.result ?? '').toString().trim();
    return `${r ? r + '\n' : ''}[done · ${ev.subtype ?? ''}]\n`;
  }
  return ''; // system/hook/user tool_result noise
}

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

  /** Spawn `claude -p "<idea>? <command>"` to run one stage, streaming output.
   *
   * Uses `--output-format stream-json --verbose`: plain `-p` prints ONLY the
   * final result at the very end, so the pane would sit frozen for the whole
   * run. stream-json emits an event per turn/tool as it happens, which we
   * flatten into compact human lines so the pane shows live activity. */
  runStage(
    stage: Stage,
    idea: string | null,
    onData: (chunk: string) => void,
    onExit: (code: number | null) => void,
  ): ChildProcess {
    const prompt = stage.key === 'intake' && idea ? `${stage.cmd} ${idea}` : stage.cmd;
    const child = spawn(
      this.claudeBin,
      ['-p', prompt, '--output-format', 'stream-json', '--verbose'],
      {
        cwd: this.target,
        env: process.env,
        // Close child stdin (no TTY, no pipe) so `claude -p` does not wait 3s
        // for stdin data and emit "no stdin data received" warning.
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    // stdout is newline-delimited JSON; buffer partial lines across chunks.
    let buf = '';
    child.stdout?.on('data', (b) => {
      buf += b.toString();
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const out = formatEvent(line);
        if (out) onData(out);
      }
    });
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

  /** Rich per-stage facts, all parsed from disk: eval score, tokens, duration,
   * and the sensor/eval/guide catalog that gates this stage. Everything here
   * is read-only and cheap; the cockpit recomputes it on every refresh. */
  stageDetail(stage: Stage, featureId: string | null): StageDetail {
    const d: StageDetail = { sensors: [], evals: [], guides: [], hasReport: false, hasTrace: false };
    const body = featureId ? this.readArtifact(stage, featureId) : null;

    // Score + approval date from the trailing approval comment.
    if (body) {
      const m = body.match(/<!--\s*approved:\s*([0-9-]+)\s+score=([\d.]+)([^>]*)-->/);
      if (m) {
        d.approvedAt = m[1];
        d.score = parseFloat(m[2]);
        d.readyForHandoff = /ready-for-handoff:\s*true/.test(m[3]);
      }
      const t = body.match(/<!--\s*tokens:[^>]*?in=(\d+)\s+out=(\d+)\s+cache_r=(\d+)/);
      if (t) d.tokens = { in: +t[1], out: +t[2], cacheRead: +t[3] };
    }

    // Duration from phase markers: earliest *.start to latest *.end for this stage.
    let lo = Infinity, hi = 0;
    for (const agent of ['pm', 'sse']) {
      const md = join(this.target, '.claude', 'runtime', 'outputs', agent, '.markers');
      let names: string[] = [];
      try { names = readdirSync(md); } catch { continue; }
      for (const n of names) {
        if (!n.startsWith(`${featureId}.${stage.key}-`)) continue;
        try {
          const ts = JSON.parse(readFileSync(join(md, n), 'utf8')).timestamp;
          const ms = ts ? Date.parse(ts) : NaN;
          if (!Number.isNaN(ms)) { lo = Math.min(lo, ms); hi = Math.max(hi, ms); }
        } catch { /* ignore */ }
      }
    }
    if (hi > lo) d.durationSec = Math.round((hi - lo) / 1000);

    // Real per-run sensor pass/fail from the report run-sensors.sh writes.
    // Report lives at <outputs>/<agent>/reports/<feature>.<stage>.json.
    const reportPath = join(this.target, dirname(stage.dir), 'reports', `${featureId}.${stage.key}.json`);
    let reportStatus: Record<string, SensorStatus> | null = null;
    try {
      const r = JSON.parse(readFileSync(reportPath, 'utf8'));
      reportStatus = {};
      for (const s of r.sensors ?? []) reportStatus[s.name] = s.status === 'fail' ? 'fail' : 'pass';
      d.hasReport = true;
    } catch { /* no report yet */ }

    // Sensor + eval catalog: agent spec files named for this stage. Sensors get
    // their real status from the report when available, else 'configured'.
    const prefix = new RegExp(`^${stage.key}[-.]`);
    for (const agent of ['product-manager', 'staff-software-engineer']) {
      for (const kind of ['sensors', 'evals'] as const) {
        const dir = join(this.target, '.claude', 'agents', agent, kind);
        let names: string[] = [];
        try { names = readdirSync(dir); } catch { continue; }
        for (const n of names) {
          if (!n.endsWith('.md') || !prefix.test(n)) continue;
          const name = n.replace(/\.md$/, '');
          if (kind === 'sensors') {
            if (!d.sensors.some((s) => s.name === name))
              d.sensors.push({ name, status: reportStatus?.[name] ?? 'configured' });
          } else if (!d.evals.includes(name)) {
            d.evals.push(name);
          }
        }
      }
    }
    // Any sensor in the report but not in the catalog (defensive): include it.
    if (reportStatus) {
      for (const [name, status] of Object.entries(reportStatus)) {
        if (!d.sensors.some((s) => s.name === name)) d.sensors.push({ name, status });
      }
    }

    // Guides actually read during this stage's window, from the activity log.
    // Window: this stage's generate.start .. the next stage's generate.start.
    const used = this.guidesUsedInWindow(featureId, stage.key);
    if (used) d.hasTrace = true;
    const catalog = (GUIDE_HINTS[stage.key] ?? []).filter((h) =>
      existsSync(join(this.target, '.claude', 'agents', 'product-manager', 'guides', `${h}.md`)) ||
      existsSync(join(this.target, '.claude', 'agents', 'staff-software-engineer', 'guides', `${h}.md`)),
    );
    const names = new Set<string>(catalog);
    if (used) for (const g of used) names.add(g);
    for (const name of names) d.guides.push({ name, used: used ? used.has(name) : false });
    return d;
  }

  /** Guides read during a stage's run window, from the activity log. Returns a
   * set (possibly empty) when the stage has a start marker + log entries, or
   * null when there is no trace to attribute (fall back to catalog). */
  private guidesUsedInWindow(featureId: string | null, stageKey: string): Set<string> | null {
    if (!featureId) return null;
    // Collect every stage's generate.start time for this feature.
    const starts: { key: string; ms: number }[] = [];
    for (const agent of ['pm', 'sse']) {
      const md = join(this.target, '.claude', 'runtime', 'outputs', agent, '.markers');
      let names: string[] = [];
      try { names = readdirSync(md); } catch { continue; }
      for (const n of names) {
        const m = n.match(new RegExp(`^${featureId}\\.(.+)-generate\\.start$`));
        if (!m) continue;
        try {
          const ms = Date.parse(JSON.parse(readFileSync(join(md, n), 'utf8')).timestamp);
          if (!Number.isNaN(ms)) starts.push({ key: m[1], ms });
        } catch { /* ignore */ }
      }
    }
    starts.sort((a, b) => a.ms - b.ms);
    const idx = starts.findIndex((s) => s.key === stageKey);
    if (idx < 0) return null;
    const lo = starts[idx].ms;
    const hi = idx + 1 < starts.length ? starts[idx + 1].ms : Infinity;

    const logPath = join(this.target, '.claude', 'runtime', 'outputs', '.activity-log.jsonl');
    let lines: string[];
    try { lines = readFileSync(logPath, 'utf8').split('\n'); } catch { return null; }
    const used = new Set<string>();
    let sawAny = false;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        const ms = (e.ts ?? 0) * 1000; // activity.py stores seconds
        if (ms >= lo && ms < hi) {
          sawAny = true;
          if (e.kind === 'guide') used.add(e.name);
        }
      } catch { /* ignore */ }
    }
    return sawAny ? used : null;
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
      const scored = STAGES.map((s) => this.stageDetail(s, id).score).filter(
        (x): x is number => x != null,
      );
      const avgScore = scored.length
        ? scored.reduce((a, b) => a + b, 0) / scored.length
        : undefined;
      return { id, title: this.featureTitle(id), stages, reached, done, mtime, active: id === active, avgScore };
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
  avgScore?: number; // mean eval score across the stages that have one
}

export type SensorStatus = 'pass' | 'fail' | 'configured';

export interface StageDetail {
  score?: number; // eval score out of 10, from the approval comment
  approvedAt?: string; // YYYY-MM-DD
  readyForHandoff?: boolean; // PRP only
  durationSec?: number; // wall time across this stage's phase markers
  tokens?: { in: number; out: number; cacheRead: number };
  // Sensors with real pass/fail from the run report when present, else the
  // configured catalog (status 'configured').
  sensors: { name: string; status: SensorStatus }[];
  evals: string[]; // rubric evals configured for this stage (score covers them)
  // Guides: the configured catalog, each flagged `used` when the agent actually
  // read it during this stage's run window (from the activity log).
  guides: { name: string; used: boolean }[];
  hasReport: boolean; // true when a per-run sensor report exists
  hasTrace: boolean; // true when activity-log entries fell in this stage's window
}

// Which guide files each stage draws on. Catalog mapping (the run does not
// log which guides were actually read), resolved against files that exist.
const GUIDE_HINTS: Record<string, string[]> = {
  intake: ['pipeline'],
  prd: ['prd-guidelines', 'product-guidelines', 'writing-style'],
  prp: ['prp-guidelines', 'writing-style'],
  plan: ['pipeline', 'coding-style'],
  dev: ['coding-style', 'commit-style', 'conventions-override'],
  test: ['coding-style'],
  pr: ['commit-style'],
};
