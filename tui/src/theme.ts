// Vivid primary palette. One source of truth for cockpit colors.
import type { StageState } from './engine.js';

// Matches the harness-kit site identity (docs/index.html): violet accent,
// gold, mint-green success, rose danger. Keeps the cockpit visually part of
// the same product as the web dashboard.
export const C = {
  accent: '#a78bfa', // violet — title, cursor, borders
  done: '#6ee7b7', // mint green — approved
  active: '#fcc04a', // gold — drafting / running
  pending: '#6b8afd', // soft blue — pending
  gate: '#fcc04a', // gold — gates
  hold: '#fb7185', // rose — hold / errors
  border: '#a78bfa', // violet borders
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
