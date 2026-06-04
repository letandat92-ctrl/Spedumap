'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  CanonicalBlock, BlocksMap, CanonicalBaseline,
  Directionality, UserRole,
} from '@/types/spedumap'
import { runEngine as engineV3 } from '@/lib/engine'

// ── Types ─────────────────────────────────────────────────────

export type FlagValue = 'none' | 'confirmed' | 'retest' | 'assumed'

export interface BlockState {
  score:         number | null    // null = not entered yet
  directionality:Directionality
  flag:          FlagValue
  note:          string
}

export interface MetaState {
  childName:     string
  childDob:      string
  parentName:    string
  parentEmail:   string
  parentPhone:   string
  evaluatorName: string
  evalDate:      string
  evalTimeStart: string
  evalTimeEnd:   string
  knowledgeDomain:'senior_therapist' | 'junior_therapist' | 'parent'
  isClinic:      boolean
  selectedChildId: string | null   // set when a child is picked from the directory (else free-typed)
  parentId:        string | null   // set when a parent is found in user_profiles by email or phone
}

export interface EngineResult {
  adj:               Record<string, number>
  sig:               { sensorimotor: number; regulation: number; cognitive: number }
  tot:               number
  stage:             string
  functional_ceiling:string
  foundation_gap:    number
  lock:              boolean
}

export interface BaselineOutput {
  child: {
    id?:          string
    name:         string
    dob:          string
    parent_email: string
    parent_phone: string
    parent_name:  string
  }
  evaluator_name:  string
  eval_date:       string
  eval_time:       { start: string; end: string }
  baseline_source: 'behavioral' | 'clinical'
  knowledge_domain:string
  baseline_blocks: BlocksMap
  engine_snapshot: {
    total:             number
    stage:             string
    functional_ceiling:string
    foundation_gap:    number
    layer_scores:      Record<string, number>
    signals:           Record<string, number>
  }
  locked_at:       string
  supabase_cycle_id?: string
  child_id?:       string
  attachments?:    Array<{ name: string; size: number; type: string }>
}

// ── Constants (from lib/ontology — single source of truth) ────
import { L2_BLOCKS, LAYER_IDS, B2L, BLOCK_WEIGHTS as BW } from '@/lib/ontology'

// Initial block state
function initBlockState(): Record<string, BlockState> {
  const state: Record<string, BlockState> = {}
  Object.keys(B2L).forEach(k => {
    state[k] = {
      score:          null,
      directionality: null,
      flag:           'none',
      note:           '',
    }
  })
  return state
}

function initMetaState(): MetaState {
  return {
    childName:      '',
    childDob:       '',
    parentName:     '',
    parentEmail:    '',
    parentPhone:    '',
    evaluatorName:  '',
    evalDate:       new Date().toISOString().split('T')[0],
    evalTimeStart:  '',
    evalTimeEnd:    '',
    knowledgeDomain:'senior_therapist',
    isClinic:       false,
    selectedChildId: null,
    parentId:        null,
  }
}

// ── Engine — delegates to the shared full v3 engine (lib/engine.ts) ───────────
// Maps the engine result into EngineResult and derives functional_ceiling /
// foundation_gap from the post-lock layer scores.

function runEngine(blocks: Record<string, BlockState>): EngineResult {
  const nums: Record<string, number> = {}
  for (const k in blocks) nums[k] = blocks[k]?.score ?? 0
  const r = engineV3(nums)   // { total, stage, signals, layerScores, lockActive }

  // Functional ceiling = highest layer with a post-lock score >= 2.0
  let functional_ceiling = 'L0'
  LAYER_IDS.forEach(l => { if ((r.layerScores[l] ?? 0) >= 2.0) functional_ceiling = l })
  const foundation_gap = LAYER_IDS.indexOf(functional_ceiling) - LAYER_IDS.indexOf(r.stage)

  return {
    adj:                r.layerScores,
    sig:                r.signals,
    tot:                r.total,
    stage:              r.stage,
    functional_ceiling,
    foundation_gap,
    lock:               r.lockActive,
  }
}

// ── Hook ──────────────────────────────────────────────────────

export function useBaseline() {
  const [blocks, setBlocks] = useState<Record<string, BlockState>>(initBlockState)
  const [meta, setMeta]     = useState<MetaState>(initMetaState)
  const [engine, setEngine] = useState<EngineResult>(() => runEngine(initBlockState()))
  const [isLocked, setIsLocked] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Computed: blocks entered count
  const enteredCount = Object.values(blocks).filter(b => b.score !== null).length
  const totalCount   = Object.keys(blocks).length

  // Update single block score
  const setScore = useCallback((blockKey: string, value: number | null) => {
    setBlocks(prev => {
      const next = { ...prev, [blockKey]: { ...prev[blockKey], score: value } }
      // Recompute engine
      setEngine(runEngine(next))
      return next
    })
  }, [])

  // Update directionality (L2 blocks only)
  const setDir = useCallback((blockKey: string, dir: Directionality) => {
    setBlocks(prev => ({ ...prev, [blockKey]: { ...prev[blockKey], directionality: dir } }))
  }, [])

  // Update flag
  const setFlag = useCallback((blockKey: string, flag: FlagValue) => {
    setBlocks(prev => ({ ...prev, [blockKey]: { ...prev[blockKey], flag } }))
  }, [])

  // Update note
  const setNote = useCallback((blockKey: string, note: string) => {
    setBlocks(prev => ({ ...prev, [blockKey]: { ...prev[blockKey], note } }))
  }, [])

  // Update meta field
  const setMetaField = useCallback(<K extends keyof MetaState>(key: K, value: MetaState[K]) => {
    setMeta(prev => ({ ...prev, [key]: value }))
  }, [])

  // Build output object for localStorage + Supabase
  const buildOutput = useCallback((): BaselineOutput => {
    const res = engine ?? runEngine(blocks)
    const baselineBlocks: BlocksMap = {}
    Object.entries(blocks).forEach(([k, b]) => {
      const block: CanonicalBlock = {
        score:          b.score ?? 0,
        directionality: b.directionality,
        source:         meta.isClinic ? 'clinical' : 'therapist',
      }
      if (L2_BLOCKS.includes(k) && b.directionality) block.directionality = b.directionality
      baselineBlocks[k] = block
    })

    return {
      child: {
        name:         meta.childName,
        dob:          meta.childDob,
        parent_email: meta.parentEmail,
        parent_phone: meta.parentPhone,
        parent_name:  meta.parentName,
      },
      evaluator_name:  meta.evaluatorName,
      eval_date:       meta.evalDate,
      eval_time:       { start: meta.evalTimeStart, end: meta.evalTimeEnd },
      baseline_source: meta.isClinic ? 'clinical' : 'behavioral',
      knowledge_domain:meta.knowledgeDomain,
      baseline_blocks: baselineBlocks,
      engine_snapshot: {
        total:             res.tot,
        stage:             res.stage,
        functional_ceiling:res.functional_ceiling,
        foundation_gap:    res.foundation_gap,
        layer_scores:      res.adj,
        signals:           res.sig,
      },
      locked_at: new Date().toISOString(),
    }
  }, [blocks, meta, engine])

  return {
    // State
    blocks, meta, engine, isLocked, isSaving, saveError,
    enteredCount, totalCount,
    // Actions
    setScore, setDir, setFlag, setNote, setMetaField,
    buildOutput,
    setIsLocked, setIsSaving, setSaveError,
    // Constants
    LAYER_IDS, B2L, BW, L2_BLOCKS,
  }
}
