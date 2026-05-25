'use client'

import { useState, useEffect, useCallback } from 'react'
import { LS_KEYS } from '@/types/spedumap'
import type { GoalOutput } from '@/hooks/useGoal'

export interface CycleFormState {
  cycleName:       string
  startDate:       string
  endDate:         string
  plannedSessions: number
  isSandbox:       boolean
  sandboxHypothesis: string
}

function initForm(data: GoalOutput | null): CycleFormState {
  const start = data?.cycle_settings?.start_date || new Date().toISOString().split('T')[0]
  const startD = new Date(start)
  const endD   = new Date(startD)
  endD.setDate(endD.getDate() + (data?.cycle_settings?.duration ?? 8) * 7)
  return {
    cycleName:        '',
    startDate:        start,
    endDate:          endD.toISOString().split('T')[0],
    plannedSessions:  data?.cycle_settings?.planned_sessions ?? 24,
    isSandbox:        false,
    sandboxHypothesis:'',
  }
}

export function useCycle() {
  const [data, setData]   = useState<GoalOutput | null>(null)
  const [form, setForm]   = useState<CycleFormState>(initForm(null))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isOpened, setIsOpened]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.CYCLE)
      if (!raw) { setLoadError('Chưa có Goal Setting. Vui lòng hoàn thành Goal Setting trước.'); return }
      const parsed = JSON.parse(raw) as GoalOutput
      setData(parsed)
      setForm(initForm(parsed))
    } catch {
      setLoadError('Không đọc được goal data.')
    }
  }, [])

  const setFormField = useCallback(<K extends keyof CycleFormState>(key: K, value: CycleFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const buildActiveCycle = useCallback(() => {
    if (!data) return null
    return {
      cycle_id:        'C_' + Date.now(),
      cycle_name:      form.cycleName,
      status:          'active' as const,
      baseline_source: data.baseline_source || 'behavioral',
      started_at:      form.startDate,
      expected_end:    form.endDate,
      planned_sessions:form.plannedSessions,
      child:           data.child,
      baseline: {
        blocks:      data.baseline_blocks,
        total_score: data.engine_snapshot?.total ?? 0,
        stage:       data.engine_snapshot?.stage ?? 'L0',
        date:        data.eval_date,
      },
      target:          { blocks: data.target_blocks },
      goal_detail:     data.goal_detail,
      observed_blocks: [],
      daily_sessions:  [],
      governance_meta: {
        knowledge_domain:        data.knowledge_domain ?? 'senior_therapist',
        protocol_version:        'v1.0',
        scoring_version:         '1.1',
        engine_version:          '3.2',
        trajectory_model_version: null,
        is_sandbox:               form.isSandbox,
        sandbox_hypothesis:       form.isSandbox ? form.sandboxHypothesis : null,
      },
      supabase_cycle_id: data.supabase_cycle_id ?? null,
      created_at:      new Date().toISOString(),
    }
  }, [data, form])

  return {
    data, form, loadError, isOpened, saving, saveError,
    setFormField, buildActiveCycle,
    setSaving, setSaveError, setIsOpened,
  }
}
