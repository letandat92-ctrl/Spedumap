'use client'

// hooks/useRetest.ts
// Blind end-of-cycle retest. Reuses the baseline block-input model (39 blocks)
// but loads ONLY child metadata for the cycle — never the baseline / target /
// previous scores — so the assessment is blind. On lock it runs the shared v3
// engine over the freshly entered blocks and writes the result into
// cycles.retest_baseline, flips status → 'closed', and stamps ended_at /
// retest_locked_at.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { runEngine } from '@/lib/engine'
import type { Directionality } from '@/types/spedumap'

export type FlagValue = 'none' | 'confirmed' | 'retest' | 'assumed'

export interface RetestBlockState {
  score:          number | null
  directionality: Directionality
  flag:           FlagValue
  note:           string
}

export interface RetestMeta {
  childName: string
  childDob:  string
  cycleId:   string
  startedAt: string
}

// ── Block → layer map + raw block weights (mirror useBaseline) ─────────────
const L2_BLOCKS = ['vestibular', 'proprioception', 'auditory', 'visual', 'tactile', 'interoception', 'taste_smell']
const LAYER_IDS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']

const B2L: Record<string, string> = {
  sleep: 'L0', microbiome: 'L0', nutrition: 'L0', immune: 'L0', metabolic: 'L0',
  arousal: 'L1', reflex_survival: 'L1', reflex_postural: 'L1', reflex_cortical: 'L1', tone: 'L1', ns_stability: 'L1',
  vestibular: 'L2', proprioception: 'L2', auditory: 'L2', visual: 'L2', tactile: 'L2', interoception: 'L2', taste_smell: 'L2',
  motor_planning: 'L3', gross_motor: 'L3', fine_motor: 'L3', postural_control: 'L3', bilateral_coord: 'L3',
  attention: 'L4', auditory_processing: 'L4', visual_processing: 'L4', wm_link: 'L4',
  oral_language: 'L5', word_finding: 'L5', phonemic_awareness: 'L5', auditory_memory: 'L5', visual_memory: 'L5',
  self_control: 'L6', behavior: 'L6', social_skills: 'L6', daily_living: 'L6',
  math: 'L7', writing: 'L7', reading: 'L7',
}

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

function initBlockState(): Record<string, RetestBlockState> {
  const state: Record<string, RetestBlockState> = {}
  Object.keys(B2L).forEach(k => {
    state[k] = { score: null, directionality: null, flag: 'none', note: '' }
  })
  return state
}

export function useRetest(cycleId: string | null) {
  const [supabase] = useState(() => createClient())

  const [blocks, setBlocks]       = useState<Record<string, RetestBlockState>>(initBlockState)
  const [meta, setMeta]           = useState<RetestMeta | null>(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLocking, setIsLocking] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)

  // ── Load child metadata ONLY (blind: never read baseline/target/scores) ──
  useEffect(() => {
    // cycleId comes from useSearchParams(), resolved synchronously — a null/empty
    // value means the param is genuinely absent, so fail fast (never infinite-load).
    if (!cycleId) { setLoadError('Thiếu mã chu kỳ (cycle_id) trong URL'); setLoading(false); return }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const { data: cyc, error: cErr } = await supabase
          .from('cycles')
          .select('id, child_id, started_at, status')
          .eq('id', cycleId)
          .single()
        if (cErr || !cyc) throw new Error('Không tìm thấy chu kỳ')

        const { data: child, error: chErr } = await supabase
          .from('children')
          .select('name, dob')
          .eq('id', cyc.child_id)
          .single()
        if (chErr || !child) throw new Error('Không tìm thấy thông tin trẻ')

        if (!cancelled) {
          setMeta({
            childName: child.name ?? '',
            childDob:  child.dob ?? '',
            cycleId:   cyc.id,
            startedAt: cyc.started_at ?? '',
          })
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu chu kỳ')
          setLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [cycleId, supabase])

  const enteredCount = Object.values(blocks).filter(b => b.score !== null).length
  const totalCount   = Object.keys(blocks).length

  const setScore = useCallback((k: string, v: number | null) =>
    setBlocks(p => ({ ...p, [k]: { ...p[k], score: v } })), [])
  const setDir = useCallback((k: string, dir: Directionality) =>
    setBlocks(p => ({ ...p, [k]: { ...p[k], directionality: dir } })), [])
  const setFlag = useCallback((k: string, flag: FlagValue) =>
    setBlocks(p => ({ ...p, [k]: { ...p[k], flag } })), [])
  const setNote = useCallback((k: string, note: string) =>
    setBlocks(p => ({ ...p, [k]: { ...p[k], note } })), [])

  // ── Lock: run engine, persist retest_baseline, close the cycle ──
  const lock = useCallback(async (): Promise<boolean> => {
    if (!cycleId) { setLockError('Thiếu mã chu kỳ (cycle_id)'); return false }
    setIsLocking(true)
    setLockError(null)
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')

      const nums: Record<string, number> = {}
      for (const k in blocks) nums[k] = blocks[k].score ?? 0
      const r = runEngine(nums)

      const retestBlocks: Record<string, { score: number; directionality?: Directionality; source: string }> = {}
      for (const [k, b] of Object.entries(blocks)) {
        retestBlocks[k] = { score: b.score ?? 0, source: 'therapist' }
        if (L2_BLOCKS.includes(k) && b.directionality) retestBlocks[k].directionality = b.directionality
      }

      const nowIso = new Date().toISOString()
      const today  = nowIso.split('T')[0]

      const { error: updErr } = await supabase
        .from('cycles')
        .update({
          retest_baseline: {
            blocks:       retestBlocks,
            total_score:  r.total,
            stage:        r.stage,
            layer_scores: r.layerScores,
            signals:      r.signals,
            locked_at:    nowIso,
          },
          retest_locked_at: nowIso,
          status:           'closed',
          ended_at:         today,
          // Required by the validate_cycle_outcome_on_close trigger: the cycle
          // cannot move to 'closed' with a NULL cycle_outcome. The retest IS the
          // official end-of-cycle measurement, so record it here (blind-safe —
          // derived only from the freshly entered retest blocks).
          cycle_outcome: {
            computed_at:      nowIso,
            source:           'retest',
            total_score_end:  r.total,
            stage_end:        r.stage,
            signals_end:      r.signals,
            protocol_version: 'engine_v3.2',
          },
        })
        .eq('id', cycleId)

      if (updErr) throw new Error('Lỗi lưu kết quả retest: ' + updErr.message)
      return true
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Lỗi không xác định')
      return false
    } finally {
      setIsLocking(false)
    }
  }, [cycleId, blocks, supabase])

  return {
    blocks, meta, loading, loadError,
    enteredCount, totalCount,
    setScore, setDir, setFlag, setNote,
    lock, isLocking, lockError,
    LAYER_IDS, B2L, BW, L2_BLOCKS,
  }
}
