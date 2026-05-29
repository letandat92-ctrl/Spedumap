'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, type LocalScore, type SessionInfo } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import { runEngine } from '@/lib/engine'
import { A4PageWrapper } from '@/components/A4PageWrapper'
import { DocumentHeader } from '@/components/DocumentHeader'

export const dynamic = 'force-dynamic'

// ── Fonts (inline, matching ui_daily_session.html) ──
const FONT_HEAD = "'Libre Baskerville', Georgia, serif"
const FONT_BODY = "'Source Sans 3', sans-serif"
const FONT_MONO = "'DM Mono', ui-monospace, monospace"

// ── Block display names (mirrors BN in template) ──
const BN: Record<string, string> = {
  sleep:'Sleep',microbiome:'Microbiome',nutrition:'Nutrition',immune:'Immune',metabolic:'Metabolic',
  arousal:'Arousal',reflex_survival:'Reflex Survival',reflex_postural:'Reflex Postural',
  reflex_cortical:'Reflex Cortical',tone:'Muscle Tone',ns_stability:'Neural Stability',
  vestibular:'Vestibular',proprioception:'Proprioception',auditory:'Auditory',visual:'Visual',
  tactile:'Tactile',interoception:'Interoception',taste_smell:'Taste/Smell',
  motor_planning:'Motor Planning',gross_motor:'Gross Motor',fine_motor:'Fine Motor',
  postural_control:'Postural Control',bilateral_coord:'Bilateral Coord.',
  attention:'Attention Focus',auditory_processing:'Auditory Processing',
  visual_processing:'Visual Processing',wm_link:'Working Memory Link',
  oral_language:'Oral Language',word_finding:'Word Finding',
  phonemic_awareness:'Phonemic Awareness',auditory_memory:'Auditory Memory',visual_memory:'Visual Memory',
  self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living',
  math:'Math',writing:'Writing',reading:'Reading',
}

// ── Block → Layer (mirrors B2L) ──
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

const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
const LAYER_NAMES: Record<string, string> = {
  L0:'L0 Health & Nutrition', L1:'L1 Regulation', L2:'L2 Sensory', L3:'L3 Motor',
  L4:'L4 Processing', L5:'L5 Communication', L6:'L6 Social', L7:'L7 Academic',
}
const LC: Record<string, string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}
const LAYER_BG: Record<string, string> = {
  L0:'#FDF5F5',L1:'#FDF2F0',L2:'#FDF5F0',L3:'#FDF8F0',L4:'#FDF8EC',L5:'#EEF8F2',L6:'#EEF2FC',L7:'#F0F2FF',
}

// Block weights within layer + per-layer total weight (mirrors BW / LAYER_W)
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

// Local-progress scale buttons (−2/0/+1/+2 — mirrors LS in template; hook supports all 5)
const LS: Array<{ val: LocalScore; num: string; lbl: string; sel: { bg: string; bd: string; fg: string } }> = [
  { val: -2, num: '-2', lbl: 'Tệ hơn rõ', sel: { bg: 'var(--red-bg)',  bd: 'var(--red)',  fg: 'var(--red)' } },
  { val: -1, num: '-1', lbl: 'Tệ hơn',    sel: { bg: '#FBEDE8',         bd: '#C07010',     fg: '#C07010' } },
  { val:  0, num: '0',  lbl: 'Như cũ',    sel: { bg: 'var(--rule-2)',   bd: 'var(--ink-3)',fg: 'var(--ink-2)' } },
  { val:  1, num: '+1', lbl: 'Tốt hơn',   sel: { bg: 'var(--green-bg)', bd: '#70B090',     fg: 'var(--green)' } },
  { val:  2, num: '+2', lbl: 'Tốt hơn rõ',sel: { bg: '#D8F0E4',         bd: '#1A6A3A',     fg: '#0F5C30' } },
]

// 0..6 evaluation scale — s0..s4 exist in globals.css; s5/s6 inline-matched to template
const EVAL_SCALE: Array<{ v: number; label: string; color: string }> = [
  { v: 0, label: 'Tệ hơn\nrất nhiều', color: 'var(--s0)' },
  { v: 1, label: 'Tệ hơn',            color: 'var(--s1)' },
  { v: 2, label: 'Không\ntiến bộ',    color: 'var(--s2)' },
  { v: 3, label: 'Cải thiện\nnhẹ',    color: 'var(--s3)' },
  { v: 4, label: 'Tiến bộ\nvừa',      color: 'var(--s4)' },
  { v: 5, label: 'Tiến bộ\nnhiều',    color: '#0F5C30' },  // --s5 (inline; not in globals.css)
  { v: 6, label: 'Rất tiến\nbộ',      color: '#0A4A28' },  // --s6 (inline; not in globals.css)
]

const LOCAL_TO_DELTA: Record<number, number> = { '-2': -0.50, '-1': -0.20, '0': 0.00, '1': 0.20, '2': 0.40 }

// ── Score helpers (mirror getBlockScore / layerScore / totalFromBaseline) ──
function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as { score: number }).score)
  return 0
}
function layerScore(blocks: Record<string, unknown>, lid: string): number {
  const bw = BW[lid]; if (!bw) return 0
  return Object.entries(bw).reduce((s, [k, w]) => s + getScore(blocks[k] ?? 0) * w, 0)
}

// ── Solution library autocomplete ──
interface SolutionItem { id: string; title: string; category: string | null }

function SolutionAutocomplete({
  value, solutions, onType, onSelect, style, placeholder,
}: {
  value: string
  solutions: SolutionItem[]
  onType: (v: string) => void
  onSelect: (id: string, title: string) => void
  style: React.CSSProperties
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const q = value.trim().toLowerCase()
  const matches = (q === '' ? solutions : solutions.filter(s => s.title.toLowerCase().includes(q))).slice(0, 8)
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => { onType(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        style={style}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 4, marginTop: 2, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
          {matches.map(s => (
            <button
              key={s.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(s.id, s.title); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', border: 'none', borderBottom: '1px solid var(--rule-2)', background: 'transparent', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink)' }}>{s.title}</span>
              {s.category && <span style={{ marginLeft: 6, fontSize: 8.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.category}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionPage() {
  const router   = useRouter()
  const supabase = createClient()
  const {
    cycle, activities, sessionInfo, sessionDate, therapistNote, loadError, submitted,
    currentScores, liveScores, sessionIndex, plannedSessions,
    observedActivities, cooperationStars, layerEval, regressionClass, regressionReason, planNote,
    setLocalScore, setActivityNote, setExercise, setPurpose, selectSolution,
    addObserved, removeObserved, setObservedNote,
    setCooperationStars, setLayerEval,
    setRegressionClass, setRegressionReason, setPlanNote,
    setSessionDate, setTherapistNote, setSessionInfo,
    buildSessionOutput, buildSolutionOutcomes, commitSession,
  } = useSession()

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [obsPickerOpen, setObsPickerOpen] = useState(false)
  const [obsSearch, setObsSearch] = useState('')
  const [solutions, setSolutions] = useState<SolutionItem[]>([])

  useEffect(() => {
    const sb = createClient()
    let active = true
    sb.from('solution_library')
      .select('id, title, category')
      .eq('is_active', true)
      .order('title')
      .then(({ data }) => { if (active && data) setSolutions(data as SolutionItem[]) })
    return () => { active = false }
  }, [])

  const enteredCount = Object.values(activities).filter(a => a.localScore !== null).length
  const readyToSubmit = enteredCount > 0

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const output = buildSessionOutput()
      if (!output) throw new Error('Không có data')

      const cycleId = (cycle?.supabase_cycle_id as string) || (cycle?.cycle_id as string)
      if (cycleId && cycleId.includes('-')) {
        const { data: sessRow, error: sbErr } = await supabase.from('daily_sessions').insert({
          cycle_id:            cycleId,
          child_id:            (cycle?.child as { id: string })?.id,
          date:                output.date,
          session_index:       output.session_index,
          is_first_session:    output.is_first_session,
          activities:          output.activities,
          observed_activities: output.observed_activities,
          notes:               output.notes,
          cooperation_stars:   output.cooperation_stars,
          regression_class:    output.regression_class,
          regression_flag:     output.regression_flag,
          regression_reason:   output.regression_reason,
          plan_note:           output.plan_note,
          layer_eval:          output.layer_eval,
          parent_confirmed:    false,
        }).select('id').single()
        if (sbErr) console.warn('Supabase save failed:', sbErr.message)

        // Engine data pipeline: record each library-linked activity into
        // solution_outcomes, keyed to the persisted session id.
        if (sessRow?.id) {
          const outcomes = buildSolutionOutcomes(sessRow.id)
          if (outcomes.length) {
            const { error: soErr } = await supabase.from('solution_outcomes').insert(outcomes)
            if (soErr) console.warn('solution_outcomes save failed:', soErr.message)
          }
        }
      }

      commitSession(output)
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
          <div className="text-[var(--red)] font-semibold mb-2">Chưa có chu kỳ active</div>
          <p className="text-sm text-[var(--ink-3)] mb-4">{loadError}</p>
          <button onClick={() => router.push('/therapist/cycle')}
            className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm">
            Đến Cycle Open →
          </button>
        </div>
      </div>
    )
  }

  if (!cycle) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>

  const child = cycle.child as { name: string; dob?: string; id?: string; parent_email?: string }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="max-w-sm text-center p-8">
          <div className="text-4xl mb-3">✓</div>
          <div className="font-semibold text-[var(--green)] text-lg mb-1">
            Session {sessionIndex - 1} đã nộp
          </div>
          <p className="text-sm text-[var(--ink-3)] mb-6">
            {enteredCount} blocks · {sessionDate}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/therapist/report')}
              className="px-4 py-2 border border-[var(--rule)] rounded-lg text-sm text-[var(--ink-3)] hover:bg-[var(--rule-2)]"
            >
              Xem Progress Report
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm"
            >
              Session mới →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Derived cycle data ──
  const baseline       = cycle.baseline as { blocks: Record<string, unknown>; total_score: number; stage: string; date?: string }
  const baselineBlocks = baseline?.blocks ?? {}
  const baselineTotal  = baseline?.total_score ?? 0
  const targetBlocks   = (cycle.target as { blocks: Record<string, unknown> })?.blocks ?? {}
  const dailySessions  = (cycle.daily_sessions as Array<{ session_index: number; date: string }>) ?? []
  const observedBlocksRef = (cycle.observed_blocks as Array<{ block: string; upstream_block?: string }>) ?? []

  // Age from dob
  let ageLabel = '—'
  if (child.dob) {
    const ms = Date.now() - new Date(child.dob).getTime()
    const y = Math.floor(ms / 31557600000)
    const m = Math.floor((ms / 2628000000) % 12)
    ageLabel = `${y}y${m}m`
  }

  // Summary panel — current/target totals through the full v3 engine (lib/engine).
  // `liveScores` includes in-progress (uncommitted) activity deltas → real-time delta.
  const totalCurrent = runEngine(liveScores as Record<string, number>).total
  const targetCur: Record<string, number> = { ...(currentScores as Record<string, number>) }
  for (const [k, v] of Object.entries(targetBlocks)) targetCur[k] = getScore(v)
  const totalTarget = runEngine(targetCur).total
  const deltaFromBase = totalCurrent - baselineTotal
  const donutPct = Math.max(0, Math.min(100, Math.round(totalCurrent)))
  const donutCirc = 150.8

  // Duration (minutes) from session times — display only
  let durationMin: number | null = null
  if (sessionInfo.timeStart && sessionInfo.timeEnd) {
    const [sh, sm] = sessionInfo.timeStart.split(':').map(Number)
    const [eh, em] = sessionInfo.timeEnd.split(':').map(Number)
    if (!Number.isNaN(sh) && !Number.isNaN(eh)) {
      durationMin = (eh * 60 + em) - (sh * 60 + sm)
      if (durationMin < 0) durationMin += 24 * 60
    }
  }

  const targetKeys = Object.keys(targetBlocks)
  const filledTarget = Object.values(activities).filter(a => a.localScore !== null).length

  // Observed picker: blocks not already target / observed
  const observedKeys = new Set(observedActivities.map(o => o.block))
  const refObservedKeys = new Set(observedBlocksRef.map(o => o.block))
  const pickerOptions = Object.keys(BN).filter(k =>
    !(k in targetBlocks) && !observedKeys.has(k) && !refObservedKeys.has(k) &&
    (obsSearch.trim() === '' || BN[k].toLowerCase().includes(obsSearch.toLowerCase()))
  )

  // Layer table rows (only layers with a target block)
  const layerRows = LAYER_IDS.map(lid => {
    const targetsInLayer = Object.keys(targetBlocks).filter(k => B2L[k] === lid)
    if (!targetsInLayer.length) return null
    const cur  = layerScore(currentScores as Record<string, number>, lid)
    const base = layerScore(baselineBlocks, lid)
    let tgt = base
    for (const k of targetsInLayer) {
      const tmp: Record<string, unknown> = { ...baselineBlocks }
      tmp[k] = targetBlocks[k]
      tgt = layerScore(tmp, lid)
    }
    const needed   = tgt - base
    const achieved = cur - base
    const pct = needed > 0 ? Math.max(0, Math.min(100, Math.round(achieved / needed * 100))) : 100
    const pc  = pct >= 60 ? '#1A6A3A' : pct >= 30 ? '#C07010' : '#B52020'
    return { lid, cur, tgt, pct, pc }
  }).filter(Boolean) as Array<{ lid: string; cur: number; tgt: number; pct: number; pc: string }>

  // Eval table rows (one per layer that has a target block)
  const evalRows = LAYER_IDS.map(lid => {
    const targetsInLayer = Object.keys(targetBlocks).filter(k => B2L[k] === lid)
    if (!targetsInLayer.length) return null
    return { lid, desc: targetsInLayer.map(k => BN[k] ?? k).join(', ') }
  }).filter(Boolean) as Array<{ lid: string; desc: string }>

  // ── Reusable inline style fragments ──
  const cardStyle: React.CSSProperties = { border: '1px solid var(--rule)', borderRadius: 5, overflow: 'hidden' }
  const cardHeadStyle: React.CSSProperties = {
    background: 'var(--navy)', padding: '5px 11px', fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700,
    letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff',
  }
  const infoLabelStyle: React.CSSProperties = { color: 'var(--ink-3)', fontSize: 10.5, whiteSpace: 'nowrap', flexShrink: 0 }
  const infoValStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--ink)', fontSize: 11.5 }
  const infoRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'baseline', gap: 5, padding: '2px 0',
    borderBottom: '1px solid var(--rule-2)', fontSize: 11.5,
  }
  const inlineInput: React.CSSProperties = {
    border: 'none', borderBottom: '1px solid var(--rule)', background: 'transparent',
    fontFamily: FONT_BODY, fontSize: 11, color: 'var(--ink-2)', outline: 'none', width: '100%', padding: '1px 2px',
  }
  const thStyle: React.CSSProperties = {
    fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
    color: 'var(--ink-3)', borderBottom: '2px solid var(--rule)', padding: '5px 8px 6px',
    textAlign: 'left', background: 'var(--rule-2)',
  }

  return (
    <div className="h-screen overflow-y-auto bg-[var(--bg)] py-6" style={{ fontFamily: FONT_BODY }}>
      {/* Full-width A4 document (rebuilt to match ui_daily_session.html) */}
        <A4PageWrapper>
          <DocumentHeader
            title="SPEDUMAP — Daily Session Report"
            subtitle="Báo cáo buổi trị liệu · Tài liệu lâm sàng nội bộ"
            right={
              <div className="date-field">
                <span>Ngày:</span>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} style={{ width: 140 }} />
              </div>
            }
          />

          <div className="doc-body" style={{ fontFamily: FONT_BODY, color: 'var(--ink)' }}>

            {/* ── ROW 1: Thông tin chung + Tóm tắt ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>

              {/* Thông tin chung */}
              <div style={cardStyle}>
                <div style={cardHeadStyle}>Thông tin chung</div>
                <div style={{ padding: '10px 11px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
                    <div style={infoRowStyle}><span style={infoLabelStyle}>Họ và tên trẻ :</span><span style={infoValStyle}>{child.name}</span></div>
                    <div style={infoRowStyle}><span style={infoLabelStyle}>ID trẻ :</span><span style={infoValStyle}>{child.id ?? '—'}</span></div>
                    <div style={infoRowStyle}><span style={infoLabelStyle}>Tuổi :</span><span style={infoValStyle}>{ageLabel}</span></div>
                    <div style={infoRowStyle}><span style={infoLabelStyle}>Chu kỳ :</span><span style={infoValStyle}>{(cycle.cycle_id as string) ?? '—'}</span></div>
                    <div style={infoRowStyle}><span style={infoLabelStyle}>Buổi số :</span><span style={infoValStyle}>{sessionIndex} / {plannedSessions}</span></div>
                    <div style={infoRowStyle}>
                      <span style={infoLabelStyle}>Therapist :</span>
                      <input
                        value={sessionInfo.therapistName}
                        onChange={e => setSessionInfo({ ...sessionInfo, therapistName: e.target.value })}
                        placeholder="Tên therapist"
                        style={{ ...infoValStyle, border: 'none', borderBottom: '1px solid var(--rule)', background: 'transparent', outline: 'none', width: 110 }}
                      />
                    </div>
                    <div style={infoRowStyle}>
                      <span style={infoLabelStyle}>Thời gian :</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="time" value={sessionInfo.timeStart}
                          onChange={e => setSessionInfo({ ...sessionInfo, timeStart: e.target.value })}
                          style={{ ...infoValStyle, fontSize: 11, border: 'none', background: 'transparent', outline: 'none', width: 72, cursor: 'pointer' }} />
                        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>–</span>
                        <input type="time" value={sessionInfo.timeEnd}
                          onChange={e => setSessionInfo({ ...sessionInfo, timeEnd: e.target.value })}
                          style={{ ...infoValStyle, fontSize: 11, border: 'none', background: 'transparent', outline: 'none', width: 72, cursor: 'pointer' }} />
                      </div>
                    </div>
                    <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
                      <span style={infoLabelStyle}>Địa điểm :</span>
                      <select
                        value={sessionInfo.location}
                        onChange={e => setSessionInfo({ ...sessionInfo, location: e.target.value as SessionInfo['location'] })}
                        style={{ ...infoValStyle, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="clinic">Tại clinic</option>
                        <option value="home">Tại nhà</option>
                        <option value="school">Tại trường</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tóm tắt nhanh (summary panel) */}
              <div style={{ background: 'var(--navy)', borderRadius: 5, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: 4, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 3 }}>Tổng điểm hiện tại</div>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalCurrent.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>/ 100</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: '0 0 70px' }}>
                    <svg viewBox="0 0 60 60" style={{ width: 60, height: 60 }}>
                      <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#6EE7A0" strokeWidth="7"
                        strokeDasharray={donutCirc} strokeDashoffset={donutCirc - (donutPct / 100 * donutCirc)}
                        strokeLinecap="round" transform="rotate(-90 30 30)" />
                      <text x="30" y="34" textAnchor="middle" fontFamily={FONT_MONO} fontSize="11" fontWeight="700" fill="white">{donutPct}%</text>
                    </svg>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 3, textAlign: 'center' }}>% phát triển</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {[
                    { label: 'Baseline', val: baselineTotal.toFixed(1), delta: false },
                    { label: 'Target cuối chu kỳ', val: totalTarget.toFixed(1), delta: false },
                    { label: 'Delta từ baseline', val: (deltaFromBase >= 0 ? '+' : '') + deltaFromBase.toFixed(1), delta: true },
                  ].map(chip => {
                    const negative = chip.delta && deltaFromBase < 0
                    return (
                      <div key={chip.label} style={{
                        flex: 1,
                        background: negative ? 'var(--red-bg)' : 'rgba(255,255,255,.08)',
                        border: `1px solid ${negative ? 'var(--red-bd)' : 'rgba(255,255,255,.15)'}`,
                        borderRadius: 4, padding: '6px 8px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 9, color: negative ? 'var(--red)' : 'rgba(255,255,255,.55)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>{chip.label}</div>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: negative ? 'var(--red)' : (chip.delta ? '#6EE7A0' : '#fff') }}>{chip.val}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── ROW 2: Layer table + Reference ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>

              {/* Target Delta Score */}
              <div style={cardStyle}>
                <div style={cardHeadStyle}>Target Delta Score (Mục tiêu của chu kỳ)</div>
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Layer</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Hiện tại</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Target</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Delta</th>
                        <th style={thStyle}>% Hoàn thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layerRows.map(({ lid, cur, tgt, pct, pc }) => (
                        <tr key={lid}>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 5, verticalAlign: 'middle', background: LC[lid] }} />
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{LAYER_NAMES[lid]}</span>
                          </td>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', fontFamily: FONT_MONO, fontSize: 11, textAlign: 'right' }}>{cur.toFixed(2)}</td>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', fontFamily: FONT_MONO, fontSize: 11, textAlign: 'right' }}>{tgt.toFixed(2)}</td>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', fontFamily: FONT_MONO, fontSize: 11, textAlign: 'right' }}>
                            <span style={{ color: 'var(--green)', fontWeight: 700 }}>+{(tgt - cur).toFixed(2)}</span>
                          </td>
                          <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', minWidth: 80 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ flex: 1, height: 7, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pc }} />
                              </div>
                              <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, width: 30, textAlign: 'right', color: pc }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '5px 8px', fontSize: 9, color: 'var(--ink-3)', borderTop: '1px solid var(--rule-2)', fontStyle: 'italic' }}>
                    * % hoàn thành tính dựa trên delta đã đạt so với delta cần đạt trong chu kỳ.
                  </div>
                </div>
              </div>

              {/* Dữ liệu tham chiếu */}
              <div style={cardStyle}>
                <div style={cardHeadStyle}>Dữ liệu tham chiếu</div>
                <div style={{ padding: '10px 11px' }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy-2)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 5 }}>
                      Baseline gần nhất ({baseline?.date || '—'})
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div><span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Tổng điểm: </span><span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{baselineTotal.toFixed(1)}</span></div>
                      <div><span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Giai đoạn: </span><span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{baseline?.stage ?? '—'}</span></div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy-2)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 5 }}>Timeline tóm tắt</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    {dailySessions.map(s => (
                      <div key={s.session_index} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--rule-2)' }}>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap', width: 80 }}>{s.date}</span>
                        <span style={{ flex: 1, color: 'var(--ink-2)' }}>Session {s.session_index}</span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>—</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, padding: '3px 0', fontWeight: 600, color: 'var(--navy)' }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap', width: 80 }}>{sessionDate}</span>
                      <span style={{ flex: 1 }}>Session {sessionIndex} (Hiện tại)</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{totalCurrent.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Observed-progress badges (read-only ref + this-session) */}
                  {(observedBlocksRef.length > 0 || observedActivities.length > 0) && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Tiến bộ quan sát được (buổi này)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                        {observedBlocksRef.map(o => (
                          <div key={`ref-${o.block}`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--teal-bg)', border: '1px solid var(--teal-bd)', borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: 'var(--teal)' }}>
                            {o.upstream_block ? <>{BN[o.upstream_block] ?? o.upstream_block} <span style={{ fontSize: 9, color: 'var(--ink-3)' }}>→</span> </> : null}{BN[o.block] ?? o.block}
                          </div>
                        ))}
                        {observedActivities.map(o => (
                          <div key={`new-${o.block}`} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--teal-bg)', border: '1px solid var(--teal-bd)', borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: 'var(--teal)' }}>
                            {BN[o.block] ?? o.block}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── ROW 3: Hoạt động hôm nay ── */}
            {/* overflow:visible (override cardStyle) so the solution autocomplete dropdown is not clipped */}
            <div style={{ ...cardStyle, overflow: 'visible', marginBottom: 10 }}>
              <div style={{ ...cardHeadStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Hoạt động hôm nay</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>{filledTarget} / {targetKeys.length}</span>
              </div>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 24 }}>STT</th>
                      <th style={thStyle}>Hoạt động / Bài tập</th>
                      <th style={thStyle}>Mục đích (Liên quan đến)</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Target Delta<br />(chu kỳ)</th>
                      <th style={{ ...thStyle, minWidth: 200 }}>Điểm tập trung hôm nay</th>
                      <th style={thStyle}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetKeys.map((key, i) => {
                      const lid      = B2L[key] ?? 'L0'
                      const color    = LC[lid]
                      const baseScore = getScore(baselineBlocks[key])
                      const tScore    = getScore(targetBlocks[key])
                      const current   = (currentScores as Record<string, number>)[key] ?? baseScore
                      const targetDelta = tScore - baseScore
                      const a  = activities[key]
                      const ls = a?.localScore ?? null
                      const newScore = ls !== null ? Math.min(tScore, current + targetDelta * (LOCAL_TO_DELTA[ls] ?? 0)) : null
                      const deltaPreview = ls !== null ? targetDelta * (LOCAL_TO_DELTA[ls] ?? 0) : 0
                      return (
                        <tr key={key} style={ls !== null ? { background: '#F3FAF5' } : undefined}>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top', fontFamily: FONT_MONO, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', width: 24 }}>{i + 1}</td>
                          {/* Hoạt động / Bài tập → exercise */}
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 11.5 }}>{BN[key] ?? key}</div>
                            <SolutionAutocomplete
                              value={a?.exercise ?? ''}
                              solutions={solutions}
                              onType={v => setExercise(key, v)}
                              onSelect={(id, title) => selectSolution(key, id, title)}
                              placeholder="Hoạt động / bài tập hôm nay..."
                              style={{ ...inlineInput, fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}
                            />
                          </td>
                          {/* Mục đích → purpose */}
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 3, padding: '2px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', background: LAYER_BG[lid], color, border: `1px solid ${color}40` }}>{LAYER_NAMES[lid]}</span>
                            <input
                              value={a?.purpose ?? ''}
                              onChange={e => setPurpose(key, e.target.value)}
                              placeholder="Điểm tập trung hôm nay..."
                              style={{ ...inlineInput, fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}
                            />
                          </td>
                          {/* Target delta */}
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top', fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>+{targetDelta.toFixed(1)}</td>
                          {/* Local score buttons → setLocalScore */}
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', gap: 0 }}>
                              {LS.map((o, idx) => {
                                const selected = ls === o.val
                                return (
                                  <button
                                    key={o.val}
                                    onClick={() => setLocalScore(key, selected ? null : o.val)}
                                    style={{
                                      flex: 1, height: 32, border: `1px solid ${selected ? o.sel.bd : 'var(--rule)'}`, marginRight: -1,
                                      background: selected ? o.sel.bg : 'var(--paper)', cursor: 'pointer',
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                                      fontFamily: FONT_BODY, zIndex: selected ? 1 : 0,
                                      borderRadius: idx === 0 ? '4px 0 0 4px' : idx === LS.length - 1 ? '0 4px 4px 0' : 0,
                                    }}
                                  >
                                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: selected ? o.sel.fg : 'var(--ink-3)', lineHeight: 1 }}>{o.num}</span>
                                    <span style={{ fontSize: 8, color: selected ? o.sel.fg : 'var(--ink-3)', textAlign: 'center' }}>{o.lbl}</span>
                                  </button>
                                )
                              })}
                            </div>
                            {newScore !== null && (
                              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, padding: '2px 5px', background: deltaPreview < 0 ? 'var(--red-bg)' : 'var(--rule-2)', borderRadius: 3 }}>
                                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--ink-2)' }}>{current.toFixed(1)}</span>
                                <span style={{ margin: '0 4px' }}>→</span>
                                <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: deltaPreview > 0 ? 'var(--green)' : deltaPreview < 0 ? 'var(--red)' : 'var(--ink-3)' }}>
                                  {newScore.toFixed(1)} ({deltaPreview >= 0 ? '+' : ''}{deltaPreview.toFixed(2)})
                                </span>
                              </div>
                            )}
                          </td>
                          {/* Ghi chú → setActivityNote */}
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <input
                              value={a?.note ?? ''}
                              onChange={e => setActivityNote(key, e.target.value)}
                              placeholder="Phản ứng trẻ, điều chỉnh..."
                              style={{ ...inlineInput, fontSize: 10.5, fontStyle: 'italic' }}
                            />
                          </td>
                        </tr>
                      )
                    })}

                    {/* Observed rows (added blocks) */}
                    {observedActivities.map((o, idx) => {
                      const lid = B2L[o.block] ?? 'L0'
                      const color = LC[lid]
                      return (
                        <tr key={`obs-${o.block}`} style={{ background: 'var(--teal-bg)' }}>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top', fontFamily: FONT_MONO, fontSize: 11, color: 'var(--teal)', textAlign: 'center' }}>{targetKeys.length + idx + 1}</td>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, color: 'var(--teal)', fontSize: 11.5 }}>{BN[o.block] ?? o.block}</div>
                            <span style={{ display: 'inline-block', marginTop: 2, fontSize: 9, fontWeight: 600, color: 'var(--teal)', background: 'var(--teal-bg)', border: '1px solid var(--teal-bd)', padding: '1px 5px', borderRadius: 2 }}>Quan sát</span>
                          </td>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 3, padding: '2px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', background: LAYER_BG[lid], color, border: `1px solid ${color}40` }}>{LAYER_NAMES[lid]}</span>
                          </td>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top', fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--teal)', textAlign: 'center' }}>obs</td>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <button
                              onClick={() => removeObserved(idx)}
                              style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', border: '1px solid var(--red-bd)', background: 'var(--red-bg)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer' }}
                            >
                              Xóa
                            </button>
                          </td>
                          <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top' }}>
                            <input
                              value={o.note}
                              onChange={e => setObservedNote(idx, e.target.value)}
                              placeholder="Nguồn thông tin / phản ứng..."
                              style={{ ...inlineInput, fontSize: 10.5 }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    {/* Observed-block picker */}
                    <tr>
                      <td colSpan={6} style={{ padding: '6px 8px', background: 'var(--teal-bg)', borderTop: '1.5px dashed var(--teal-bd)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => setObsPickerOpen(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1.5px dashed var(--teal-bd)', borderRadius: 4, background: 'transparent', fontSize: 10, fontWeight: 600, color: 'var(--teal)', cursor: 'pointer' }}
                          >
                            ＋ Tiến bộ ngoài dự kiến
                          </button>
                          <span style={{ fontSize: 10, color: 'var(--teal)', opacity: .7 }}>Thêm nếu có block cải thiện ngoài mục tiêu đã đặt</span>
                        </div>
                        {obsPickerOpen && (
                          <div style={{ marginTop: 8, background: 'var(--paper)', border: '1px solid var(--teal-bd)', borderRadius: 4, padding: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Block nào cải thiện thụ động?</div>
                            <input
                              type="text"
                              value={obsSearch}
                              onChange={e => setObsSearch(e.target.value)}
                              placeholder="Tìm block..."
                              style={{ width: '100%', height: 26, border: '1px solid var(--rule)', borderRadius: 3, fontSize: 11, padding: '0 7px', background: 'var(--bg)', outline: 'none', marginBottom: 6 }}
                            />
                            <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {pickerOptions.map(k => (
                                <button
                                  key={k}
                                  onClick={() => { addObserved(k); setObsSearch(''); setObsPickerOpen(false) }}
                                  style={{ padding: '4px 7px', borderRadius: 3, fontSize: 11, display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--ink-2)', background: 'transparent', border: 'none', textAlign: 'left' }}
                                >
                                  <span>{BN[k]}</span>
                                  <span style={{ fontSize: 9, color: 'var(--ink-3)' }}>{B2L[k]}</span>
                                </button>
                              ))}
                              {pickerOptions.length === 0 && (
                                <div style={{ padding: '4px 7px', fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic' }}>Không còn block khả dụng.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* Total row: duration (computed) + cooperation stars */}
                    <tr>
                      <td colSpan={2} style={{ background: 'var(--rule-2)', fontWeight: 700, borderTop: '2px solid var(--rule)', padding: '6px 8px', fontSize: 11, color: 'var(--ink-2)' }}>
                        Tổng thời gian:{' '}
                        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: 'var(--navy)', fontWeight: 700 }}>
                          {durationMin !== null ? durationMin : '—'}
                        </span>{' '}phút
                      </td>
                      <td colSpan={3} style={{ background: 'var(--rule-2)', fontWeight: 700, borderTop: '2px solid var(--rule)', textAlign: 'right', padding: '6px 8px', fontSize: 11, color: 'var(--ink-2)' }}>Mức độ hợp tác chung:</td>
                      <td style={{ background: 'var(--rule-2)', fontWeight: 700, borderTop: '2px solid var(--rule)', padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(n => {
                            const on = (cooperationStars ?? 0) >= n
                            return (
                              <span
                                key={n}
                                onClick={() => setCooperationStars(cooperationStars === n ? null : n)}
                                style={{ fontSize: 14, cursor: 'pointer', color: on ? '#F59E0B' : 'var(--rule)' }}
                              >
                                {on ? '★' : '☆'}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── ROW 4: Đánh giá tiến bộ ── */}
            <div style={{ ...cardStyle, marginBottom: 10 }}>
              <div style={cardHeadStyle}>Nhận xét cuối ngày & Đánh giá tiến bộ</div>
              <div style={{ padding: '10px 11px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
                  1. Đánh giá tiến bộ theo mục tiêu{' '}
                  <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 10 }}>(Hệ thống sẽ tự động quy đổi điểm và cập nhật % hoàn thành mục tiêu)</span>
                </div>

                {/* Scale header (0–6 legend) */}
                <div className="eval-scale-header">
                  {EVAL_SCALE.map(s => (
                    <div key={s.v} className="esh-item" style={{ color: s.color }}>
                      {s.v}
                      <span>{s.label.split('\n').map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)}</span>
                    </div>
                  ))}
                </div>

                {/* Eval table — per layer 0–6 → setLayerEval */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 90 }}>Layer / Mục tiêu</th>
                      <th style={thStyle}>Mô tả mục tiêu</th>
                      <th style={thStyle}>Mức đánh giá (0–6)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalRows.map(({ lid, desc }) => (
                      <tr key={lid}>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'middle', fontWeight: 600, color: 'var(--navy-2)', fontSize: 11 }}>{LAYER_NAMES[lid]}</td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'middle', fontSize: 10.5, color: 'var(--ink-2)' }}>Cải thiện: {desc}</td>
                        <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: 0 }}>
                            {[0, 1, 2, 3, 4, 5, 6].map(v => {
                              const selected = layerEval[lid] === v
                              return (
                                <div
                                  key={v}
                                  onClick={() => setLayerEval(lid, selected ? null : v)}
                                  style={{
                                    flex: 1, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${selected ? 'var(--navy)' : 'var(--rule)'}`, marginRight: -1, cursor: 'pointer',
                                    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
                                    color: selected ? '#fff' : 'var(--ink-3)', background: selected ? 'var(--navy)' : 'transparent',
                                    zIndex: selected ? 1 : 0, borderRadius: selected ? 3 : 0,
                                  }}
                                >
                                  {v}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Regression classifier (template regWarnBox) — shown when a layer eval ≤ 1 */}
                {Object.values(layerEval).some(v => v !== null && v <= 1) && (
                  <div style={{ marginTop: 8, padding: '9px 12px', background: 'var(--gold-bg)', border: '1px solid var(--gold-bd)', borderRadius: 4, fontSize: 11, color: '#885500' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ Có mục tiêu đang tệ hơn — Phân loại:</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      {([
                        { val: 'transitional', label: 'Tạm thời',       bd: '#E8C880', fg: '#C07010' },
                        { val: 'pathological', label: 'Cần điều tra',   bd: '#F0CACA', fg: '#B52020' },
                        { val: 'noise',        label: 'Nhiễu đo lường', bd: '#E8C880', fg: '#C07010' },
                      ] as const).map(b => {
                        const active = regressionClass === b.val
                        return (
                          <button
                            key={b.val}
                            onClick={() => setRegressionClass(active ? null : b.val)}
                            style={{ padding: '3px 10px', borderRadius: 3, border: `1.5px solid ${b.bd}`, background: active ? b.fg : 'transparent', color: active ? '#fff' : b.fg, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                          >
                            {b.label}
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      value={regressionReason}
                      onChange={e => setRegressionReason(e.target.value)}
                      placeholder="Lý do lâm sàng (candida die-off, ngủ kém tối qua, sensory overload...)"
                      style={{ width: '100%', height: 26, border: '1px solid var(--gold-bd)', borderRadius: 3, padding: '0 8px', fontSize: 10, color: '#555', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                )}

                {/* Notes + plan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--navy-2)', marginBottom: 5 }}>2. Nhận xét tổng quan</div>
                    <textarea
                      value={therapistNote}
                      onChange={e => setTherapistNote(e.target.value)}
                      placeholder="Nhập nhận xét..."
                      style={{ width: '100%', minHeight: 70, border: '1px solid var(--rule)', borderRadius: 4, padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: FONT_BODY, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--navy-2)', marginBottom: 5 }}>3. Kế hoạch điều chỉnh cho buổi tới</div>
                    <textarea
                      value={planNote}
                      onChange={e => setPlanNote(e.target.value)}
                      placeholder="Nhập kế hoạch..."
                      style={{ width: '100%', minHeight: 70, border: '1px solid var(--rule)', borderRadius: 4, padding: '8px 10px', fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: FONT_BODY, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Signatures ── */}
            <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1.5px solid var(--rule)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 20 }}>Therapist ký tên:</div>
                <div style={{ borderBottom: '1px solid var(--ink)' }} />
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{sessionInfo.therapistName || '—'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 20 }}>Phụ huynh xác nhận:</div>
                <div style={{ borderBottom: '1px solid var(--ink)' }} />
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>Họ tên + chữ ký</div>
              </div>
              <div style={{ flex: .6 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 20 }}>Ngày / Giờ kết thúc:</div>
                <div style={{ borderBottom: '1px solid var(--ink)' }} />
              </div>
            </div>

            {/* ── Submit (relocated from removed left pane) ── */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1.5px solid var(--rule)' }}>
              {error && (
                <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--red-bg)', border: '1px solid var(--red-bd)', borderRadius: 5, fontSize: 11.5, color: 'var(--red)' }}>
                  {error}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!readyToSubmit || saving}
                style={{
                  width: '100%', height: 42, background: 'var(--navy)', color: '#fff', borderRadius: 7,
                  border: 'none', fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
                  cursor: readyToSubmit && !saving ? 'pointer' : 'not-allowed',
                  opacity: readyToSubmit && !saving ? 1 : 0.4,
                }}
              >
                {saving ? 'Đang nộp...' : `Nộp Session ${sessionIndex} (${enteredCount} blocks) ✓`}
              </button>
            </div>

          </div>
        </A4PageWrapper>
    </div>
  )
}
