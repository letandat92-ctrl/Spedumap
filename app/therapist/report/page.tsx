'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { runEngine } from '@/lib/engine'
import { LS_KEYS } from '@/types/spedumap'
import { ReportKPI, ChildStrip, MetadataStrip, SessionTimeline } from '@/components/charts/ReportComponents'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'

export const dynamic = 'force-dynamic'

const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
const LAYER_COLORS: Record<string,string> = {
  L0:'#8B1A1A', L1:'#A02020', L2:'#B83030', L3:'#C55030',
  L4:'#C87020', L5:'#4A8A60', L6:'#2A6A9A', L7:'#3A5AAA',
}


const B2L: Record<string,string> = {
  sleep:'L0',microbiome:'L0',nutrition:'L0',immune:'L0',metabolic:'L0',
  arousal:'L1',reflex_survival:'L1',reflex_postural:'L1',reflex_cortical:'L1',tone:'L1',ns_stability:'L1',
  vestibular:'L2',proprioception:'L2',auditory:'L2',visual:'L2',tactile:'L2',interoception:'L2',taste_smell:'L2',
  motor_planning:'L3',gross_motor:'L3',fine_motor:'L3',postural_control:'L3',bilateral_coord:'L3',
  attention:'L4',auditory_processing:'L4',visual_processing:'L4',wm_link:'L4',
  oral_language:'L5',word_finding:'L5',phonemic_awareness:'L5',auditory_memory:'L5',visual_memory:'L5',
  self_control:'L6',behavior:'L6',social_skills:'L6',daily_living:'L6',
  math:'L7',writing:'L7',reading:'L7',
}
const BN: Record<string,string> = {
  sleep:'Sleep',microbiome:'Microbiome',nutrition:'Nutrition',immune:'Immune',metabolic:'Metabolic',
  arousal:'Arousal',reflex_survival:'Reflex Survival',reflex_postural:'Reflex Postural',
  reflex_cortical:'Reflex Cortical',tone:'Muscle Tone',ns_stability:'Neural Stability',
  vestibular:'Vestibular',proprioception:'Proprioception',auditory:'Auditory',visual:'Visual',
  tactile:'Tactile',interoception:'Interoception',taste_smell:'Taste/Smell',
  motor_planning:'Motor Planning',gross_motor:'Gross Motor',fine_motor:'Fine Motor',
  postural_control:'Postural Control',bilateral_coord:'Bilateral Coord.',
  attention:'Attention Focus',auditory_processing:'Auditory Processing',
  visual_processing:'Visual Processing',wm_link:'Working Memory Link',
  oral_language:'Oral Language',word_finding:'Word Finding',phonemic_awareness:'Phonemic Awareness',
  auditory_memory:'Auditory Memory',visual_memory:'Visual Memory',
  self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living',
  math:'Math',writing:'Writing',reading:'Reading',
}

function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

function computeCurrent(cycle: Record<string,unknown>): Record<string,number> {
  const cur: Record<string,number> = {}
  const baseline = (cycle.baseline as {blocks:Record<string,unknown>})?.blocks || {}
  for (const [k,v] of Object.entries(baseline)) cur[k] = getScore(v)
  const sessions = (cycle.daily_sessions as Array<{activities:Array<{block:string;current_after:unknown}>;observed_activities:Array<{block:string;current_after:unknown}>}>) || []
  for (const s of sessions) {
    for (const a of (s.activities||[])) cur[a.block] = getScore(a.current_after)
    for (const a of (s.observed_activities||[])) cur[a.block] = getScore(a.current_after)
  }
  return cur
}

const CLOSE_REASONS = [
  { value:'completed',      label:'✓ Completed — Hoàn thành đủ sessions',        needNote: false },
  { value:'early_complete', label:'✓ Early Complete — Đạt target trước kế hoạch', needNote: false },
  { value:'incident',       label:'⚠ Incident — Sự kiện ngoài kế hoạch',          needNote: true  },
  { value:'timeout',        label:'⏱ Timeout — Hết thời gian, chưa đủ sessions',  needNote: true  },
]

export default function ReportPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [cycle, setCycle]       = useState<Record<string,unknown>|null>(null)
  const [loadError, setLoadError] = useState<string|null>(null)
  const [closeReason, setCloseReason] = useState('')
  const [closeNote, setCloseNote]     = useState('')
  const [closeSummary, setCloseSummary] = useState('')
  const [closing, setClosing]   = useState(false)
  const [closeError, setCloseError] = useState<string|null>(null)
  // Per-session layer evaluation — sourced from Supabase (not localStorage) so
  // it stays consistent with solution_outcomes written server-side per session.
  const [evalSessions, setEvalSessions] = useState<Array<{session_index:number; layer_eval?:Record<string,number|null>; date?:string}>>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.ACTIVE_CYCLE)
      if (!raw) { setLoadError('Không có chu kỳ active'); return }
      setCycle(JSON.parse(raw))
    } catch { setLoadError('Không đọc được cycle data') }
  }, [])

  // Fetch this cycle's sessions for the per-session layer-eval chart.
  useEffect(() => {
    const cycleId = cycle?.supabase_cycle_id as string | undefined
    if (!cycleId || !cycleId.includes('-')) return
    const sb = createClient()
    let active = true
    sb.from('daily_sessions')
      .select('session_index, layer_eval, date')
      .eq('cycle_id', cycleId)
      .order('session_index', { ascending: true })
      .then(({ data }) => { if (active && data) setEvalSessions(data as Array<{session_index:number; layer_eval?:Record<string,number|null>; date?:string}>) })
    return () => { active = false }
  }, [cycle])

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-6 max-w-sm">
        <div className="text-[var(--red)] font-semibold mb-2">{loadError}</div>
        <button onClick={() => router.push('/therapist/baseline')}
          className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm mt-3">
          Về Baseline →
        </button>
      </div>
    </div>
  )

  if (!cycle) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>

  const baseline = (cycle.baseline as {blocks:Record<string,unknown>;total_score:number})
  const baselineTotal = baseline?.total_score ?? 0
  const baselineBlocks = baseline?.blocks || {}
  const target = (cycle.target as {blocks:Record<string,{score:number}>})?.blocks || {}
  const cur = computeCurrent(cycle)
  // Current/target totals pass through the full v3 engine (lib/engine) — single source
  // of truth (same engine that locks the baseline). baseline = locked snapshot.
  const toNum = (blocks: Record<string, unknown>): Record<string, number> =>
    Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, getScore(v)]))
  const curEngine    = runEngine(cur)
  const currentTotal = curEngine.total
  const targetForKPI = runEngine({ ...toNum(baselineBlocks), ...toNum(target) }).total
  const sessions = (cycle.daily_sessions as unknown[])?.length ?? 0
  const planned = (cycle.planned_sessions as number) ?? 24
  const child = cycle.child as {name:string}

  // Per-session layer evaluation (therapist's 0–6 mark) → line chart data.
  // evalSessions is fetched from Supabase (see effect above). One series per
  // layer that has at least one recorded score this cycle.
  const evalChartData = [...evalSessions]
    .sort((a,b) => a.session_index - b.session_index)
    .map(s => {
      const row: Record<string, number|null> = { session: s.session_index }
      for (const l of LAYER_IDS) row[l] = (s.layer_eval?.[l] ?? null)
      return row
    })
  const layersWithEval = LAYER_IDS.filter(l => evalChartData.some(r => typeof r[l] === 'number'))

  const selectedReason = CLOSE_REASONS.find(r => r.value === closeReason)
  const noteRequired   = selectedReason?.needNote ?? false
  const canClose       = !!closeReason && (!noteRequired || closeNote.trim().length > 0)

  async function handleClose() {
    if (!closeReason || !cycle) return
    setCloseError(null)

    // Phase 1 of the two-phase close: mark the cycle 'closing' + persist the
    // therapist's reason/notes, then hand off to the blind retest. The end-of-
    // cycle scores and the next baseline are produced by the retest, NOT here.
    const cycleId = cycle.supabase_cycle_id as string | undefined
    if (!cycleId || !cycleId.includes('-')) {
      setCloseError('Thiếu mã chu kỳ Supabase — không thể tiến hành retest.')
      return
    }

    setClosing(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('cycles').update({
        status: 'closing',
        close_reason: closeReason,
        close_note: closeNote,
        close_summary: closeSummary,
        ended_at: today,
      }).eq('id', cycleId)
      if (error) throw new Error(error.message)

      // Reflect the closing state locally so a back-navigation stays consistent.
      localStorage.setItem(LS_KEYS.ACTIVE_CYCLE, JSON.stringify({
        ...cycle,
        status: 'closing',
        close_reason: closeReason,
        close_note: closeNote,
        close_summary: closeSummary,
        ended_at: today,
      }))

      router.push('/therapist/retest?cycle_id=' + cycleId)
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Lỗi đóng chu kỳ')
      setClosing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-[var(--navy)]">Progress Report</h1>
      </div>

      {/* Child strip */}
      <ChildStrip
        name={child.name}
        status={cycle.status as 'active' | 'closed'}
        startedAt={cycle.started_at as string}
      />

      {/* Metadata strip */}
      <MetadataStrip
        startedAt={cycle.started_at as string}
        closedAt={cycle.closed_at as string | undefined}
      />

      {/* Report KPI */}
      <ReportKPI
        current={currentTotal}
        baseline={baselineTotal}
        target={targetForKPI}
        sessionsDone={sessions}
        planned={planned}
        startedAt={cycle.started_at as string}
      />

      {/* Session timeline */}
      <SessionTimeline sessions={(cycle.daily_sessions as Array<{session_index:number;date:string;activities?:Array<{delta:number}>;observed_activities?:Array<{delta:number}>;therapist?:string;notes?:string;regression_note?:string}>) || []} />

      {/* Per-session layer evaluation chart */}
      {layersWithEval.length > 0 && (
        <div className="bg-white border border-[var(--rule)] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">Tiến bộ theo buổi</h3>
          <p className="text-[11px] text-[var(--ink-3)] mb-4">Đánh giá layer (0–6) của therapist qua từng session</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evalChartData} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis dataKey="session" tick={{ fontSize: 11 }} label={{ value: 'Session', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis domain={[0, 6]} ticks={[0,1,2,3,4,5,6]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={v => `Session ${v}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {layersWithEval.map(l => (
                <Line key={l} type="monotone" dataKey={l} name={l} stroke={LAYER_COLORS[l]}
                  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Block progress table */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Tiến độ từng block mục tiêu</h3>
        <div className="space-y-2">
          {Object.keys(target).map(block => {
            const base    = getScore(baseline?.blocks?.[block])
            const current = cur[block] ?? base
            const tgt     = getScore(target[block])
            const pct     = tgt > base ? Math.min(100, Math.round((current - base) / (tgt - base) * 100)) : 100
            return (
              <div key={block} className="grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-3 text-[var(--ink-2)] truncate">{BN[block]??block}</div>
                <div className="col-span-1 font-mono text-right text-[var(--ink-3)]">{base.toFixed(1)}</div>
                <div className="col-span-5">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-[var(--green)]' : pct >= 50 ? 'bg-[var(--navy)]' : 'bg-[var(--gold)]'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="col-span-1 font-mono text-[var(--navy)]">{current.toFixed(1)}</div>
                <div className="col-span-1 font-mono text-[var(--ink-3)]">{tgt.toFixed(1)}</div>
                <div className={`col-span-1 font-bold text-right ${pct >= 100 ? 'text-[var(--green)]' : 'text-[var(--ink-3)]'}`}>{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Close cycle form */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Đóng chu kỳ</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--ink-3)] mb-1">Lý do đóng *</label>
            <select value={closeReason} onChange={e => setCloseReason(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]">
              <option value="">Chọn lý do...</option>
              {CLOSE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--ink-3)] mb-1">
              Ghi chú lâm sàng {noteRequired && <span className="text-[var(--red)]">* bắt buộc</span>}
            </label>
            <textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={2}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none resize-none ${
                noteRequired && !closeNote.trim()
                  ? 'border-[var(--red)] focus:border-[var(--red)]'
                  : 'border-[var(--rule)] focus:border-[var(--navy)]'
              }`}
              placeholder={noteRequired ? 'Mô tả chi tiết lý do... (bắt buộc)' : 'Nhận xét về tiến độ, các yếu tố ảnh hưởng...'} />
          </div>
          <div>
            <label className="block text-xs text-[var(--ink-3)] mb-1">Tóm tắt cho phụ huynh</label>
            <textarea value={closeSummary} onChange={e => setCloseSummary(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)] resize-none"
              placeholder="Chu kỳ này con đã tiến bộ ở..." />
          </div>
          {closeError && (
            <div className="p-2 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded-lg text-xs text-[var(--red)]">{closeError}</div>
          )}
          <button onClick={handleClose} disabled={!canClose || closing}
            className="w-full h-10 bg-[var(--red)] text-white rounded-lg text-sm font-bold hover:bg-red-800 disabled:opacity-40">
            {closing ? 'Đang chuyển sang Retest...' : 'Đóng Chu Kỳ & Tiến hành Retest →'}
          </button>
          <p className="text-[11px] text-[var(--ink-3)] text-center">
            Bước tiếp theo: đánh giá lại 39 block một cách độc lập (blind) để nghiệm thu chu kỳ.
          </p>
        </div>
      </div>
    </div>
  )
}
