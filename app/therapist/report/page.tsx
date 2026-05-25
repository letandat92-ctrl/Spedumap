'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LS_KEYS } from '@/types/spedumap'
import { ReportKPI, ChildStrip, MetadataStrip, SessionTimeline } from '@/components/charts/ReportComponents'

export const dynamic = 'force-dynamic'


const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
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
const BW: Record<string,Record<string,number>> = {
  L0:{sleep:.25,microbiome:.25,nutrition:.20,immune:.15,metabolic:.15},
  L1:{arousal:.40,reflex_survival:.10,reflex_postural:.10,reflex_cortical:.05,tone:.20,ns_stability:.15},
  L2:{vestibular:.20,proprioception:.15,auditory:.15,visual:.15,tactile:.10,interoception:.10,taste_smell:.15},
  L3:{motor_planning:.2,gross_motor:.2,fine_motor:.2,postural_control:.2,bilateral_coord:.2},
  L4:{attention:.35,auditory_processing:.30,visual_processing:.30,wm_link:.05},
  L5:{oral_language:.2,word_finding:.2,phonemic_awareness:.2,auditory_memory:.2,visual_memory:.2},
  L6:{self_control:.25,behavior:.25,social_skills:.25,daily_living:.25},
  L7:{math:1/3,writing:1/3,reading:1/3},
}
const LAYER_W: Record<string,number> = {L0:18,L1:16,L2:14,L3:12,L4:12,L5:10,L6:10,L7:8}
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

function makeBlock(score: number) { return { score: parseFloat(score.toFixed(3)) } }

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

function computeTotal(cur: Record<string,number>): number {
  let t = 0
  LAYER_IDS.forEach(lid => {
    let s = 0
    Object.entries(BW[lid]).forEach(([k,w]) => { s += (cur[k]??0)*w })
    t += (s/4)*LAYER_W[lid]
  })
  return t
}

function computeStage(cur: Record<string,number>): string {
  const layerAvg: Record<string,number> = {}
  LAYER_IDS.forEach(lid => {
    const bw = BW[lid]; let s=0
    Object.entries(bw).forEach(([k,w]) => { s+=(cur[k]??0)*w })
    layerAvg[lid] = s
  })
  let stage = 'L0'
  for (let i=0;i<LAYER_IDS.length;i++){
    const l = LAYER_IDS[i]
    const broken = LAYER_IDS.slice(0,i).some(p=>(layerAvg[p]??0)<2.0)
    if (broken) break
    if ((layerAvg[l]??0)>=2.5) stage=l; else break
  }
  return stage
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
  const [closed, setClosed]     = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.ACTIVE_CYCLE)
      if (!raw) { setLoadError('Không có chu kỳ active'); return }
      setCycle(JSON.parse(raw))
    } catch { setLoadError('Không đọc được cycle data') }
  }, [])

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

  const cur = computeCurrent(cycle)
  const currentTotal = computeTotal(cur)
  const baseline = (cycle.baseline as {blocks:Record<string,unknown>;total_score:number})
  const baselineTotal = baseline?.total_score ?? 0
  const delta = currentTotal - baselineTotal
  const sessions = (cycle.daily_sessions as unknown[])?.length ?? 0
  const planned = (cycle.planned_sessions as number) ?? 24
  const child = cycle.child as {name:string}
  const target = (cycle.target as {blocks:Record<string,{score:number}>})?.blocks || {}

  const selectedReason = CLOSE_REASONS.find(r => r.value === closeReason)
  const noteRequired   = selectedReason?.needNote ?? false
  const canClose       = !!closeReason && (!noteRequired || closeNote.trim().length > 0)

  async function handleClose() {
    if (!closeReason || !cycle) return
    setClosing(true)
    try {
      const finalBlocks: Record<string,{score:number}> = {}
      for (const [k,v] of Object.entries(cur)) finalBlocks[k] = makeBlock(v)

      const nextStage = computeStage(cur)
      const today = new Date().toISOString().split('T')[0]

      const closedCycle = {
        ...cycle,
        status: 'closed',
        close_reason: closeReason,
        close_note: closeNote,
        close_summary: closeSummary,
        closed_at: new Date().toISOString(),
        final_blocks: finalBlocks,
        final_total: currentTotal,
        delta_from_baseline: delta,
      }
      localStorage.setItem(LS_KEYS.ACTIVE_CYCLE, JSON.stringify(closedCycle))

      // Supabase close
      const cycleId = cycle.supabase_cycle_id as string
      if (cycleId?.includes('-')) {
        const govMeta = cycle.governance_meta as {knowledge_domain?:string}
        await supabase.from('cycles').update({
          status: 'closed',
          close_reason: closeReason,
          ended_at: today,
          cycle_outcome: {
            computed_at: new Date().toISOString(),
            session_count: sessions,
            total_score_start: baselineTotal,
            total_score_end: currentTotal,
            total_score_delta: delta,
            close_reason: closeReason,
            knowledge_domain: govMeta?.knowledge_domain || 'senior_therapist',
            protocol_version: 'engine_v3.2',
          },
        }).eq('id', cycleId)
      }

      // Next baseline
      const nextBaseline = {
        child: cycle.child,
        baseline_blocks: finalBlocks,
        engine_snapshot: { total: currentTotal, stage: nextStage, layer_scores:{}, signals:{} },
        baseline_source: cycle.baseline_source || 'behavioral',
        eval_date: today,
        knowledge_domain: (cycle.governance_meta as {knowledge_domain?:string})?.knowledge_domain || 'senior_therapist',
        supabase_cycle_id: null,
        prev_cycle_id: cycle.cycle_id,
        baseline: { blocks: finalBlocks, total_score: currentTotal, stage: nextStage, date: today },
        target: { blocks:{} },
        target_blocks: {},
        goal_detail: {},
        daily_sessions: [],
        observed_blocks: [],
      }
      localStorage.setItem(LS_KEYS.CYCLE, JSON.stringify(nextBaseline))
      localStorage.setItem(LS_KEYS.BASELINE, JSON.stringify(nextBaseline))

      setClosed(true)
    } catch(err) {
      console.error(err)
    } finally {
      setClosing(false)
    }
  }

  if (closed) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="max-w-sm text-center p-8">
        <div className="text-4xl mb-3">✓</div>
        <div className="font-semibold text-[var(--green)] text-lg mb-1">Chu kỳ đã đóng</div>
        <p className="text-sm text-[var(--ink-3)] mb-6">
          Baseline mới đã được tạo từ current state. Sẵn sàng cho chu kỳ tiếp theo.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/therapist/goal')}
            className="px-5 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-bold">
            Goal Setting — Cycle mới →
          </button>
        </div>
      </div>
    </div>
  )

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
        target={computeTotal({ ...baseline.blocks, ...target } as Record<string, { score: number }>)}
        sessionsDone={sessions}
        planned={planned}
        startedAt={cycle.started_at as string}
      />

      {/* Session timeline */}
      <SessionTimeline sessions={(cycle.daily_sessions as Array<{session_index:number;date:string;activities?:Array<{delta:number}>;observed_activities?:Array<{delta:number}>;therapist?:string;notes?:string;regression_note?:string}>) || []} />

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
          <button onClick={handleClose} disabled={!canClose || closing}
            className="w-full h-10 bg-[var(--red)] text-white rounded-lg text-sm font-bold hover:bg-red-800 disabled:opacity-40">
            {closing ? 'Đang đóng...' : 'Đóng Chu Kỳ & Tạo Baseline Mới →'}
          </button>
        </div>
      </div>
    </div>
  )
}
