'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGoal, getScaleOptions } from '@/hooks/useGoal'
import { createClient } from '@/lib/supabase/client'
import { LS_KEYS } from '@/types/spedumap'
import { GoalKPI } from '@/components/charts/GoalKPI'
import { GoalChips } from '@/components/charts/GoalKPI'
import { GoalCharts } from '@/components/charts/GoalCharts'

export const dynamic = 'force-dynamic'


const LAYER_COLORS: Record<string, string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}

const BM: Record<string, { label: string; blocks: Record<string, string> }> = {
  L0:{label:'L0 · Sinh học', blocks:{sleep:'Sleep',microbiome:'Microbiome',nutrition:'Nutrition',immune:'Immune',metabolic:'Metabolic'}},
  L1:{label:'L1 · Thần kinh', blocks:{arousal:'Arousal',reflex_survival:'Reflex Survival',reflex_postural:'Reflex Postural',reflex_cortical:'Reflex Cortical',tone:'Muscle Tone',ns_stability:'Neural Stability'}},
  L2:{label:'L2 · Giác quan', blocks:{vestibular:'Vestibular',proprioception:'Proprioception',auditory:'Auditory',visual:'Visual',tactile:'Tactile',interoception:'Interoception',taste_smell:'Taste/Smell'}},
  L3:{label:'L3 · Vận động', blocks:{motor_planning:'Motor Planning',gross_motor:'Gross Motor',fine_motor:'Fine Motor',postural_control:'Postural Control',bilateral_coord:'Bilateral Coord.'}},
  L4:{label:'L4 · Xử lý', blocks:{attention:'Attention Focus',auditory_processing:'Auditory Processing',visual_processing:'Visual Processing',wm_link:'Working Memory Link'}},
  L5:{label:'L5 · Giao tiếp', blocks:{oral_language:'Oral Language',word_finding:'Word Finding',phonemic_awareness:'Phonemic Awareness',auditory_memory:'Auditory Memory',visual_memory:'Visual Memory'}},
  L6:{label:'L6 · QL Cuộc sống', blocks:{self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living'}},
  L7:{label:'L7 · Học thuật', blocks:{math:'Math',writing:'Writing',reading:'Reading'}},
}

const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']

export default function GoalPage() {
  const router = useRouter()
  const supabase = createClient()
  const {
    bd, goals, settings, loadError,
    toggleGoal, setGoalDelta, toggleRegression,
    setSettingsField, buildOutput, getBlockScore,
  } = useGoal()

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState('')

  const goalCount = Object.keys(goals).length

  async function handleConfirm() {
    if (!goalCount) return
    setSaving(true)
    setError(null)
    try {
      const output = buildOutput()
      if (!output) throw new Error('Không có baseline data')

      // Save to localStorage
      localStorage.setItem(LS_KEYS.CYCLE, JSON.stringify(output))

      // Supabase: update cycle target
      const cycleId = output.supabase_cycle_id
      if (cycleId) {
        const { error: sbErr } = await supabase
          .from('cycles')
          .update({ target: { blocks: output.target_blocks } })
          .eq('id', cycleId)
        if (sbErr) console.warn('Supabase update failed:', sbErr.message)
      }

      router.push('/therapist/cycle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm text-center p-6">
          <div className="text-[var(--red)] font-semibold mb-2">Chưa có Baseline</div>
          <p className="text-sm text-[var(--ink-3)] mb-4">{loadError}</p>
          <button
            onClick={() => router.push('/therapist/baseline')}
            className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm"
          >
            Đến Baseline Setting →
          </button>
        </div>
      </div>
    )
  }

  if (!bd) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">

      {/* ── LEFT: Block selector ── */}
      <div className="w-[380px] flex-shrink-0 border-r border-[var(--rule)] overflow-y-auto bg-white">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--navy)] px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-serif font-bold text-white text-sm">SPEDUMAP</span>
            <span className="text-white/50 text-xs ml-2">/ Goal Setting</span>
          </div>
          <div className="text-white/70 text-xs font-mono">{goalCount} blocks</div>
        </div>

        {/* Child info */}
        <div className="px-4 py-3 border-b border-[var(--rule-2)] bg-[var(--rule-2)]">
          <div className="text-xs font-semibold text-[var(--ink)]">{bd.child.name}</div>
          <div className="text-xs text-[var(--ink-3)]">
            Stage: <span className="font-mono font-bold text-[var(--navy)]">{bd.engine_snapshot.stage}</span>
            {' · '}Total: <span className="font-mono font-bold text-[var(--navy)]">{bd.engine_snapshot.total.toFixed(1)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[var(--rule-2)]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm block..."
            className="w-full h-7 px-2 text-xs border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
          />
        </div>

        {/* Block list by layer */}
        <div className="p-2">
          {LAYER_IDS.map(lid => {
            const filteredBlocks = Object.entries(BM[lid].blocks).filter(([k, name]) =>
              !search || name.toLowerCase().includes(search.toLowerCase()) || k.includes(search.toLowerCase())
            )
            if (!filteredBlocks.length) return null
            return (
              <div key={lid} className="mb-1">
                <div
                  className="px-2 py-1 text-xs font-semibold text-white rounded mb-0.5"
                  style={{ background: LAYER_COLORS[lid] }}
                >
                  {BM[lid].label}
                </div>
                {filteredBlocks.map(([key, name]) => {
                  const baseScore = getBlockScore(bd.baseline_blocks[key])
                  const selected  = key in goals
                  return (
                    <div
                      key={key}
                      onClick={() => toggleGoal(key)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                        selected
                          ? 'bg-[var(--navy)] text-white'
                          : 'hover:bg-[var(--rule-2)] text-[var(--ink)]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-white border-white' : 'border-[var(--rule)]'
                      }`}>
                        {selected && <span className="text-[var(--navy)] text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="flex-1">{name}</span>
                      <span className={`font-mono ${selected ? 'text-white/70' : 'text-[var(--ink-3)]'}`}>
                        {baseScore.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT: KPI + Charts + Goal config + cycle settings ── */}
      <div className="flex-1 overflow-y-auto">

        {/* KPI strip */}
        <div className="p-6 pb-0">
          <GoalKPI
            baselineBlocks={bd.baseline_blocks}
            targetBlocks={Object.fromEntries(
              Object.entries(goals).map(([k, g]) => [k, { score: Math.min(4, getBlockScore(bd.baseline_blocks[k]) + g.delta) }])
            )}
            goals={goals}
            baselineStage={bd.engine_snapshot?.stage ?? 'L0'}
            signals={bd.engine_snapshot?.signals}
          />
        </div>

        {/* Charts */}
        <div className="px-6 pb-4">
          <GoalCharts
            baselineBlocks={bd.baseline_blocks}
            targetBlocks={Object.fromEntries(
              Object.entries(goals).map(([k, g]) => [k, { score: Math.min(4, getBlockScore(bd.baseline_blocks[k]) + g.delta) }])
            )}
          />
        </div>

        {/* Goal chips */}
        <div className="px-6 pb-4">
          <GoalChips
            goals={goals}
            baselineBlocks={bd.baseline_blocks}
          />
        </div>

        {/* Top: goal entries */}
        <div className="px-6 pb-4">
          {goalCount === 0 ? (
            <div className="text-center py-16 text-[var(--ink-3)] text-sm">
              Chọn blocks bên trái để đặt mục tiêu
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--ink)] mb-3">
                Mục tiêu can thiệp ({goalCount} blocks)
              </h2>
              {Object.entries(goals).map(([key, goal]) => {
                const baseScore   = getBlockScore(bd.baseline_blocks[key])
                const targetScore = Math.min(4, baseScore + goal.delta)
                const layerId     = Object.entries(BM).find(([, m]) => key in m.blocks)?.[0] ?? 'L0'
                return (
                  <div key={key} className="bg-white border border-[var(--rule)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[layerId] }} />
                        <span className="text-sm font-semibold text-[var(--ink)]">
                          {BM[layerId]?.blocks[key] ?? key}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[var(--ink-3)]">{baseScore.toFixed(1)}</span>
                        <span className="text-[var(--ink-3)]">→</span>
                        <span className="font-bold text-[var(--navy)]">{targetScore.toFixed(1)}</span>
                        <span className="text-[var(--green)]">(+{goal.delta.toFixed(1)})</span>
                      </div>
                    </div>

                    {/* Delta options — mirrors HTML getScaleOptions() with lock */}
                    <div className="flex gap-1.5 flex-wrap">
                      {getScaleOptions(baseScore).map(opt => (
                        <button
                          key={opt.id}
                          disabled={opt.locked}
                          onClick={() => !opt.locked && setGoalDelta(key, opt.delta, opt.id)}
                          title={opt.locked ? 'Không khả dụng với baseline hiện tại' : undefined}
                          className={`px-2 py-1 text-xs rounded border transition-colors whitespace-pre-line text-center leading-tight ${
                            goal.optionId === opt.id
                              ? 'text-white border-transparent'
                              : opt.locked
                              ? 'border-[var(--rule)] text-gray-300 cursor-not-allowed bg-gray-50'
                              : 'border-[var(--rule)] text-[var(--ink-3)] hover:border-[var(--navy)]'
                          }`}
                          style={goal.optionId === opt.id ? { background: opt.color, borderColor: opt.color } : {}}
                        >
                          {opt.label}
                          <div className="text-[10px] font-mono mt-0.5 opacity-75">
                            {opt.delta > 0 ? `+${opt.delta.toFixed(1)}` : opt.delta === 0 ? '=' : opt.delta.toFixed(1)}
                          </div>
                        </button>
                      ))}
                      {/* Custom delta input */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--ink-3)]">+</span>
                        <input
                          type="number"
                          min="0"
                          max={4 - baseScore}
                          step="0.5"
                          value={goal.delta}
                          onChange={e => setGoalDelta(key, parseFloat(e.target.value) || 0, 'custom')}
                          className="w-14 h-7 text-center text-xs font-mono border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                        />
                      </div>
                    </div>

                    {/* Regression toggle */}
                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[var(--ink-3)]">
                        <input
                          type="checkbox"
                          checked={goal.regression}
                          onChange={() => toggleRegression(key)}
                          className="w-3.5 h-3.5"
                        />
                        Có thể tụt điểm (regression expected)
                      </label>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => toggleGoal(key)}
                      className="mt-2 text-xs text-[var(--ink-3)] hover:text-[var(--red)] transition-colors"
                    >
                      ✕ Xóa mục tiêu
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cycle settings */}
        <div className="px-6 pb-6">
          <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Thiết lập chu kỳ</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--ink-3)] mb-1">Thời lượng</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={settings.duration}
                    onChange={e => setSettingsField('duration', parseInt(e.target.value) || 8)}
                    className="w-16 h-8 text-center text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                  />
                  <select
                    value={settings.unit}
                    onChange={e => setSettingsField('unit', e.target.value as 'weeks' | 'sessions')}
                    className="flex-1 h-8 text-xs border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                  >
                    <option value="weeks">tuần</option>
                    <option value="sessions">sessions</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={settings.start_date}
                  onChange={e => setSettingsField('start_date', e.target.value)}
                  className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--ink-3)] mb-1">Sessions dự kiến</label>
                <div className="h-8 flex items-center px-2 border border-[var(--rule-2)] rounded bg-[var(--rule-2)] text-sm font-mono font-bold text-[var(--navy)]">
                  {settings.planned_sessions}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-[var(--ink-3)] mb-1">Ghi chú</label>
              <input
                value={settings.notes}
                onChange={e => setSettingsField('notes', e.target.value)}
                placeholder="Mục tiêu tổng quát, lưu ý đặc biệt..."
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 pb-6 pt-2 bg-[var(--bg)]">
          {error && (
            <div className="mb-2 p-2 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded text-xs text-[var(--red)]">
              {error}
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!goalCount || saving}
            className="w-full h-10 bg-[var(--navy)] text-white rounded-lg text-sm font-bold hover:bg-[var(--navy-mid)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : `Xác nhận ${goalCount} mục tiêu → Mở Cycle`}
          </button>
        </div>
      </div>
    </div>
  )
}
