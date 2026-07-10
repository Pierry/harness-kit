// Vivid primary palette. One source of truth for cockpit colors.
import type { StageState } from './engine.js';

export const C = {
  accent: '#22d3ee', // vivid cyan — title, cursor, borders
  done: '#22e06b', // vivid green — approved
  active: '#ffc21a', // vivid amber — drafting / running
  pending: '#5b9dff', // vivid blue — pending
  gate: '#ffd21e', // vivid yellow — gates
  hold: '#ff4d4d', // vivid red — hold / errors
  border: '#22d3ee', // vivid cyan borders
  muted: '#8aa0b8', // secondary text (used instead of dimColor)
};

export const stageColor: Record<StageState, string> = {
  pending: C.pending,
  drafting: C.active,
  approved: C.done,
};

export const glyph: Record<StageState, string> = {
  pending: '○',
  drafting: '●',
  approved: '✓',
};
