import React from 'react';
import { Box, Text } from 'ink';
import type { Stage, StageState, PipelineState } from '../engine.js';
import { C, stageColor, glyph } from '../theme.js';

export function StageRail({
  stages,
  state,
  cursor,
  running,
  focused,
}: {
  stages: Stage[];
  state: PipelineState | null;
  cursor: number;
  running: string | null;
  focused: boolean;
}) {
  return (
    <Box
      flexDirection="column"
      width={22}
      borderStyle="round"
      borderColor={focused ? C.accent : C.muted}
      paddingX={1}
    >
      <Text bold color={C.accent}>
        {focused ? '▣ ' : ''}STAGES
      </Text>
      {stages.map((s, i) => {
        const st: StageState = state?.stages?.[s.key] ?? 'pending';
        const isCursor = i === cursor;
        const isRunning = running === s.key;
        const gate = s.gateAfter || s.gateBefore ? ' ⚑' : '';
        return (
          <Box key={s.key}>
            <Text bold color={C.accent}>{isCursor ? '▸' : ' '}</Text>
            <Text bold={isCursor} color={stageColor[st]}>
              {glyph[st]} {s.label.toLowerCase()}
            </Text>
            <Text color={C.gate}>{gate}</Text>
            {isRunning && <Text color={C.active}> …</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
