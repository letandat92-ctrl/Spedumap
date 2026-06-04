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

// ── Constants (from lib/ontology — single source of truth) ────
import { L2_BLOCKS, LAYER_IDS, B2L, BLOCK_WEIGHTS as BW, ONTOLOGY_VERSION } from '@/lib/ontology'

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

      // ── Engine validation: aggregate this cycle's solution_outcomes ──────
      // layer_eval_avg = AVG(layer_eval_score) per layer (therapist's 0–6 mark).
      // engine_validation = predicted (Σ block_delta) vs actual (layer_eval_avg)
      // per layer, with drift = actual − predicted. Both are best-effort: a
      // cycle with no library-linked activities simply yields empty maps.
      const layerEvalAvg: Record<string, number> = {}
      const engineValidation: Record<string, { predicted: number; actual: number; drift: number }> = {}
      const { data: outcomes } = await supabase
        .from('solution_outcomes')
        .select('layer, block_delta, layer_eval_score')
        .eq('cycle_id', cycleId)

      if (outcomes && outcomes.length) {
        const agg: Record<string, { evalSum: number; evalN: number; deltaSum: number }> = {}
        for (const o of outcomes as Array<{ layer: string | null; block_delta: number | null; layer_eval_score: number | null }>) {
          if (!o.layer) continue
          const a = agg[o.layer] ?? (agg[o.layer] = { evalSum: 0, evalN: 0, deltaSum: 0 })
          if (typeof o.layer_eval_score === 'number') { a.evalSum += o.layer_eval_score; a.evalN += 1 }
          if (typeof o.block_delta === 'number') a.deltaSum += o.block_delta
        }
        const round2 = (n: number) => Math.round(n * 100) / 100
        for (const [layer, a] of Object.entries(agg)) {
          const actual    = a.evalN ? round2(a.evalSum / a.evalN) : 0
          const predicted = round2(a.deltaSum)
          if (a.evalN) layerEvalAvg[layer] = actual
          engineValidation[layer] = { predicted, actual, drift: round2(actual - predicted) }
        }
      }

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
            protocol_version: `engine_v${ONTOLOGY_VERSION}`,
            layer_eval_avg:    layerEvalAvg,
            engine_validation: engineValidation,
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
