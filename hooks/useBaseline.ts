'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  CanonicalBlock, BlocksMap, CanonicalBaseline,
  Directionality, UserRole,
} from '@/types/spedumap'

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
}

export interface EngineResult {
  rough:             Record<string, number>
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

// ── Constants (mirror spedumap_config.js) ─────────────────────
const L2_BLOCKS = ['vestibular','proprioception','auditory','visual','tactile','interoception','taste_smell']

const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']

const B2L: Record<string, string> = {
  sleep:'L0',microbiome:'L0',nutrition:'L0',immune:'L0',metabolic:'L0',
  arousal:'L1',reflex_survival:'L1',reflex_postural:'L1',reflex_cortical:'L1',tone:'L1',ns_stability:'L1',
  vestibular:'L2',proprioception:'L2',auditory:'L2',visual:'L2',tactile:'L2',interoception:'L2',taste_smell:'L2',
  motor_planning:'L3',gross_motor:'L3',fine_motor:'L3',postural_control:'L3',bilateral_coord:'L3',
  attention:'L4',auditory_processing:'L4',visual_processing:'L4',wm_link:'L4',
  oral_language:'L5',word_finding:'L5',phonemic_awareness:'L5',auditory_memory:'L5',visual_memory:'L5',
  self_control:'L6',behavior:'L6',social_skills:'L6',daily_living:'L6',
  math:'L7',writing:'L7',reading:'L7',
}

const BW: Record<string, Record<string, number>> = {
  L0:{sleep:.25,microbiome:.25,nutrition:.20,immune:.15,metabolic:.15},
  L1:{arousal:.40,reflex_survival:.10,reflex_postural:.10,reflex_cortical:.05,tone:.20,ns_stability:.15},
  L2:{vestibular:.20,proprioception:.15,auditory:.15,visual:.15,tactile:.10,interoception:.10,taste_smell:.15},
  L3:{motor_planning:.2,gross_motor:.2,fine_motor:.2,postural_control:.2,bilateral_coord:.2},
  L4:{attention:.35,auditory_processing:.30,visual_processing:.30,wm_link:.05},
  L5:{oral_language:.2,word_finding:.2,phonemic_awareness:.2,auditory_memory:.2,visual_memory:.2},
  L6:{self_control:.25,behavior:.25,social_skills:.25,daily_living:.25},
  L7:{math:1/3,writing:1/3,reading:1/3},
}

const LAYER_W: Record<string, number> = {L0:18,L1:16,L2:14,L3:12,L4:12,L5:10,L6:10,L7:8}

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
  }
}

// ── Engine (mirrors ui_baseline_setting engine()) ─────────────

function runEngine(blocks: Record<string, BlockState>): EngineResult {
  // Step 1: raw layer scores
  const rough: Record<string, number> = {}
  LAYER_IDS.forEach(lid => {
    const bw = BW[lid]
    let sum = 0
    Object.keys(bw).forEach(k => {
      sum += (blocks[k]?.score ?? 0) * bw[k]
    })
    rough[lid] = sum
  })

  // Step 2: deficit signals
  const T = 2.5
  const sensorimotor = Math.max(0, T - (rough.L2 * 0.55 + rough.L3 * 0.45))
  const regulation   = Math.max(0, T - (rough.L1 * 0.70 + rough.L0 * 0.30))
  const cognitive    = Math.max(0, T - (rough.L4 * 0.60 + rough.L5 * 0.40))
  const sig = { sensorimotor, regulation, cognitive }

  // Step 3: dynamic weighting (simplified — full version in spedumap_config.js)
  const adj: Record<string, number> = { ...rough }

  // Step 4: layer lock
  for (let i = 1; i < LAYER_IDS.length; i++) {
    const prev = rough[LAYER_IDS[i-1]]
    if (prev < 1.5) adj[LAYER_IDS[i]] *= 0.4
    else if (prev < 2.0) adj[LAYER_IDS[i]] *= 0.7
  }

  // Step 5: total score
  let tot = 0
  LAYER_IDS.forEach(lid => { tot += (adj[lid] / 4.0) * LAYER_W[lid] })

  // Step 6: stage (full-chain check using rough)
  let stage = 'L0'
  for (let i = 0; i < LAYER_IDS.length; i++) {
    const l = LAYER_IDS[i]
    const foundationBroken = LAYER_IDS.slice(0, i).some(prev => rough[prev] < 2.0)
    if (foundationBroken) break
    if (rough[l] >= 2.5) stage = l
    else break
  }

  // Step 7: functional ceiling
  let functional_ceiling = 'L0'
  LAYER_IDS.forEach(l => { if (rough[l] >= 2.0) functional_ceiling = l })

  const foundation_gap = LAYER_IDS.indexOf(functional_ceiling) - LAYER_IDS.indexOf(stage)
  const lock = LAYER_IDS.slice(1).some((_, i) => rough[LAYER_IDS[i]] < 2.0)

  return { rough, adj, sig, tot, stage, functional_ceiling, foundation_gap, lock }
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
