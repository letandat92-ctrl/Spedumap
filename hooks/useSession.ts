'use client'

import { useState, useEffect, useCallback } from 'react'
import { LS_KEYS } from '@/types/spedumap'
import type { CanonicalBlock } from '@/types/spedumap'

// ── Types ─────────────────────────────────────────────────────

export type LocalScore = -2 | -1 | 0 | 1 | 2

export interface SessionInfo {
  therapistName: string
  timeStart:     string
  timeEnd:       string
  location:      'clinic' | 'home' | 'school' | 'online'
}

const DEFAULT_INFO: SessionInfo = {
  therapistName: '',
  timeStart:     '',
  timeEnd:       '',
  location:      'clinic',
}

export interface ActivityEntry {
  block:       string
  localScore:  LocalScore | null
  note:        string
  exercise:    string        // "Bài tập" — intervention activity
  purpose:     string        // "Mục đích" — focus / downstream purpose
  solutionId:  string | null // solution_library.id when picked from autocomplete; null on free typing
}

// Observed progress on a non-target block (template obs-picker).
export interface ObservedActivity {
  block: string
  note:  string
}

// Regression classifier — template 3-way (regWarnBox).
export type RegressionClass = 'transitional' | 'pathological' | 'noise'

export const LAYER_IDS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']

// delta map — mirrors spedumap_config.js
const LOCAL_TO_DELTA: Record<number, number> = {
  '-2': -0.50, '-1': -0.20, '0': 0.00, '1': 0.20, '2': 0.40,
}

function getBlockScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

function makeBlock(score: number): CanonicalBlock {
  return { score: Math.min(4, Math.max(0, parseFloat(score.toFixed(3)))) }
}

// Compute current state from baseline + all previous sessions
function computeCurrent(cycle: Record<string, unknown>): Record<string, number> {
  const cur: Record<string, number> = {}
  const baseline = (cycle.baseline as {blocks: Record<string, unknown>})?.blocks || {}
  for (const [k, v] of Object.entries(baseline)) cur[k] = getBlockScore(v)

  const observed = (cycle.observed_blocks as Array<{block:string; baseline_original: unknown}>) || []
  for (const ob of observed) cur[ob.block] = getBlockScore(ob.baseline_original)

  const sessions = (cycle.daily_sessions as Array<{activities: Array<{block:string; current_after: unknown}>, observed_activities: Array<{block:string; current_after: unknown}>}>) || []
  for (const s of sessions) {
    for (const a of (s.activities || [])) cur[a.block] = getBlockScore(a.current_after)
    for (const a of (s.observed_activities || [])) cur[a.block] = getBlockScore(a.current_after)
  }
  return cur
}

// ── Hook ──────────────────────────────────────────────────────

export function useSession() {
  const [cycle, setCycle]       = useState<Record<string, unknown> | null>(null)
  const [activities, setActivities] = useState<Record<string, ActivityEntry>>({})
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(DEFAULT_INFO)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [therapistNote, setTherapistNote] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // ── New session-detail state (backed by daily_sessions columns / JSONB) ──
  const [observedActivities, setObservedActivities] = useState<ObservedActivity[]>([])
  const [cooperationStars, setCooperationStars]     = useState<number | null>(null)
  const [layerEval, setLayerEvalState]              = useState<Record<string, number | null>>(
    () => Object.fromEntries(LAYER_IDS.map(l => [l, null])) as Record<string, number | null>
  )
  // Regression classifier — template 3-way (backed by regression_class text).
  const [regressionClass, setRegressionClass]       = useState<RegressionClass | null>(null)
  const [regressionReason, setRegressionReason]     = useState('')
  const [planNote, setPlanNote]                     = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.ACTIVE_CYCLE)
      if (!raw) { setLoadError('Chưa có chu kỳ active. Vui lòng mở chu kỳ trước.'); return }
      const parsed = JSON.parse(raw)
      setCycle(parsed)
      // Init activities from target blocks (with suggested exercise/purpose)
      const target = (parsed.target as {blocks: Record<string, unknown>})?.blocks || {}
      const init: Record<string, ActivityEntry> = {}
      for (const k of Object.keys(target)) {
        init[k] = {
          block:      k,
          localScore: null,
          note:       '',
          exercise:   '',
          purpose:    '',
          solutionId: null,
        }
      }
      setActivities(init)
    } catch {
      setLoadError('Không đọc được active cycle.')
    }
  }, [])

  const setLocalScore = useCallback((block: string, score: LocalScore | null) => {
    setActivities(prev => ({ ...prev, [block]: { ...prev[block], localScore: score } }))
  }, [])

  const setActivityNote = useCallback((block: string, note: string) => {
    setActivities(prev => ({ ...prev, [block]: { ...prev[block], note } }))
  }, [])

  // Free typing in the activity input → exercise text; clears any picked solution link.
  const setExercise = useCallback((block: string, exercise: string) => {
    setActivities(prev => ({ ...prev, [block]: { ...prev[block], exercise, solutionId: null } }))
  }, [])

  // Picked from solution_library autocomplete → fill title + keep the library id.
  const selectSolution = useCallback((block: string, solutionId: string, title: string) => {
    setActivities(prev => ({ ...prev, [block]: { ...prev[block], exercise: title, solutionId } }))
  }, [])

  const setPurpose = useCallback((block: string, purpose: string) => {
    setActivities(prev => ({ ...prev, [block]: { ...prev[block], purpose } }))
  }, [])

  // ── Observed activities (non-target blocks) ──
  const addObserved = useCallback((block: string) => {
    setObservedActivities(prev => prev.some(o => o.block === block) ? prev : [...prev, { block, note: '' }])
  }, [])
  const removeObserved = useCallback((index: number) => {
    setObservedActivities(prev => prev.filter((_, i) => i !== index))
  }, [])
  const setObservedNote = useCallback((index: number, note: string) => {
    setObservedActivities(prev => prev.map((o, i) => i === index ? { ...o, note } : o))
  }, [])

  // ── Layer evaluation (L0–L7 → 0–6) ──
  const setLayerEval = useCallback((layer: string, value: number | null) => {
    setLayerEvalState(prev => ({ ...prev, [layer]: value }))
  }, [])

  // Build session output for Supabase + localStorage
  const buildSessionOutput = useCallback(() => {
    if (!cycle) return null
    const cur = computeCurrent(cycle)
    const target = (cycle.target as {blocks: Record<string, unknown>})?.blocks || {}
    const sessionIndex = ((cycle.daily_sessions as unknown[]) || []).length + 1

    const builtActivities = Object.entries(activities)
      .filter(([, a]) => a.localScore !== null)
      .map(([block, a]) => {
        const localScore = a.localScore!
        const targetBlock = target[block]
        const baselineScore = getBlockScore((cycle.baseline as {blocks: Record<string, unknown>})?.blocks?.[block])
        const targetScore   = getBlockScore(targetBlock)
        const targetDelta   = targetScore - baselineScore
        const delta         = targetDelta * (LOCAL_TO_DELTA[localScore] ?? 0)
        const currentAfter  = makeBlock(Math.min(targetScore, (cur[block] ?? baselineScore) + delta))
        return {
          block,
          local_score:   localScore,
          delta:         parseFloat(delta.toFixed(3)),
          current_after: currentAfter,
          target_delta:  targetDelta,
          activity_note: a.note || null,
          exercise:      a.exercise || null,
          purpose:       a.purpose || null,
          solution_id:   a.solutionId ?? null,
          solution_title: a.exercise || null,
        }
      })

    // Observed activities carry a no-change current_after so computeCurrent()
    // does not zero these blocks when the session is reloaded.
    const builtObserved = observedActivities.map(o => ({
      block:         o.block,
      note:          o.note || null,
      current_after: makeBlock(cur[o.block] ?? 0),
    }))

    return {
      session_id:          crypto.randomUUID(),
      cycle_id:            cycle.cycle_id as string,
      session_index:       sessionIndex,
      date:                sessionDate,
      is_first_session:    sessionIndex === 1,
      therapist_name:      sessionInfo.therapistName,
      time_start:          sessionInfo.timeStart,
      time_end:            sessionInfo.timeEnd,
      location:            sessionInfo.location,
      activities:          builtActivities,
      observed_activities: builtObserved,
      notes:               therapistNote || null,
      cooperation_stars:   cooperationStars,
      regression_class:    regressionClass,
      regression_flag:     regressionClass !== null,  // derived — keeps the boolean column consistent
      regression_reason:   regressionReason || null,
      plan_note:           planNote || null,
      layer_eval:          layerEval,
      parent_confirmed:    false,
      parent_email:        (cycle.child as {parent_email?: string})?.parent_email || null,
    }
  }, [cycle, activities, sessionDate, therapistNote, sessionInfo, observedActivities, cooperationStars, regressionClass, regressionReason, planNote, layerEval])

  // After submit — push session to localStorage
  const commitSession = useCallback((sessionData: ReturnType<typeof buildSessionOutput>) => {
    if (!cycle || !sessionData) return
    const updated = {
      ...cycle,
      daily_sessions: [...((cycle.daily_sessions as unknown[]) || []), {
        session_index:       sessionData.session_index,
        date:                sessionData.date,
        activities:          sessionData.activities,
        observed_activities: sessionData.observed_activities,
        notes:               sessionData.notes,
        cooperation_stars:   sessionData.cooperation_stars,
        regression_class:    sessionData.regression_class,
        regression_flag:     sessionData.regression_flag,
        regression_reason:   sessionData.regression_reason,
        plan_note:           sessionData.plan_note,
        layer_eval:          sessionData.layer_eval,
        parent_confirmed:    false,
      }]
    }
    localStorage.setItem(LS_KEYS.ACTIVE_CYCLE, JSON.stringify(updated))
    setCycle(updated)
    setSubmitted(true)
  }, [cycle])

  // Computed: current scores (baseline + committed sessions)
  const currentScores = cycle ? computeCurrent(cycle) : {}

  // Live scores = committed current + IN-PROGRESS activity deltas (not yet submitted).
  // Mirrors buildSessionOutput's current_after so the summary delta is real-time.
  const liveScores: Record<string, number> = { ...currentScores }
  if (cycle) {
    const baseB   = (cycle.baseline as { blocks: Record<string, unknown> })?.blocks || {}
    const targetB = (cycle.target as { blocks: Record<string, unknown> })?.blocks || {}
    for (const [block, a] of Object.entries(activities)) {
      if (a.localScore === null) continue
      const baseVal     = getBlockScore(baseB[block])
      const targetScore = getBlockScore(targetB[block])
      const targetDelta = targetScore - baseVal
      const cur         = currentScores[block] ?? baseVal
      liveScores[block] = Math.min(targetScore, cur + targetDelta * (LOCAL_TO_DELTA[a.localScore] ?? 0))
    }
  }

  const sessionIndex  = cycle ? ((cycle.daily_sessions as unknown[]) || []).length + 1 : 1
  const plannedSessions = (cycle?.planned_sessions as number) || 24

  return {
    cycle, activities, sessionInfo, sessionDate, therapistNote, loadError, submitted,
    currentScores, liveScores, sessionIndex, plannedSessions,
    observedActivities, cooperationStars, layerEval, regressionClass, regressionReason, planNote,
    setLocalScore, setActivityNote, setExercise, setPurpose, selectSolution,
    addObserved, removeObserved, setObservedNote,
    setCooperationStars, setLayerEval,
    setRegressionClass, setRegressionReason, setPlanNote,
    setSessionDate, setTherapistNote, setSessionInfo,
    buildSessionOutput, commitSession, setSubmitted,
  }
}
