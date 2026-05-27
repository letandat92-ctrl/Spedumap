// ══════════════════════════════════════════════════════════════
// SPEDUMAP — Canonical TypeScript Types
// Mirror of CANONICAL_* contracts in spedumap_config.js
// Single source of truth for all TypeScript interfaces
// ══════════════════════════════════════════════════════════════

export type Directionality = 'normal' | 'hyper' | 'hypo' | 'mixed' | 'fluctuating' | 'unknown' | null
export type BlockSource = 'therapist' | 'clinical' | 'parent' | 'inferred' | null
export type CycleStatus = 'active' | 'closed'
export type BaselineSource = 'behavioral' | 'clinical' | null
export type UserRole = 'admin' | 'head_therapist' | 'senior_therapist' | 'junior_therapist'
export type LocalScore = -2 | -1 | 0 | 1 | 2

// ── CANONICAL_BLOCK ───────────────────────────────────────────
export interface CanonicalBlock {
  score:           number           // REQUIRED. 0–4 scale
  directionality?: Directionality  // L2 only
  confidence?:     number | null   // 0.0–1.0
  source?:         BlockSource
  updated_at?:     string | null   // ISO timestamp
}

export type BlocksMap = Record<string, CanonicalBlock>

// ── CANONICAL_BASELINE ────────────────────────────────────────
export interface CanonicalBaseline {
  blocks:       BlocksMap   // REQUIRED
  total_score:  number      // REQUIRED
  stage:        string      // REQUIRED. 'L0'–'L7'
  functional_ceiling?: string | null
  foundation_gap?:     number | null
  date?:        string | null
  locked_at?:   string | null
}

// ── CANONICAL_TARGET ─────────────────────────────────────────
export interface CanonicalTarget {
  blocks: BlocksMap  // REQUIRED
}

// ── CANONICAL_ACTIVITY ────────────────────────────────────────
export interface CanonicalActivity {
  block:          string         // REQUIRED. blockKey
  local_score:    LocalScore     // REQUIRED
  delta:          number         // REQUIRED. computed
  current_after:  CanonicalBlock // REQUIRED
  target_delta:   number         // REQUIRED
  activity_note?: string | null
  therapist_note?:string | null
}

// ── CANONICAL_SESSION ─────────────────────────────────────────
export interface CanonicalSession {
  session_id?:          string
  cycle_id:             string      // REQUIRED
  session_index:        number      // REQUIRED. 1-based
  date:                 string      // REQUIRED. ISO date
  therapist_id?:        string | null
  is_first_session:     boolean
  activities:           CanonicalActivity[]  // REQUIRED
  observed_activities:  CanonicalActivity[]  // REQUIRED
  notes?:               string | null
  regression_note?:     string | null
  parent_confirmed?:    boolean
  parent_confirmed_at?: string | null
}

// ── OBSERVED_BLOCK ────────────────────────────────────────────
export interface ObservedBlock {
  block:              string
  baseline_original:  CanonicalBlock
  trigger_upstream?:  string | null
  added_session?:     number
}

// ── CHILD ─────────────────────────────────────────────────────
export interface Child {
  id:            string   // REQUIRED
  name:          string   // REQUIRED
  dob?:          string | null
  parent_email?: string | null
}

// ── CANONICAL_CYCLE ───────────────────────────────────────────
export interface CanonicalCycle {
  cycle_id:          string         // REQUIRED
  cycle_name?:       string | null
  status:            CycleStatus    // REQUIRED
  baseline_source?:  BaselineSource
  started_at?:       string | null
  planned_sessions?: number
  child:             Child          // REQUIRED
  baseline:          CanonicalBaseline  // REQUIRED
  target:            CanonicalTarget    // REQUIRED
  observed_blocks?:  ObservedBlock[]
  daily_sessions:    CanonicalSession[] // REQUIRED
  governance_meta?:  Record<string, unknown> | null
  supabase_cycle_id?:string | null
  // Legacy keys (Goal Setting output format)
  baseline_blocks?:  BlocksMap
  target_blocks?:    BlocksMap
}

// ── ENGINE SNAPSHOT ───────────────────────────────────────────
export interface EngineSnapshot {
  total:               number
  stage:               string
  functional_ceiling?: string | null
  foundation_gap?:     number | null
  layer_scores?:       Record<string, number>
  signals?:            Record<string, number>
}

// ── NEARME ────────────────────────────────────────────────────
export type NearMeGroup = 'N' | 'E' | 'A' | 'R' | 'Me'

export interface NearMeRecommendation {
  dominant_signal:  string
  dominant_value:   number
  nearme_priority:  NearMeGroup[]
  nearme_labels:    string[]
  all_signals:      Array<{ signal: string; value: number; type: string }>
}

// ── 360 BRAIN INTEGRATION ─────────────────────────────────────
export type AxisSeverity = 'HIGH' | 'MODERATE' | 'LOW'

export interface AxisSignal {
  value:    number
  gap:      number
  severity: AxisSeverity
}

export interface Brain360Axes {
  top_down:   AxisSignal
  left_right: AxisSignal
  front_back: AxisSignal
}

// ── USER PROFILE ──────────────────────────────────────────────
export interface UserProfile {
  id:         string
  role:       UserRole
  full_name?: string | null
  email?:     string | null
  created_at?:string | null
}

// ── LS_KEYS ───────────────────────────────────────────────────
export const LS_KEYS = {
  BASELINE:     'spedumap_baseline',
  CYCLE:        'spedumap_cycle',
  ACTIVE_CYCLE: 'spedumap_active_cycle',
  RETEST_SEED:  'spedumap_retest_seed',   // close-summary → baseline pre-seed
} as const

// ── NEW SCHEMA TYPES (Session 5) ──────────────────────────

export interface Assessment {
  id: string
  child_id: string
  therapist_id: string
  assessment_date: string
  identified_blocks: IdentifiedBlock[]
  assigned_layer: number
  confidence_score: number
  source: 'workshop' | 'observation' | 'parent_report' | 'standardized_tool'
  notes?: string
  created_at: string
  updated_at: string
}

export interface IdentifiedBlock {
  name: string
  severity: number
  location?: string
}

export interface CycleHypothesis {
  id: string
  cycle_id: string
  hypothesis_statement: string
  root_cause_assumption?: string
  intervention_strategy?: string
  success_criterion?: string
  created_at: string
  updated_at: string
}

export interface LayerProgression {
  id: string
  child_id: string
  cycle_id: string
  assessment_id_from?: string
  assessment_id_to?: string
  layer_from: number
  layer_to: number
  transition_date: string
  evidence_trigger: string
  created_at: string
}

export interface ActivityOutcome {
  id: string
  session_id: string
  activity_name: string
  activity_index: number
  outcome_indicator: 'block_move' | 'duration_change' | 'frequency_change' | 'skill_emergence'
  outcome_value?: number
  block_name?: string
  notes?: string
  created_at: string
}

export interface ParentEngagement {
  id: string
  child_id: string
  homework_assigned_date: string
  homework_description: string
  homework_completed: boolean
  completion_date?: string
  quality_score?: number
  therapist_notes?: string
  created_at: string
  updated_at: string
}

export interface ParentEngagementSummary {
  child_id: string
  total_homework_assigned: number
  completed_count: number
  completion_rate: number
  avg_quality_score: number
  pending_homework: ParentEngagement[]
}

export interface ParentObservation {
  id: string
  child_id: string
  observation_date: string
  observation_context?: string
  block_observed: string
  severity?: number
  child_state?: string
  parent_notes?: string
  created_at: string
}
