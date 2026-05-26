// lib/signals.ts
// Single source of truth for deficit-signal calculation (Formula A).
// Mirrors the engine() in ui_baseline_setting.html / hooks/useBaseline.ts runEngine().
// Used by:
//   - hooks/useBaseline.ts   (baseline engine `sig`, persisted to engine_snapshot.signals)
//   - components/charts/CycleComponents.tsx (SignalStrip cards on baseline + cycle pages)
// so the baseline and goal pages rank Dominant Deficit with the SAME formula.

export const SIGNAL_T = 2.5

// Block-weights per layer (must mirror BW in hooks/useBaseline.ts).
const BW: Record<string, Record<string, number>> = {
  L0: { sleep: .25, microbiome: .25, nutrition: .20, immune: .15, metabolic: .15 },
  L1: { arousal: .40, reflex_survival: .10, reflex_postural: .10, reflex_cortical: .05, tone: .20, ns_stability: .15 },
  L2: { vestibular: .20, proprioception: .15, auditory: .15, visual: .15, tactile: .10, interoception: .10, taste_smell: .15 },
  L3: { motor_planning: .2, gross_motor: .2, fine_motor: .2, postural_control: .2, bilateral_coord: .2 },
  L4: { attention: .35, auditory_processing: .30, visual_processing: .30, wm_link: .05 },
  L5: { oral_language: .2, word_finding: .2, phonemic_awareness: .2, auditory_memory: .2, visual_memory: .2 },
  L6: { self_control: .25, behavior: .25, social_skills: .25, daily_living: .25 },
  L7: { math: 1 / 3, writing: 1 / 3, reading: 1 / 3 },
}

const LAYER_IDS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']

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
