import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import type { ChildProcess } from 'node:child_process';
import { Engine, STAGES, type PipelineState, type Stage } from './engine.js';
import { C, stageColor, glyph } from './theme.js';
import { Header } from './components/Header.js';
import { StageRail } from './components/StageRail.js';
import { StageDetail } from './components/StageDetail.js';
import { ArtifactPane } from './components/ArtifactPane.js';
import { GateModal } from './components/GateModal.js';
import { FeatureList } from './components/FeatureList.js';

export function App({ engine, idea }: { engine: Engine; idea: string | null }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();

  const [rev, setRev] = useState(0); // bump to recompute disk-derived data
  const [view, setView] = useState<'list' | 'feature'>('list');
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [featCursor, setFeatCursor] = useState(0);

  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState<string | null>(null);
  const [tail, setTail] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<'rail' | 'reader'>('rail');
  const [scroll, setScroll] = useState(0);
  const child = useRef<ChildProcess | null>(null);

  const bump = () => setRev((r) => r + 1);

  useEffect(() => {
    bump();
    const stop = engine.watch(bump);
    // Poll as a safety net: fsWatch misses events on some platforms / over
    // network mounts, so a 1s tick guarantees the phases advance on screen
    // even when the pipeline is driven by a separate Claude session.
    const tick = setInterval(bump, 1000);
    return () => { stop(); clearInterval(tick); };
  }, [engine]);

  const features = useMemo(() => engine.listFeatures(), [engine, rev]);
  const activeState = useMemo(() => engine.readState(), [engine, rev]);

  // The pipeline state for the feature being viewed: live state if it's the
  // active feature, otherwise synthesized from its artifacts on disk.
  const isActive = !!featureId && featureId === activeState?.feature_id;
  const state: PipelineState | null = useMemo(() => {
    if (!featureId) return null;
    if (isActive && activeState) return activeState;
    const stages = engine.deriveStages(featureId);
    const current = STAGES.find((s) => stages[s.key] !== 'approved')?.key ?? null;
    return {
      feature_id: featureId,
      pipeline: STAGES.map((s) => s.key),
      stages,
      current,
      intent: 'archived',
    };
  }, [engine, featureId, isActive, activeState]);

  const stages = useMemo(() => engine.stagesInPlay(state), [engine, state]);

  useEffect(() => setCursor((c) => Math.max(0, Math.min(c, stages.length - 1))), [stages.length]);
  useEffect(() => setFeatCursor((c) => Math.max(0, Math.min(c, features.length - 1))), [features.length]);
  useEffect(() => setScroll(0), [cursor, running, featureId]);

  const gate = useMemo(() => {
    if (!isActive) return null; // gates only apply to the live feature
    const st = (k: string) => state?.stages?.[k] ?? 'pending';
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (dismissed.has(s.key)) continue;
      const next = stages[i + 1];
      if (s.gateAfter && st(s.key) === 'approved' && next && st(next.key) === 'pending') {
        return { key: s.key, next, title: 'GATE 1 — approve direction',
          subtitle: `PRD is approved. Approve the direction to continue to ${next.label.toLowerCase()}.`,
          unknowns: engine.readUnknowns(featureId) };
      }
      if (s.gateBefore && st(s.key) === 'pending') {
        const prev = stages[i - 1];
        if (!prev || st(prev.key) === 'approved') {
          return { key: s.key, next: s, title: 'GATE 2 — approve the PR',
            subtitle: 'Opening a PR is outward-facing. Approve to run the pr stage.', unknowns: [] as string[] };
        }
      }
    }
    return null;
  }, [isActive, stages, state, dismissed, engine, featureId]);

  function openFeature(id: string) {
    setFeatureId(id);
    setView('feature');
    setCursor(0);
    setFocus('rail');
    setDismissed(new Set());
  }

  function run(stage: Stage) {
    if (running || !isActive) return;
    setTail(`$ claude -p "${stage.cmd}"\n`);
    setRunning(stage.key);
    engine.setStage(stage.key, 'drafting');
    child.current = engine.runStage(stage, idea,
      (chunk) => setTail((t) => (t + chunk).slice(-8000)),
      (code) => { setRunning(null); child.current = null; setTail((t) => t + `\n[exit ${code ?? '?'}]\n`); bump(); });
  }

  const selected = stages[cursor];
  const relPath = selected ? engine.artifactPath(selected, featureId)?.replace(engine.target + '/', '') : null;
  const paneBody = running ? tail : selected ? engine.readArtifact(selected, featureId) : null;
  const detail = useMemo(
    () => (view === 'feature' && selected ? engine.stageDetail(selected, featureId) : null),
    [engine, selected, featureId, view, rev],
  );
  const showDetail = !!detail && !running;
  const scores = useMemo(() => {
    if (view !== 'feature') return {};
    const out: Record<string, number | undefined> = {};
    for (const s of stages) out[s.key] = engine.stageDetail(s, featureId).score;
    return out;
  }, [engine, stages, featureId, view, rev]);
  const avgScore = useMemo(() => {
    const v = Object.values(scores).filter((n): n is number => n != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [scores]);
  const rows = Math.max(6, (stdout?.rows ?? 24) - (gate ? 14 : 5) - (showDetail ? 7 : 0));
  const lineCount = (paneBody ?? '').split('\n').length;
  const maxScroll = Math.max(0, lineCount - rows);
  const clamp = (n: number) => Math.max(0, Math.min(n, maxScroll));

  useInput(
    (input, key) => {
      if (input === 'q' || (key.ctrl && input === 'c')) {
        child.current?.kill();
        exit();
        return;
      }
      if (input === 'r') { bump(); return; }

      if (view === 'list') {
        if (key.upArrow || input === 'k') setFeatCursor((c) => Math.max(0, c - 1));
        else if (key.downArrow || input === 'j') setFeatCursor((c) => Math.min(features.length - 1, c + 1));
        else if (key.return && features[featCursor]) openFeature(features[featCursor].id);
        return;
      }

      // feature view
      if (key.escape || key.leftArrow || input === 'h' || key.backspace) { setView('list'); return; }
      if (key.tab) { setFocus((f) => (f === 'rail' ? 'reader' : 'rail')); return; }
      if (gate && input === 'a') { setDismissed((d) => new Set(d).add(gate.key)); run(gate.next); return; }
      if (gate && input === 'x') { setDismissed((d) => new Set(d).add(gate.key)); return; }
      if (focus === 'reader') {
        if (key.downArrow || input === 'j') setScroll((s) => clamp(s + 1));
        else if (key.upArrow || input === 'k') setScroll((s) => clamp(s - 1));
        else if (input === ' ' || key.pageDown) setScroll((s) => clamp(s + rows));
        else if (input === 'b' || key.pageUp) setScroll((s) => clamp(s - rows));
        else if (input === 'g') setScroll(0);
        else if (input === 'G') setScroll(maxScroll);
        return;
      }
      // rail focus
      if (key.upArrow || input === 'k') setCursor((c) => Math.max(0, c - 1));
      else if (key.downArrow || input === 'j') setCursor((c) => Math.min(stages.length - 1, c + 1));
      else if (key.return) run(stages[cursor]);
      else if (input === 'm' && isActive) {
        const s = stages[cursor];
        const cur = state?.stages?.[s.key] ?? 'pending';
        engine.setStage(s.key, cur === 'approved' ? 'pending' : 'approved');
        bump();
      }
    },
    { isActive: isRawModeSupported },
  );

  // ---- LIST VIEW ----
  if (view === 'list') {
    const activeStages = engine.stagesInPlay(activeState);
    return (
      <Box flexDirection="column">
        <Box paddingX={1} justifyContent="space-between">
          <Text bold color={C.accent}>harness-kit cockpit</Text>
          <Text color={C.muted}>{engine.target.split('/').pop()}</Text>
        </Box>
        {activeState?.feature_id && (
          <Box paddingX={1} flexDirection="column" marginBottom={1}>
            <Text color={C.muted}>
              active run: <Text color="white">{activeState.feature_id}</Text>
              {activeState.intent ? `  ·  ${activeState.intent}` : ''}
            </Text>
            <Box>
              {activeStages.map((s, i) => {
                const st = activeState.stages?.[s.key] ?? 'pending';
                return (
                  <React.Fragment key={s.key}>
                    {i > 0 && <Text color={C.muted}> ─ </Text>}
                    <Text bold color={stageColor[st]}>
                      {glyph[st]} {s.label}
                    </Text>
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        )}
        <FeatureList features={features} cursor={featCursor} />
        <Box paddingX={1}>
          <Text color={C.muted}>
            jk move · enter open feature · r refresh · q quit
            {!isRawModeSupported && '   (no TTY: read-only)'}
          </Text>
        </Box>
      </Box>
    );
  }

  // ---- FEATURE VIEW ----
  const paneTitle = running ? `running: ${running}`
    : selected ? `${selected.label} — ${relPath ?? '(no file yet)'}` : 'artifact';
  const hint = gate ? 'a approve · x hold · tab read · jk scroll · esc back'
    : focus === 'reader' ? 'READER · jk/space/b scroll · g/G top·end · tab rail · esc back'
    : `jk move · enter run${isActive ? ' · m mark done' : ''} · tab read · esc back · q quit`;

  return (
    <Box flexDirection="column">
      <Header stages={stages} state={state} featureId={featureId} avgScore={avgScore} />
      {!isActive && (
        <Box paddingX={1}><Text color={C.muted}>archived feature — read-only (esc for the list)</Text></Box>
      )}
      <Box>
        <StageRail stages={stages} state={state} cursor={cursor} running={running} focused={focus === 'rail'} scores={scores} />
        <ArtifactPane title={paneTitle} body={paneBody} rows={rows} tail={!!running} scroll={scroll} focused={focus === 'reader'} />
      </Box>
      {showDetail && selected && (
        <StageDetail stage={selected} state={state?.stages?.[selected.key] ?? 'pending'} detail={detail!} />
      )}
      {gate && <GateModal title={gate.title} subtitle={gate.subtitle} unknowns={gate.unknowns} />}
      <Box paddingX={1}>
        <Text color={C.muted}>{hint}{!isRawModeSupported && '   (no TTY: read-only)'}</Text>
      </Box>
    </Box>
  );
}
