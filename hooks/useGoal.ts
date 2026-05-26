'use client'

import { useState, useCallback, useEffect } from 'react'
import type { BlocksMap, CanonicalBlock } from '@/types/spedumap'
import { LS_KEYS } from '@/types/spedumap'

// ── Types ─────────────────────────────────────────────────────

export interface GoalEntry {
  key:        string
  delta:      number    // target_score - baseline_score
  optionId?:  string    // selected preset option id
  note?:      string
  regression: boolean
  regressionNote?: string
}

export interface CycleSettings {
  duration:         number   // e.g. 8
  unit:             'weeks' | 'sessions' | 'months'
  start_date:       string   // ISO date
  planned_sessions: number
  notes:            string
}

export interface BaselineData {
  child:              { id?: string; name: string; dob?: string; parent_email?: string; parent_name?: string }
  baseline_blocks:    BlocksMap
  engine_snapshot:    { total: number; stage: string; functional_ceiling?: string; layer_scores?: Record<string, number>; signals?: Record<string, number> }
  baseline_source?:   string
  eval_date?:         string
  supabase_cycle_id?: string
  knowledge_domain?:  string
}

export interface GoalOutput {
  child:             BaselineData['child']
  baseline_blocks:   BlocksMap
  target_blocks:     BlocksMap
  goal_detail:       Record<string, GoalEntry>
  baseline:          { blocks: BlocksMap; total_score: number; stage: string; date?: string }
  target:            { blocks: BlocksMap }
  daily_sessions:    []
  observed_blocks:   []
  engine_snapshot:   BaselineData['engine_snapshot']
  baseline_source:   string
  eval_date?:        string
  supabase_cycle_id?: string
  knowledge_domain:  string
  cycle_settings:    CycleSettings
}

// Delta options — mirrors HTML getScaleOptions()
export function getScaleOptions(baselineScore: number) {
  const remaining = 4.0 - baselineScore
  const opts = [
    { id: 'stay', label: 'Stay\nSame',        delta: 0,                          color: '#888' },
    { id: 's1',   label: 'Slightly\nBetter',  delta: Math.min(0.5, remaining),   color: '#4A9A60' },
    { id: 's2',   label: 'Little\nBetter',    delta: Math.min(1.0, remaining),   color: '#2A7A4A' },
    { id: 's3',   label: 'Moderate\nBetter',  delta: Math.min(1.5, remaining),   color: '#1A6A3A' },
    { id: 's4',   label: 'Much\nBetter',      delta: Math.min(2.0, remaining),   color: '#0F5C30' },
    { id: 's5',   label: 'All\nBetter',       delta: remaining,                  color: '#0A4A28' },
  ]
  return opts.map((o, i) => ({
    ...o,
    locked: baselineScore >= 4.0 ? i > 0
           : baselineScore >= 3.5 ? i > 1
           : baselineScore >= 3.0 ? i > 2
           : false,
  }))
}

export const DELTA_OPTIONS = [] // kept for compatibility — use getScaleOptions() instead

function makeBlock(score: number): CanonicalBlock {
  return { score: Math.min(4, Math.max(0, parseFloat(score.toFixed(2)))) }
}

function getBlockScore(block: CanonicalBlock | undefined): number {
  if (!block) return 0
  return typeof block === 'object' ? (block.score ?? 0) : Number(block)
}

function initCycleSettings(): CycleSettings {
  return {
    duration:         8,
    unit:             'weeks',
    start_date:       new Date().toISOString().split('T')[0],
    planned_sessions: 24,
    notes:            '',
  }
}

// ── Hook ──────────────────────────────────────────────────────

export function useGoal() {
  const [bd, setBd]           = useState<BaselineData | null>(null)
  const [goals, setGoals]     = useState<Record<string, GoalEntry>>({})
  const [settings, setSettings] = useState<CycleSettings>(initCycleSettings)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load baseline from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.BASELINE)
      if (!raw) { setLoadError('Chưa có baseline. Vui lòng hoàn thành Baseline Setting trước.'); return }
      const data = JSON.parse(raw) as BaselineData
      if (!data.baseline_blocks) { setLoadError('Baseline data không hợp lệ.'); return }
      setBd(data)
    } catch {
      setLoadError('Không đọc được baseline từ localStorage.')
    }
  }, [])

  // Update cycle settings field
  const setSettingsField = useCallback(<K extends keyof CycleSettings>(key: K, value: CycleSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      // Auto-compute planned_sessions
      if (key === 'duration' || key === 'unit') {
        next.planned_sessions = next.unit === 'weeks'
          ? (Number(next.duration) * 3)
          : Number(next.duration)
      }
      return next
    })
  }, [])

  // Toggle a block in/out of goals
  const toggleGoal = useCallback((blockKey: string) => {
    setGoals(prev => {
      if (blockKey in prev) {
        const next = { ...prev }
        delete next[blockKey]
        return next
      }
      const baselineScore = bd ? getBlockScore(bd.baseline_blocks[blockKey]) : 0
      const remaining = 4 - baselineScore
      const defaultDelta = remaining >= 1.0 ? 1.0 : parseFloat(remaining.toFixed(1))
      return {
        ...prev,
        [blockKey]: {
          key:        blockKey,
          delta:      defaultDelta,
          optionId:   'standard',
          regression: false,
        }
      }
    })
  }, [bd])

  // Update goal delta
  const setGoalDelta = useCallback((blockKey: string, delta: number, optionId?: string) => {
    setGoals(prev => {
      if (!(blockKey in prev)) return prev
      return { ...prev, [blockKey]: { ...prev[blockKey], delta, optionId: optionId ?? 'custom' } }
    })
  }, [])

  // Toggle regression flag
  const toggleRegression = useCallback((blockKey: string) => {
    setGoals(prev => {
      if (!(blockKey in prev)) return prev
      return { ...prev, [blockKey]: { ...prev[blockKey], regression: !prev[blockKey].regression } }
    })
  }, [])

  // Set regression clinical note
  const setRegressionNote = useCallback((blockKey: string, note: string) => {
    setGoals(prev => {
      if (!(blockKey in prev)) return prev
      return { ...prev, [blockKey]: { ...prev[blockKey], regressionNote: note } }
    })
  }, [])

  // Build output for localStorage + Supabase
  const buildOutput = useCallback((): GoalOutput | null => {
    if (!bd) return null
    const targetBlocks: BlocksMap = {}
    for (const [k, g] of Object.entries(goals)) {
      const baseScore = getBlockScore(bd.baseline_blocks[k])
      targetBlocks[k] = makeBlock(baseScore + g.delta)
    }
    return {
      child:             bd.child,
      baseline_blocks:   bd.baseline_blocks,
      target_blocks:     targetBlocks,
      goal_detail:       goals,
      baseline: {
        blocks:      bd.baseline_blocks,
        total_score: bd.engine_snapshot?.total ?? 0,
        stage:       bd.engine_snapshot?.stage ?? 'L0',
        date:        bd.eval_date,
      },
      target:            { blocks: targetBlocks },
      daily_sessions:    [],
      observed_blocks:   [],
      engine_snapshot:   bd.engine_snapshot,
      baseline_source:   bd.baseline_source || 'behavioral',
      eval_date:         bd.eval_date,
      supabase_cycle_id: bd.supabase_cycle_id,
      knowledge_domain:  bd.knowledge_domain || 'senior_therapist',
      cycle_settings:    settings,
    }
  }, [bd, goals, settings])

  return {
    bd, goals, settings, loadError,
    toggleGoal, setGoalDelta, toggleRegression, setRegressionNote,
    setSettingsField, buildOutput,
    getBlockScore,
  }
}
