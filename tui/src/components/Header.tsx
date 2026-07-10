import React from 'react';
import { Box, Text } from 'ink';
import type { Stage, PipelineState } from '../engine.js';
import { C, stageColor, glyph } from '../theme.js';

export function Header({
  stages,
  state,
  featureId,
}: {
  stages: Stage[];
  state: PipelineState | null;
  featureId: string | null;
}) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color={C.accent}>
          harness-kit cockpit
        </Text>
        <Text color={C.muted}>
          {featureId ?? 'idle'}
          {state?.intent ? `  ·  ${state.intent}` : ''}
        </Text>
      </Box>
      <Box>
        {stages.map((s, i) => {
          const st = state?.stages?.[s.key] ?? 'pending';
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
  );
}
