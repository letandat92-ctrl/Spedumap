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
}

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.ACTIVE_CYCLE)
      if (!raw) { setLoadError('Chưa có chu kỳ active. Vui lòng mở chu kỳ trước.'); return }
      const parsed = JSON.parse(raw)
      setCycle(parsed)
      // Init activities from target blocks
      const target = (parsed.target as {blocks: Record<string, unknown>})?.blocks || {}
      const init: Record<string, ActivityEntry> = {}
      for (const k of Object.keys(target)) {
        init[k] = { block: k, localScore: null, note: '' }
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
        }
      })

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
      observed_activities: [],
      notes:               therapistNote || null,
      parent_confirmed:    false,
      parent_email:        (cycle.child as {parent_email?: string})?.parent_email || null,
    }
  }, [cycle, activities, sessionDate, therapistNote])

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
        parent_confirmed:    false,
      }]
    }
    localStorage.setItem(LS_KEYS.ACTIVE_CYCLE, JSON.stringify(updated))
    setCycle(updated)
    setSubmitted(true)
  }, [cycle])

  // Computed: current scores
  const currentScores = cycle ? computeCurrent(cycle) : {}
  const sessionIndex  = cycle ? ((cycle.daily_sessions as unknown[]) || []).length + 1 : 1
  const plannedSessions = (cycle?.planned_sessions as number) || 24

  return {
    cycle, activities, sessionInfo, sessionDate, therapistNote, loadError, submitted,
    currentScores, sessionIndex, plannedSessions,
    setLocalScore, setActivityNote, setSessionDate, setTherapistNote,
    setSessionInfo,
    buildSessionOutput, commitSession, setSubmitted,
  }
}
