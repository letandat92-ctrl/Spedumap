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

const OSWALD = "'Oswald', sans-serif"
const INTER  = "'Inter', sans-serif"

const LAYER_COLORS: Record<string, string> = {
  L0:'var(--L0)',L1:'var(--L1)',L2:'var(--L2)',L3:'var(--L3)',
  L4:'var(--L4)',L5:'var(--L5)',L6:'var(--L6)',L7:'var(--L7)',
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

// Score → scale color (var(--s0)..var(--s4))
function scoreColor(score: number): string {
  if (score >= 3.5) return 'var(--s4)'
  if (score >= 2.5) return 'var(--s3)'
  if (score >= 1.5) return 'var(--s2)'
  if (score >= 0.5) return 'var(--s1)'
  return 'var(--s0)'
}

// Age in years from DOB — mirrors template `${age} tuổi`
function ageFromDob(dob?: string): number | null {
  if (!dob) return null
  const ms = Date.now() - new Date(dob).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 31557600000)
}

export default function GoalPage() {
  const router = useRouter()
  const supabase = createClient()
  const {
    bd, goals, settings, loadError,
    toggleGoal, setGoalDelta, toggleRegression, setRegressionNote,
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
      <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: INTER, background: 'var(--warm-bg)' }}>
        <div className="max-w-sm text-center p-6">
          <div className="text-[var(--red)] font-semibold mb-2" style={{ fontFamily: OSWALD }}>Chưa có Baseline</div>
          <p className="text-sm text-[var(--sub)] mb-4">{loadError}</p>
          <button
            onClick={() => router.push('/therapist/baseline')}
            className="px-4 py-2 bg-[var(--red)] text-white rounded-lg text-sm"
            style={{ fontFamily: OSWALD }}
          >
            Đến Baseline Setting →
          </button>
        </div>
      </div>
    )
  }

  if (!bd) return <div className="p-8 text-sm text-[var(--sub)]" style={{ fontFamily: INTER }}>Đang tải...</div>

  const childInitials = bd.child.name.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(-2).join('')
  const childAge = ageFromDob(bd.child.dob)
  const childMeta = [childAge != null ? `${childAge} tuổi` : null, bd.eval_date].filter(Boolean).join(' · ') || '—'

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        fontFamily: INTER,
        background: 'var(--warm-bg)',
        color: 'var(--ink)',
        gridTemplateColumns: '480px 1fr',
        gridTemplateRows: '52px 1fr',
      }}
    >

      {/* ── HEADER: step-indicator wizard ── */}
      <header
        className="flex items-center justify-between px-5"
        style={{ gridColumn: '1 / -1', background: '#fff', borderBottom: '1.5px solid var(--border)', zIndex: 50 }}
      >
        <div style={{ fontFamily: OSWALD, fontSize: 15, fontWeight: 700, letterSpacing: '.04em' }}>
          SPEDUMAP <span style={{ color: 'var(--red)' }}>Goal Setting</span>
        </div>

        {/* Wizard: Baseline (done) → Goals (active) → Cycle — matches template (3 steps) */}
        <div className="flex items-center gap-2">
          <div className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--good)' }} />
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--sub)' }}>Baseline</div>
          <div className="w-5 h-px" style={{ background: 'var(--border)' }} />
          <div className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--red)' }} />
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--red)' }}>Goals</div>
          <div className="w-5 h-px" style={{ background: 'var(--border)' }} />
          <div className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--border)' }} />
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--sub)' }}>Cycle</div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/therapist/baseline')}
            className="h-8 px-3.5 rounded transition-colors"
            style={{ border: '1.5px solid var(--border)', background: 'transparent', fontFamily: OSWALD, fontSize: 11, fontWeight: 600, letterSpacing: '.04em', color: 'var(--sub)' }}
          >
            ← Baseline
          </button>
          <button
            onClick={handleConfirm}
            disabled={!goalCount || saving}
            className="h-8 px-[18px] rounded text-white transition-colors"
            style={{
              border: 'none',
              background: 'var(--red)',
              fontFamily: OSWALD, fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
              opacity: goalCount && !saving ? 1 : 0.35,
              cursor: goalCount && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Đang lưu...' : 'Bắt đầu Cycle →'}
          </button>
        </div>
      </header>

      {/* ── LEFT PANEL: block selector ── */}
      <div
        className="overflow-y-auto flex flex-col"
        style={{ background: 'var(--card)', borderRight: '1.5px solid var(--border)' }}
      >
        {/* Child strip */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0"
          style={{ background: '#FAFAF8', borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-full"
            style={{ width: 30, height: 30, background: 'var(--red-bg)', border: '1px solid var(--red-bd)', fontFamily: OSWALD, fontSize: 10, fontWeight: 700, color: 'var(--red)' }}
          >
            {childInitials || 'NA'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{bd.child.name}</div>
            <div style={{ fontSize: 10, color: 'var(--sub)' }}>{childMeta}</div>
          </div>
          <div
            className="ml-auto whitespace-nowrap"
            style={{ background: 'var(--good-bg)', border: '1px solid var(--good-bd)', borderRadius: 4, padding: '3px 8px', fontFamily: OSWALD, fontSize: 10, fontWeight: 600, color: 'var(--good)', letterSpacing: '.04em' }}
          >
            Baseline {bd.engine_snapshot.total.toFixed(1)} · {bd.engine_snapshot.stage}
          </div>
        </div>

        {/* Section head */}
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5 flex-shrink-0">
          <span style={{ fontFamily: OSWALD, fontSize: 9, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--sub)', background: 'var(--border)', padding: '2px 6px', borderRadius: 2 }}>
            Đề xuất
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Chọn goal cho cycle này</span>
          <span className="ml-auto" style={{ fontFamily: OSWALD, fontSize: 10, fontWeight: 700, color: 'var(--red)' }}>{goalCount} đã chọn</span>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 flex-shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm block..."
            className="w-full h-7 px-2 text-xs rounded focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--warm-bg)', fontFamily: INTER }}
          />
        </div>

        {/* GAS list (block selector + selected goal config) */}
        <div className="flex flex-col gap-1.5 px-3 pb-4">
          {LAYER_IDS.map(lid => {
            const filteredBlocks = Object.entries(BM[lid].blocks).filter(([k, name]) =>
              !search || name.toLowerCase().includes(search.toLowerCase()) || k.includes(search.toLowerCase())
            )
            if (!filteredBlocks.length) return null
            return (
              <div key={lid}>
                <div
                  className="px-2 py-1 rounded mb-1"
                  style={{ fontFamily: OSWALD, fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#fff', background: LAYER_COLORS[lid] }}
                >
                  {BM[lid].label}
                </div>

                <div className="flex flex-col gap-1.5">
                  {filteredBlocks.map(([key, name]) => {
                    const baseScore = getBlockScore(bd.baseline_blocks[key])
                    const selected  = key in goals
                    const goal      = goals[key]
                    const baselinePct = (baseScore / 4) * 100
                    const sc = scoreColor(baseScore)

                    return (
                      <div
                        key={key}
                        className="overflow-hidden transition-colors"
                        style={{
                          background: '#FAFAF8',
                          border: `1.5px solid ${selected ? 'var(--red)' : 'var(--border)'}`,
                          borderRadius: 8,
                        }}
                      >
                        {/* Row top — toggle */}
                        <div
                          onClick={() => toggleGoal(key)}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none transition-colors"
                          style={{ background: selected ? 'var(--red-bg)' : '#FAFAF8' }}
                        >
                          <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: 16, height: 16, borderRadius: 3,
                              border: `1.5px solid ${selected ? 'var(--red)' : 'var(--border-2)'}`,
                              background: selected ? 'var(--red)' : '#fff',
                            }}
                          >
                            {selected && (
                              <svg viewBox="0 0 12 10" style={{ width: 9, height: 9, stroke: '#fff', strokeWidth: 2.5, fill: 'none' }}>
                                <polyline points="1,5 4,8 11,1" />
                              </svg>
                            )}
                          </div>
                          <div className="rounded-sm flex-shrink-0" style={{ width: 3, height: 26, background: LAYER_COLORS[lid] }} />
                          <span style={{ fontFamily: OSWALD, fontSize: 12, fontWeight: 700, letterSpacing: '.03em', color: 'var(--ink)' }}>{name}</span>
                          <span
                            className="flex-shrink-0"
                            style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--sub)', background: 'var(--border)', padding: '1px 5px', borderRadius: 2 }}
                          >
                            {lid}
                          </span>
                          <span className="ml-auto flex-shrink-0" style={{ fontFamily: OSWALD, fontSize: 11, fontWeight: 700, color: sc }}>{baseScore.toFixed(1)}</span>
                          {selected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleGoal(key) }}
                              title="Bỏ block này"
                              className="flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--border-2)', background: 'transparent', color: 'var(--sub)', fontSize: 13, lineHeight: 1, padding: 0 }}
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Body — only when selected */}
                        {selected && goal && (
                          <div className="px-3 pt-2 pb-2.5" style={{ borderTop: '1px solid var(--border)' }}>

                            {/* Baseline bar */}
                            <div className="flex items-center gap-2 mb-2">
                              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--sub)', width: 52, flexShrink: 0 }}>Baseline</div>
                              <div className="flex-1 relative overflow-hidden" style={{ height: 10, background: 'var(--border)', borderRadius: 5 }}>
                                <div className="h-full" style={{ width: `${baselinePct}%`, background: sc, borderRadius: 5, transition: 'width .3s' }} />
                              </div>
                              <div className="text-right flex-shrink-0" style={{ fontFamily: OSWALD, fontSize: 12, fontWeight: 700, width: 28, color: sc }}>{baseScore.toFixed(1)}</div>
                            </div>

                            {/* GAS scale label — matches template `.gas-scale-label` */}
                            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: 6 }}>
                              Kỳ vọng cải thiện trong cycle này
                            </div>

                            {/* Segmented GAS scale */}
                            <div
                              className="flex items-stretch overflow-hidden"
                              style={{ borderRadius: 6, border: '1px solid var(--border)' }}
                            >
                              {getScaleOptions(baseScore).map((opt, i, arr) => {
                                const active = goal.optionId === opt.id
                                return (
                                  <button
                                    key={opt.id}
                                    disabled={opt.locked}
                                    onClick={() => !opt.locked && setGoalDelta(key, opt.delta, opt.id)}
                                    title={opt.locked ? 'Không khả dụng với baseline hiện tại' : undefined}
                                    className="flex-1 flex flex-col items-center justify-center transition-colors"
                                    style={{
                                      padding: '6px 4px',
                                      gap: 3,
                                      borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                                      background: active ? 'var(--red-bg)' : 'transparent',
                                      opacity: opt.locked ? 0.35 : 1,
                                      cursor: opt.locked ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    <div
                                      className="rounded-full flex-shrink-0"
                                      style={{
                                        width: 16, height: 16,
                                        border: `2px solid ${active ? 'var(--red)' : 'var(--border-2)'}`,
                                        background: active ? 'var(--red)' : '#fff',
                                      }}
                                    />
                                    <div
                                      className="text-center"
                                      style={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1.2, letterSpacing: '.01em', color: active ? 'var(--red)' : 'var(--sub)', whiteSpace: 'pre-line' }}
                                    >
                                      {opt.label}
                                    </div>
                                    <div style={{ fontFamily: OSWALD, fontSize: 8, fontWeight: 700, color: active ? 'var(--red)' : '#aaa' }}>
                                      {opt.delta > 0 ? `+${opt.delta.toFixed(1)}` : opt.delta === 0 ? '=' : opt.delta.toFixed(1)}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>

                            {/* Goal-size warning */}
                            {goal.delta >= 2.0 && (
                              <div
                                className="mt-1.5"
                                style={{
                                  padding: '5px 8px', borderRadius: 4, fontSize: 10, lineHeight: 1.5,
                                  background: goal.delta >= 2.5 ? 'var(--bad-bg)' : 'var(--warn-bg)',
                                  border: `1px solid ${goal.delta >= 2.5 ? 'var(--bad-bd)' : 'var(--warn-bd)'}`,
                                  color: goal.delta >= 2.5 ? 'var(--red)' : 'var(--warn)',
                                }}
                              >
                                {goal.delta >= 2.5
                                  ? '⚠ Goal rất lớn. Có thể đạt được nếu có can thiệp y tế trực tiếp (ví dụ: đeo kính, điều trị ký sinh trùng). Cân nhắc chia 2 cycles.'
                                  : 'Goal ambitious. Đảm bảo có kế hoạch can thiệp cụ thể cho cycle này.'}
                              </div>
                            )}

                            {/* Regression toggle */}
                            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ borderTop: '1px dashed var(--border)' }}>
                              <div className="flex-1" style={{ fontSize: 10, color: 'var(--sub)' }}>Dự kiến regression tạm thời (die-off, detox...)</div>
                              <div
                                onClick={() => toggleRegression(key)}
                                className="relative cursor-pointer flex-shrink-0 transition-colors"
                                style={{ width: 28, height: 16, borderRadius: 8, background: goal.regression ? 'var(--warn)' : 'var(--border)' }}
                              >
                                <div
                                  className="absolute rounded-full"
                                  style={{ width: 12, height: 12, top: 2, left: goal.regression ? 14 : 2, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }}
                                />
                              </div>
                            </div>

                            {/* Regression clinical-reason note — shown when toggle on */}
                            {goal.regression && (
                              <div className="mt-1.5">
                                <input
                                  type="text"
                                  value={goal.regressionNote ?? ''}
                                  onChange={e => setRegressionNote(key, e.target.value)}
                                  placeholder="Lý do lâm sàng (ví dụ: candida die-off, sensory overload...)"
                                  className="w-full focus:outline-none"
                                  style={{ height: 26, border: '1px solid var(--warn-bd)', borderRadius: 4, padding: '0 8px', fontSize: 10, background: 'var(--warn-bg)', color: 'var(--ink)' }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: KPI + Charts + Goal chips + Cycle settings ── */}
      <div
        className="overflow-hidden grid"
        style={{ background: 'var(--warm-bg)', gridTemplateRows: 'auto 1fr auto auto auto' }}
      >
        {/* KPI strip */}
        <div
          className="px-3.5 py-2.5"
          style={{ background: '#fff', borderBottom: '1.5px solid var(--border)' }}
        >
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
        <div className="px-3.5 py-2.5 overflow-hidden min-h-0">
          <GoalCharts
            baselineBlocks={bd.baseline_blocks}
            targetBlocks={Object.fromEntries(
              Object.entries(goals).map(([k, g]) => [k, { score: Math.min(4, getBlockScore(bd.baseline_blocks[k]) + g.delta) }])
            )}
          />
        </div>

        {/* Goal chips summary */}
        <div className="px-3.5 py-2 overflow-y-auto" style={{ background: '#fff', borderTop: '1.5px solid var(--border)' }}>
          <GoalChips
            goals={goals}
            baselineBlocks={bd.baseline_blocks}
          />
        </div>

        {/* Cycle settings bar */}
        <div
          className="flex flex-wrap items-center gap-2.5 px-3.5 py-2"
          style={{ background: '#fff', borderTop: '1px solid var(--border)' }}
        >
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--sub)' }}>Cycle</span>
          <input
            type="number"
            min={1}
            max={52}
            value={settings.duration}
            onChange={e => setSettingsField('duration', parseInt(e.target.value) || 8)}
            className="h-7 px-1.5 rounded text-center focus:outline-none"
            style={{ width: 56, border: '1.5px solid var(--border)', background: 'var(--warm-bg)', fontFamily: INTER, fontSize: 11, color: 'var(--ink)' }}
          />
          <select
            value={settings.unit}
            onChange={e => setSettingsField('unit', e.target.value as 'weeks' | 'sessions' | 'months')}
            className="h-7 px-1.5 rounded focus:outline-none"
            style={{ width: 90, border: '1.5px solid var(--border)', background: 'var(--warm-bg)', fontFamily: INTER, fontSize: 11, color: 'var(--ink)' }}
          >
            <option value="weeks">Tuần</option>
            <option value="sessions">Sessions</option>
            <option value="months">Tháng</option>
          </select>
          <span className="ml-1" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--sub)' }}>Bắt đầu</span>
          <input
            type="date"
            value={settings.start_date}
            onChange={e => setSettingsField('start_date', e.target.value)}
            className="h-7 px-1.5 rounded focus:outline-none"
            style={{ width: 120, border: '1.5px solid var(--border)', background: 'var(--warm-bg)', fontFamily: INTER, fontSize: 11, color: 'var(--ink)' }}
          />
          <input
            value={settings.notes}
            onChange={e => setSettingsField('notes', e.target.value)}
            placeholder="Ghi chú cycle (ưu tiên, lưu ý phụ huynh...)"
            className="flex-1 h-7 px-1.5 rounded focus:outline-none"
            style={{ minWidth: 160, border: '1.5px solid var(--border)', background: 'var(--warm-bg)', fontFamily: INTER, fontSize: 11, color: 'var(--ink)' }}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-3.5 py-2" style={{ background: '#fff', borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '6px 10px', borderRadius: 4, fontSize: 11, background: 'var(--red-bg)', border: '1px solid var(--red-bd)', color: 'var(--red)' }}>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
