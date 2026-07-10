import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdin, useStdout } from 'ink';
import type { ChildProcess } from 'node:child_process';
import { Engine, type PipelineState, type Stage } from './engine.js';
import { C } from './theme.js';
import { Header } from './components/Header.js';
import { StageRail } from './components/StageRail.js';
import { ArtifactPane } from './components/ArtifactPane.js';
import { GateModal } from './components/GateModal.js';

export function App({ engine, idea }: { engine: Engine; idea: string | null }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();

  const [state, setState] = useState<PipelineState | null>(() => engine.readState());
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState<string | null>(null);
  const [tail, setTail] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<'rail' | 'reader'>('rail');
  const [scroll, setScroll] = useState(0);
  const child = useRef<ChildProcess | null>(null);

  const stages = useMemo(() => engine.stagesInPlay(state), [engine, state]);
  const featureId = state?.feature_id ?? null;

  useEffect(() => {
    const reload = () => setState(engine.readState());
    reload();
    return engine.watch(reload);
  }, [engine]);

  useEffect(() => {
    setCursor((c) => Math.max(0, Math.min(c, stages.length - 1)));
  }, [stages.length]);

  // Reset scroll when the thing being read changes.
  useEffect(() => setScroll(0), [cursor, running]);

  const gate = useMemo(() => {
    const st = (k: string) => state?.stages?.[k] ?? 'pending';
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (dismissed.has(s.key)) continue;
      const next = stages[i + 1];
      if (s.gateAfter && st(s.key) === 'approved' && next && st(next.key) === 'pending') {
        return {
          key: s.key,
          next,
          title: 'GATE 1 — approve direction',
          subtitle: `PRD is approved. Approve the direction to continue to ${next.label.toLowerCase()}.`,
          unknowns: engine.readUnknowns(featureId),
        };
      }
      if (s.gateBefore && st(s.key) === 'pending') {
        const prev = stages[i - 1];
        if (!prev || st(prev.key) === 'approved') {
          return {
            key: s.key,
            next: s,
            title: 'GATE 2 — approve the PR',
            subtitle: 'Opening a PR is outward-facing. Approve to run the pr stage.',
            unknowns: [] as string[],
          };
        }
      }
    }
    return null;
  }, [stages, state, dismissed, engine, featureId]);

  function run(stage: Stage) {
    if (running) return;
    setTail(`$ claude -p "${stage.cmd}"\n`);
    setRunning(stage.key);
    engine.setStage(stage.key, 'drafting');
    child.current = engine.runStage(
      stage,
      idea,
      (chunk) => setTail((t) => (t + chunk).slice(-8000)),
      (code) => {
        setRunning(null);
        child.current = null;
        setTail((t) => t + `\n[exit ${code ?? '?'}]\n`);
        setState(engine.readState());
      },
    );
  }

  // Layout math (also used by the scroll keys).
  const selected = stages[cursor];
  const relPath = selected ? engine.artifactPath(selected, featureId)?.replace(engine.target + '/', '') : null;
  const paneBody = running ? tail : selected ? engine.readArtifact(selected, featureId) : null;
  const rows = Math.max(6, (stdout?.rows ?? 24) - (gate ? 14 : 5));
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
      if (key.tab) {
        setFocus((f) => (f === 'rail' ? 'reader' : 'rail'));
        return;
      }
      // Gate actions coexist with reading: you can scroll the artifact (Tab to
      // the reader) before deciding, then a/x approve/hold.
      if (gate && input === 'a') {
        setDismissed((d) => new Set(d).add(gate.key));
        run(gate.next);
        return;
      }
      if (gate && input === 'x') {
        setDismissed((d) => new Set(d).add(gate.key));
        return;
      }
      if (input === 'r') {
        setState(engine.readState());
        return;
      }
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
    },
    { isActive: isRawModeSupported },
  );

  const paneTitle = running
    ? `running: ${running}`
    : selected
      ? `${selected.label} — ${relPath ?? '(no file yet)'}`
      : 'artifact';

  const hint = gate
    ? 'a approve · x hold · tab read PRD · jk scroll · q quit'
    : focus === 'reader'
      ? 'READER · jk/space/b scroll · g/G top·end · tab rail · q quit'
      : 'jk move · enter run · tab read · r refresh · q quit';

  return (
    <Box flexDirection="column">
      <Header stages={stages} state={state} featureId={featureId} />
      <Box>
        <StageRail stages={stages} state={state} cursor={cursor} running={running} focused={focus === 'rail'} />
        <ArtifactPane
          title={paneTitle}
          body={paneBody}
          rows={rows}
          tail={!!running}
          scroll={scroll}
          focused={focus === 'reader'}
        />
      </Box>
      {gate && <GateModal title={gate.title} subtitle={gate.subtitle} unknowns={gate.unknowns} />}
      <Box paddingX={1}>
        <Text color={C.muted}>
          {hint}
          {!isRawModeSupported && '   (no TTY: read-only)'}
        </Text>
      </Box>
    </Box>
  );
}
