import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../theme.js';

// Renders either a stage artifact or the live tail of a running stage.
// Scrollable: `scroll` is the top line index (clamped by the parent).
export function ArtifactPane({
  title,
  body,
  rows,
  tail,
  scroll,
  focused,
}: {
  title: string;
  body: string | null;
  rows: number;
  tail: boolean;
  scroll: number;
  focused: boolean;
}) {
  const lines = (body ?? '').replace(/\t/g, '  ').split('\n');
  const maxStart = Math.max(0, lines.length - rows);
  const start = tail ? maxStart : Math.min(Math.max(0, scroll), maxStart);
  const shown = lines.slice(start, start + rows);
  const above = start;
  const below = lines.length - (start + shown.length);

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={focused ? C.accent : C.muted}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Box flexGrow={1} marginRight={1}>
          <Text bold color={C.accent} wrap="truncate-middle">
            {focused ? '▣ ' : ''}
            {title}
          </Text>
        </Box>
        <Text color={C.muted}>
          {above > 0 ? `▲${above} ` : ''}
          {below > 0 ? `▼${below}` : above > 0 ? 'end' : ''}
        </Text>
      </Box>
      {body == null ? (
        <Text color={C.muted}>no artifact yet — run this stage to generate it</Text>
      ) : (
        shown.map((l, i) => (
          <Text key={i} wrap="truncate-end">
            {l || ' '}
          </Text>
        ))
      )}
    </Box>
  );
}
