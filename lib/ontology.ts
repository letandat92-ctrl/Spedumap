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

// ══════════════════════════════════════════════════════════════════════════════
// ATTRIBUTION CONSTANTS (NEARMe framework)
// Pure heuristic parameters — no DB tables, no engine logic.
// ══════════════════════════════════════════════════════════════════════════════

// ── NEARMe domains ──────────────────────────────────────────────────────────
export const NEARME_DOMAINS = ['N', 'E', 'A', 'R', 'Me'] as const
export type NearmeDomain = (typeof NEARME_DOMAINS)[number]

// ── NEARMe mix + nearmeMix() — MOVED to lib/ontology-server.ts (server-only)
// Client components must NOT import nearmeMix directly.
// Use server actions (e.g. app/head/library/actions.ts) for validation.

// ── Layer expected lag (weeks to see measurable change) ─────────────────────
export const LAYER_EXPECTED_LAG: Record<string, { fast: number; typical: number }> = {
  L0: { fast: 1,  typical: 4  },
  L1: { fast: 8,  typical: 12 },
  L2: { fast: 8,  typical: 12 },
  L3: { fast: 8,  typical: 12 },
  L4: { fast: 4,  typical: 8  },
  L5: { fast: 4,  typical: 8  },
  L6: { fast: 4,  typical: 8  },
  L7: { fast: 2,  typical: 6  },
}

// ── Source types + reliability tier helpers ──────────────────────────────────
// launch: chỉ in_person ghi mặc định. Scale: thêm UI chọn source_type, write-path đã sẵn.
export const SOURCE_TYPES = ['in_person', 'remote', 'parent_report'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]
export const DEFAULT_SOURCE_TYPE: SourceType = 'in_person'

/** Tier name for a given source type.
 *  RELIABILITY_WEIGHT keys ARE the tier names, so tier = source_type. */
export function reliabilityTierFor(src: SourceType): string {
  return src
}

// ── Reliability weight by observation modality ──────────────────────────────
export const RELIABILITY_WEIGHT: Record<string, number> = {
  in_person:     1.0,
  remote:        0.7,
  parent_report: 0.4,
}

// ── DMT engine constants ──────────────────────────────────────────────────────
// K = logistic steepness for p_stage sigmoid. Prior yếu — sẽ điều chỉnh sau khi
// có đủ data. CHỈ DÙNG bởi lib/dmt.ts; không ảnh hưởng v1.3 scoring path.
export const DMT_K = 3.0

// ── Attribution parameters ──────────────────────────────────────────────────
export const ATTRIBUTION_PARAMS = {
  /** Isolation coefficient — proportion of delta attributed to intervention vs maturation. */
  iso_k: 0.6,
  /** Specificity multiplier by solution-to-block match type. */
  spec: {
    exact:       1.0,
    same_layer:  0.8,
    cross_layer: 0.5,
    miss:        0.3,
  },
} as const

// ── Re-exports (single import door) ─────────────────────────────────────────
export { PACE, computeBlockDelta } from './scoring'
export { ANCHOR } from './anchor-data'
