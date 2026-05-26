// lib/engine.ts
// SPEDUMAP scoring engine v3 — exact port of runEngine() in
// pyramid_scoring_engine_v3.html (Steps 1–5: rough layer scores → deficit
// signals → dynamic weighting → layer lock → total + stage).
//
// SINGLE SOURCE OF TRUTH for the total/stage/signals. Used by:
//   - hooks/useBaseline.ts (baseline lock → engine_snapshot)
//   - app/therapist/session/page.tsx  (current/target totals)
//   - app/therapist/report/page.tsx   (current/target totals)
//
// Key mappings vs the template's BLOCK_WEIGHTS_RAW:
//   gut    → microbiome
//   reflex (0.25) → reflex_survival 0.10 / reflex_postural 0.10 / reflex_cortical 0.05
//   (the L1 reflex dynamic bump is applied to all three reflex blocks)

export const LAYER_IDS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']
export const LAYER_WEIGHTS: Record<string, number> = { L0: 18, L1: 16, L2: 14, L3: 12, L4: 12, L5: 10, L6: 10, L7: 8 }
export const THRESHOLD = 2.5

// Raw block weights — pyramid BLOCK_WEIGHTS_RAW with key mappings applied.
const BLOCK_WEIGHTS_RAW: Record<string, Record<string, number>> = {
  L0: { sleep: 0.25, microbiome: 0.25, nutrition: 0.20, immune: 0.15, metabolic: 0.15 },
  L1: { arousal: 0.40, reflex_survival: 0.10, reflex_postural: 0.10, reflex_cortical: 0.05, tone: 0.20, ns_stability: 0.15 },
  L2: { vestibular: 0.20, proprioception: 0.15, auditory: 0.15, visual: 0.15, tactile: 0.10, interoception: 0.10, taste_smell: 0.15 },
  L3: { motor_planning: 1 / 5, gross_motor: 1 / 5, fine_motor: 1 / 5, postural_control: 1 / 5, bilateral_coord: 1 / 5 },
  L4: { attention: 0.35, auditory_processing: 0.30, visual_processing: 0.30, wm_link: 0.05 },
  L5: { oral_language: 1 / 5, word_finding: 1 / 5, phonemic_awareness: 1 / 5, auditory_memory: 1 / 5, visual_memory: 1 / 5 },
  L6: { self_control: 1 / 4, behavior: 1 / 4, social_skills: 1 / 4, daily_living: 1 / 4 },
  L7: { math: 1 / 3, writing: 1 / 3, reading: 1 / 3 },
}

export interface EngineSignals {
  sensorimotor: number
  regulation:   number
  cognitive:    number
}

export interface EngineResult {
  total:       number
  stage:       string
  signals:     EngineSignals
  layerScores: Record<string, number>   // post-lock (adjusted) layer scores
  lockActive:  boolean
}

/** Coerce a block value (number | {score} | null) to a numeric score. */
export function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as { score: number }).score) || 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function computeLayerScore(blocks: Record<string, number>, weights: Record<string, number>): number {
  let total = 0
  for (const b in weights) total += (blocks[b] ?? 0) * weights[b]
  return total
}

function normalizeWeights(w: Record<string, number>): Record<string, number> {
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  const out: Record<string, number> = {}
  for (const k in w) out[k] = w[k] / total
  return out
}

// ── Step 2: deficit signals (v3 core) ──
function computeSignals(rough: Record<string, number>): EngineSignals {
  const sensorimotor = Math.max(0, THRESHOLD - ((rough.L2 || 0) * 0.55 + (rough.L3 || 0) * 0.45))
  const regulation   = Math.max(0, THRESHOLD - ((rough.L1 || 0) * 0.70 + (rough.L0 || 0) * 0.30))
  const cognitive    = Math.max(0, THRESHOLD - ((rough.L4 || 0) * 0.60 + (rough.L5 || 0) * 0.40))
  return {
    sensorimotor: Math.round(sensorimotor * 1000) / 1000,
    regulation:   Math.round(regulation   * 1000) / 1000,
    cognitive:    Math.round(cognitive    * 1000) / 1000,
  }
}

// ── Step 3: dynamic weighting (continuous, driven by deficit signals) ──
function adjustL0(w: Record<string, number>, s: EngineSignals): Record<string, number> {
  const out = { ...w }
  out.sleep      *= (1 + 0.30 * s.regulation)   // sleep ↑ when regulation weak
  out.microbiome *= (1 + 0.20 * s.sensorimotor) // gut → microbiome ↑ when sensorimotor weak
  return normalizeWeights(out)
}
function adjustL1(w: Record<string, number>, s: EngineSignals): Record<string, number> {
  const out = { ...w }
  out.arousal *= (1 + 0.25 * s.regulation)      // arousal ↑ when regulation weak
  const reflexBump = (1 + 0.20 * s.sensorimotor) // reflex ↑ when sensorimotor weak — split across 3 reflex blocks
  out.reflex_survival *= reflexBump
  out.reflex_postural *= reflexBump
  out.reflex_cortical *= reflexBump
  return normalizeWeights(out)
}
function adjustL2(w: Record<string, number>, s: EngineSignals): Record<string, number> {
  const out = { ...w }
  out.vestibular     *= (1 + 0.20 * s.sensorimotor)
  out.proprioception *= (1 + 0.20 * s.sensorimotor)
  return normalizeWeights(out)
}
function adjustL4(w: Record<string, number>, s: EngineSignals): Record<string, number> {
  const out = { ...w }
  out.attention *= (1 + 0.25 * s.regulation)
  out.attention *= (1 + 0.15 * s.cognitive)
  return normalizeWeights(out)
}

// ── Step 4: layer lock ──
function applyLayerLock(layerScores: Record<string, number>): Record<string, number> {
  const adj = { ...layerScores }
  for (let i = 1; i < LAYER_IDS.length; i++) {
    const lower = LAYER_IDS[i - 1], cur = LAYER_IDS[i]
    if (layerScores[lower] < 1.5)      adj[cur] *= 0.4
    else if (layerScores[lower] < 2.0) adj[cur] *= 0.7
  }
  return adj
}

/**
 * Full v3 engine. `blocks` is a flat map of blockKey → score (0–4).
 * Returns total (0–100 scale), stage (L0–L7), deficit signals, post-lock
 * layer scores, and whether the layer lock is active.
 */
export function runEngine(blocks: Record<string, number>): EngineResult {
  // Step 1: rough layer scores
  const rough: Record<string, number> = {}
  LAYER_IDS.forEach(lid => { rough[lid] = computeLayerScore(blocks, BLOCK_WEIGHTS_RAW[lid]) })

  // Step 2: deficit signals
  const signals = computeSignals(rough)

  // Step 3: dynamic weighting → final (re-weighted) layer scores
  const final: Record<string, number> = {}
  LAYER_IDS.forEach(lid => {
    let w = { ...BLOCK_WEIGHTS_RAW[lid] }
    if      (lid === 'L0') w = adjustL0(w, signals)
    else if (lid === 'L1') w = adjustL1(w, signals)
    else if (lid === 'L2') w = adjustL2(w, signals)
    else if (lid === 'L4') w = adjustL4(w, signals)
    final[lid] = computeLayerScore(blocks, w)
  })

  // Step 4: layer lock (checked against the dynamic-weighted final scores)
  const adj = applyLayerLock(final)

  // Step 5: total score (0–100)
  let total = 0
  LAYER_IDS.forEach(lid => { total += (adj[lid] / 4.0) * LAYER_WEIGHTS[lid] })

  // Step 6: stage
  let stage = 'L0'
  LAYER_IDS.forEach((lid, i) => {
    if (adj[lid] >= 2.5 && (i === 0 || adj[LAYER_IDS[i - 1]] >= 2.0)) stage = lid
  })

  // Lock active?
  let lockActive = false
  for (let i = 1; i < LAYER_IDS.length; i++) {
    if (final[LAYER_IDS[i - 1]] < 2.0) { lockActive = true; break }
  }

  return { signals, layerScores: adj, total, stage, lockActive }
}

/** Convenience: run the engine on a blocks map that may contain {score} objects. */
export function runEngineFromBlocks(blocks: Record<string, unknown>): EngineResult {
  const nums: Record<string, number> = {}
  for (const k in blocks) nums[k] = getScore(blocks[k])
  return runEngine(nums)
}
