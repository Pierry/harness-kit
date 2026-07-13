import React from 'react';
import { Box, Text } from 'ink';
import type { Feature } from '../engine.js';
import { STAGES } from '../engine.js';
import { C, stageColor, glyph } from '../theme.js';

const CELL = 4; // width of each stage column, keeps the glyph grid aligned
const TITLE_W = 26; // feature-title column width

function date(id: string): string {
  const m = id.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : '';
}

// Column header naming every stage, aligned over the glyph grid below.
function StageHeader() {
  return (
    <Box>
      <Box width={TITLE_W}>
        <Text color={C.muted}>feature</Text>
      </Box>
      {STAGES.map((s) => (
        <Box key={s.key} width={CELL} justifyContent="center">
          <Text color={C.muted}>{s.short}</Text>
        </Box>
      ))}
      <Text color={C.muted}> reached</Text>
    </Box>
  );
}

// Shown when there are no features yet: name the seven stages and what each
// does, so the pipeline is legible even before anything has run.
function PipelineOverview() {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={C.muted}>No features yet. The pipeline runs these seven stages in order:</Text>
      <Box flexDirection="column" marginTop={1}>
        {STAGES.map((s) => (
          <Box key={s.key}>
            <Text color={C.pending}>{glyph.pending} </Text>
            <Box width={9}>
              <Text bold color="white">
                {s.label.toLowerCase()}
              </Text>
            </Box>
            <Box width={26}>
              <Text color={C.muted} wrap="truncate-end">
                {s.desc}
              </Text>
            </Box>
            <Box width={8}>
              <Text color={C.gate}>{s.gateAfter || s.gateBefore ? '⚑ gate' : ''}</Text>
            </Box>
            <Text color={C.muted}>{s.cmd}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={C.muted}>Start one with </Text>
        <Text color={C.accent}>/pipeline:run "&lt;idea&gt;"</Text>
        <Text color={C.muted}> in Claude Code.</Text>
      </Box>
    </Box>
  );
}

export function FeatureList({ features, cursor }: { features: Feature[]; cursor: number }) {
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={C.accent} paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color={C.accent}>
          FEATURES ({features.length})
        </Text>
        <Text color={C.muted}>
          {glyph.pending} pending {'  '}
          {glyph.drafting} drafting {'  '}
          {glyph.approved} approved {'  '}
          {'⚑'} gate
        </Text>
      </Box>

      {features.length === 0 ? (
        <PipelineOverview />
      ) : (
        <Box flexDirection="column" marginTop={1}>
          <StageHeader />
          {features.map((f, i) => {
            const isCursor = i === cursor;
            const reachedStage = STAGES.find((s) => s.key === f.reached);
            return (
              <Box key={f.id}>
                <Box width={TITLE_W}>
                  <Text bold color={C.accent}>
                    {isCursor ? '▸ ' : '  '}
                  </Text>
                  <Text bold={isCursor} color={isCursor ? 'white' : undefined} wrap="truncate-end">
                    {f.title}
                  </Text>
                </Box>
                {STAGES.map((s) => (
                  <Box key={s.key} width={CELL} justifyContent="center">
                    <Text color={stageColor[f.stages[s.key] ?? 'pending']}>
                      {glyph[f.stages[s.key] ?? 'pending']}
                    </Text>
                  </Box>
                ))}
                <Text> </Text>
                <Text color={f.done ? C.done : C.active}>
                  {f.done ? 'done' : reachedStage?.label.toLowerCase() ?? '-'}
                </Text>
                {f.active && <Text color={C.accent}> ● live</Text>}
                <Text color={C.muted}>{'  ' + date(f.id)}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
