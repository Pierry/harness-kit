import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../theme.js';

// A human gate: "on the loop, not in it". Two exist in the v5 pipeline —
// approve direction after the PRD, approve the PR before it opens.
export function GateModal({
  title,
  subtitle,
  unknowns,
}: {
  title: string;
  subtitle: string;
  unknowns: string[];
}) {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor={C.gate} paddingX={1} marginX={1}>
      <Text bold color={C.gate}>
        ⚑ {title}
      </Text>
      <Text color="white">{subtitle}</Text>
      {unknowns.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={C.muted}>unresolved ({unknowns.length}) — NEEDS REVIEW:</Text>
          {unknowns.slice(0, 5).map((u, i) => (
            <Text key={i} color={C.gate}>
              {'  • '}
              {u}
            </Text>
          ))}
        </Box>
      )}
      <Box marginTop={1}>
        <Text>
          <Text color={C.done} bold>
            [a]
          </Text>
          <Text color="white"> approve &amp; continue{'   '}</Text>
          <Text color={C.hold} bold>
            [x]
          </Text>
          <Text color="white"> hold</Text>
        </Text>
      </Box>
    </Box>
  );
}
