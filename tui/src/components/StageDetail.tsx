import React from 'react';
import { Box, Text } from 'ink';
import type { Stage, StageState, StageDetail as Detail } from '../engine.js';
import { C, stageColor, glyph } from '../theme.js';

// Compact facts strip for the selected stage: score, timing, tokens, and the
// sensor / eval / guide catalog that gates it. All read from disk.
export function StageDetail({
  stage,
  state,
  detail,
}: {
  stage: Stage;
  state: StageState;
  detail: Detail;
}) {
  const fmtDur = (s?: number) =>
    s == null ? null : s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`;
  const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
  const passed = state === 'approved';
  const gateMark = passed ? '✓' : state === 'drafting' ? '•' : '○';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={C.muted} paddingX={1}>
      {/* line 1: identity + score + timing + tokens */}
      <Box>
        <Text bold color={stageColor[state]}>
          {glyph[state]} {stage.label}
        </Text>
        <Text color={C.muted}>  {stage.desc}</Text>
        {detail.score != null && (
          <Text bold color={detail.score >= 8 ? C.done : C.active}>
            {'   '}score {detail.score.toFixed(2)}/10
          </Text>
        )}
        {detail.readyForHandoff && <Text color={C.done}>  handoff-ready</Text>}
        {detail.approvedAt && <Text color={C.muted}>  · {detail.approvedAt}</Text>}
        {fmtDur(detail.durationSec) && (
          <Text color={C.muted}>  · {fmtDur(detail.durationSec)}</Text>
        )}
        {detail.tokens && (
          <Text color={C.muted}>
            {'  · '}in {fmtK(detail.tokens.in)} out {fmtK(detail.tokens.out)}
          </Text>
        )}
      </Box>

      {/* line 2: sensors (real pass/fail from report) + evals */}
      <Box>
        <Text color={C.muted}>gates{detail.hasReport ? '' : '*'} </Text>
        {detail.sensors.length === 0 && detail.evals.length === 0 ? (
          <Text color={C.muted}>none</Text>
        ) : (
          <>
            {detail.sensors.map((s) => {
              // Real status from the report wins; otherwise imply from approval.
              // 'inferential' and 'error' must never inherit the approved-stage
              // green: nothing machine-checked them, and saying otherwise is the
              // illusion of quality the sensors exist to prevent.
              const mark =
                s.status === 'pass' ? '✓'
                : s.status === 'fail' ? '✗'
                : s.status === 'error' ? '!'
                : s.status === 'inferential' ? '~'
                : gateMark;
              const col =
                s.status === 'pass' ? C.done
                : s.status === 'fail' || s.status === 'error' ? C.hold
                : s.status === 'inferential' ? C.active
                : passed ? C.done : C.muted;
              return (
                <Text key={s.name}>
                  <Text color={col}>{mark} </Text>
                  <Text color={C.pending}>{s.name} </Text>
                </Text>
              );
            })}
            {detail.evals.map((e) => (
              <Text key={e}>
                <Text color={passed ? C.done : C.muted}>{gateMark} </Text>
                <Text color={C.accent}>{e} </Text>
              </Text>
            ))}
          </>
        )}
      </Box>

      {/* line 3: guides as a checklist — ✓ read, ○ not recorded as read */}
      <Box>
        <Text color={C.muted}>guides{detail.hasTrace ? '' : '*'} </Text>
        {detail.guides.length === 0 ? (
          <Text color={C.muted}>none</Text>
        ) : (
          detail.guides.map((g) => (
            <Text key={g.name}>
              <Text bold color={g.used ? C.done : C.muted}>{g.used ? '✓' : '○'} </Text>
              <Text bold={g.used} color={g.used ? '#e6edf5' : C.muted}>{g.name} </Text>
            </Text>
          ))
        )}
      </Box>
      {(!detail.hasReport || !detail.hasTrace) && (
        <Text color={C.muted}>
          * catalog (no per-run trace yet) — rerun the stage to record real pass/fail + guides read
        </Text>
      )}
    </Box>
  );
}
