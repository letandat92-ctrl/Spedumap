// lib/signals.ts
// Single source of truth for deficit-signal calculation (Formula A).
// Taxonomy constants imported from lib/ontology.ts.

import { BLOCK_WEIGHTS as BW, LAYER_IDS } from './ontology'

export const SIGNAL_T = 2.5

export interface DeficitSignals {
  sensorimotor: number
  regulation:   number
  cognitive:    number
}

/** Coerce a block value (number | {score} | null) to a numeric score. */
export function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as { score: number }).score)
  return 0
}

/** Deficit signals from rough (BW-weighted) layer scores — the canonical Formula A. */
export function signalsFromLayers(rough: Record<string, number>): DeficitSignals {
  return {
    sensorimotor: Math.max(0, SIGNAL_T - ((rough.L2 ?? 0) * 0.55 + (rough.L3 ?? 0) * 0.45)),
    regulation:   Math.max(0, SIGNAL_T - ((rough.L1 ?? 0) * 0.70 + (rough.L0 ?? 0) * 0.30)),
    cognitive:    Math.max(0, SIGNAL_T - ((rough.L4 ?? 0) * 0.60 + (rough.L5 ?? 0) * 0.40)),
  }
}

/** Rough (BW-weighted) layer score for a single layer from a blocks map. */
export function layerScore(blocks: Record<string, unknown>, lid: string): number {
  const bw = BW[lid]
  if (!bw) return 0
  return Object.entries(bw).reduce((s, [k, w]) => s + getScore(blocks[k]) * w, 0)
}

/** Deficit signals computed directly from a blocks map (number | {score}). */
export function computeSignals(blocks: Record<string, unknown>): DeficitSignals {
  const rough: Record<string, number> = {}
  for (const lid of LAYER_IDS) rough[lid] = layerScore(blocks, lid)
  return signalsFromLayers(rough)
}

const SIGNAL_LABELS: Record<keyof DeficitSignals, string> = {
  sensorimotor: 'Sensorimotor',
  regulation:   'Regulation',
  cognitive:    'Cognitive',
}

/** The highest-magnitude deficit signal (key + value), or null when all are zero. */
export function dominantSignal(
  signals: Partial<DeficitSignals> | Record<string, number>
): { key: keyof DeficitSignals; label: string; value: number } | null {
  const entries = Object.entries(signals) as Array<[keyof DeficitSignals, number]>
  const top = entries.sort((a, b) => b[1] - a[1])[0]
  if (!top || !(top[1] > 0)) return null
  return { key: top[0], label: SIGNAL_LABELS[top[0]] ?? String(top[0]), value: top[1] }
}
