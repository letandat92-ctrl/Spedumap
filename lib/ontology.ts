// lib/ontology.ts — SINGLE SOURCE OF TRUTH for the SPEDUMAP 39-block taxonomy,
// block weights, layer weights, and version constants.
//
// Every file that needs B2L, BLOCK_WEIGHTS, LAYER_WEIGHTS, or version strings
// MUST import from here. Do NOT re-declare these constants elsewhere.
//
// Re-exports PACE (from lib/scoring) and ANCHOR (from lib/anchor-data) so
// consumers can use ontology as the one import for all taxonomy data.

// ── Versions ─────────────────────────────────────────────────────────────────
export const ONTOLOGY_VERSION = '3.3'
export const SCORING_VERSION  = '1.3'

// ── Layer IDs (ordered L0→L7) ────────────────────────────────────────────────
export const LAYER_IDS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']

// ── L2 block list (used by baseline/retest picker for the sub-block grid) ────
export const L2_BLOCKS = ['vestibular', 'proprioception', 'auditory', 'visual', 'tactile', 'taste', 'smell']

// ── Block → Layer map (39 blocks) ────────────────────────────────────────────
export const B2L: Record<string, string> = {
  sleep: 'L0', microbiome: 'L0', nutrition: 'L0', immune: 'L0', metabolic: 'L0',
  arousal: 'L1', reflex_survival: 'L1', reflex_postural: 'L1', reflex_cortical: 'L1', tone: 'L1', ns_stability: 'L1',
  vestibular: 'L2', proprioception: 'L2', auditory: 'L2', visual: 'L2', tactile: 'L2', taste: 'L2', smell: 'L2',
  motor_planning: 'L3', gross_motor: 'L3', fine_motor: 'L3', postural_control: 'L3', bilateral_coord: 'L3',
  attention: 'L4', auditory_processing: 'L4', visual_processing: 'L4', wm_link: 'L4',
  oral_language: 'L5', word_finding: 'L5', phonemic_awareness: 'L5', auditory_memory: 'L5', visual_memory: 'L5',
  self_control: 'L6', behavior: 'L6', social_skills: 'L6', daily_living: 'L6',
  math: 'L7', writing: 'L7', reading: 'L7',
}

// ── Block weights per layer (raw, before dynamic adjustment) ─────────────────
export const BLOCK_WEIGHTS: Record<string, Record<string, number>> = {
  L0: { sleep: 0.25, microbiome: 0.25, nutrition: 0.20, immune: 0.15, metabolic: 0.15 },
  L1: { arousal: 0.40, reflex_survival: 0.10, reflex_postural: 0.10, reflex_cortical: 0.05, tone: 0.20, ns_stability: 0.15 },
  L2: { vestibular: 0.22, proprioception: 0.18, auditory: 0.16, visual: 0.16, tactile: 0.12, taste: 0.08, smell: 0.08 },
  L3: { motor_planning: 1 / 5, gross_motor: 1 / 5, fine_motor: 1 / 5, postural_control: 1 / 5, bilateral_coord: 1 / 5 },
  L4: { attention: 0.35, auditory_processing: 0.30, visual_processing: 0.30, wm_link: 0.05 },
  L5: { oral_language: 1 / 5, word_finding: 1 / 5, phonemic_awareness: 1 / 5, auditory_memory: 1 / 5, visual_memory: 1 / 5 },
  L6: { self_control: 1 / 4, behavior: 1 / 4, social_skills: 1 / 4, daily_living: 1 / 4 },
  L7: { math: 1 / 3, writing: 1 / 3, reading: 1 / 3 },
}

// ── Layer weights (total = 100) ──────────────────────────────────────────────
export const LAYER_WEIGHTS: Record<string, number> = {
  L0: 18, L1: 16, L2: 14, L3: 12, L4: 12, L5: 10, L6: 10, L7: 8,
}

// ── Re-exports (single import door) ─────────────────────────────────────────
export { PACE, computeBlockDelta } from './scoring'
export { ANCHOR } from './anchor-data'
