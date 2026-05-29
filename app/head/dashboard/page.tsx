'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'


// ── Constants ─────────────────────────────────────────────────
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

function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

// ── Compute functions (mirrors HTML) ──────────────────────────

type Blocks = Record<string, unknown>
type Session = { date: string; session_index?: number; regression_flag?: boolean; activities?: Array<{block:string; delta:number}> }
type Therapist = { full_name?: string | null; role?: string | null } | null
type CycleRaw = {
  id: string
  cycle_name?: string
  status: string
  baseline_source?: string
  started_at: string
  planned_sessions: number
  governance_meta?: { is_sandbox?: boolean; sandbox_hypothesis?: string; knowledge_domain?: string }
  child: { name: string; dob?: string; id: string }
  baseline: { blocks: Blocks; total_score: number; stage: string }
  target: { blocks: Blocks }
  daily_sessions: Session[]
  teacher_id?: string | null
  therapist?: Therapist
}

// Short role labels for the therapist chip
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', head_therapist: 'Head', senior_therapist: 'Senior',
  technician_therapist: 'Technician', junior_therapist: 'Junior', parent: 'Parent',
}

function computeCur(c: CycleRaw): Record<string,number> {
  const cur: Record<string,number> = {}
  for (const [k,v] of Object.entries(c.baseline.blocks)) cur[k] = getScore(v)
  ;(c.daily_sessions||[]).forEach(s =>
    (s.activities||[]).forEach(a => { if (a.block in cur) cur[a.block] = (cur[a.block]||0) + a.delta })
  )
  return cur
}

function computeDelta(baseBlocks: Blocks, cur: Record<string,number>): number {
  let d = 0
  Object.entries(cur).forEach(([k,v]) => {
    const bv = getScore(baseBlocks[k] ?? 0)
    const l = B2L[k]; if (!l) return
    const bw = BW[l]?.[k] ?? 0
    d += ((v - bv) * bw / 4) * LAYER_W[l]
  })
  return d
}

function computeDeficit(blocks: Blocks): { name: string; score: number } {
  const T = 2.5
  const sm  = getScore(blocks.vestibular??0)*.20 + getScore(blocks.arousal??0)*.20 + getScore(blocks.attention??0)*.15
  const reg = getScore(blocks.arousal??0)*.40 + getScore(blocks.sleep??0)*.30 + getScore(blocks.microbiome??0)*.30
  const cog = getScore(blocks.attention??0)*.35 + getScore(blocks.oral_language??0)*.25 + getScore(blocks.auditory_processing??0)*.20
  const s = { Sensorimotor: Math.max(0,T-sm), Regulation: Math.max(0,T-reg), Cognitive: Math.max(0,T-cog) }
  const top = Object.entries(s).sort((a,b) => b[1]-a[1])[0]
  return top[1] === 0 ? { name:'No Deficit', score:0 } : { name: top[0], score: top[1] }
}

function computeFlags(c: CycleRaw, curDelta: number) {
  const today = new Date(); const flags: Array<{type:string;label:string;cls:string}> = []
  const sessions = c.daily_sessions || []
  const lastDate = sessions.length ? new Date(sessions[sessions.length-1].date) : new Date(c.started_at)
  const daysSince = Math.round((today.getTime() - lastDate.getTime()) / 86400000)
  if (sessions.length && daysSince > 7) flags.push({ type:'inactive', label:`Không có session ${daysSince} ngày`, cls:'gold' })
  const regCount = sessions.filter(s => s.regression_flag).length
  if (regCount) flags.push({ type:'regression', label:`Regression: ${regCount} buổi`, cls:'red' })
  const daysIn = Math.round((today.getTime() - new Date(c.started_at).getTime()) / 86400000)
  const timeProgress = daysIn / (c.planned_sessions * 3.5)
  if (timeProgress > 0.4 && curDelta < 0.8 && !c.governance_meta?.is_sandbox)
    flags.push({ type:'underperform', label:'Underperform — tiến độ chậm', cls:'red' })
  const expectedEnd = new Date(c.started_at); expectedEnd.setDate(expectedEnd.getDate() + c.planned_sessions * 3.5)
  const daysLeft = Math.round((expectedEnd.getTime() - today.getTime()) / 86400000)
  if (daysLeft > 0 && daysLeft < 14) flags.push({ type:'expiring', label:`Còn ${daysLeft} ngày kết thúc`, cls:'teal' })
  return flags
}

function processRaw(raw: CycleRaw[]) {
  return raw.map(c => {
    const cur       = computeCur(c)
    const curDelta  = computeDelta(c.baseline.blocks, cur)
    const deficit   = computeDeficit(c.baseline.blocks)
    const targetCur = { ...cur }
    for (const [k,v] of Object.entries(c.target?.blocks||{})) targetCur[k] = getScore(v)
    const targetDelta = computeDelta(c.baseline.blocks, targetCur)
    const cyclePct    = targetDelta > 0 ? Math.max(0, Math.min(100, Math.round(curDelta / targetDelta * 100))) : 0
    const daysIn      = Math.round((new Date().getTime() - new Date(c.started_at).getTime()) / 86400000)
    const flags       = computeFlags(c, curDelta)
    const isSandbox   = c.governance_meta?.is_sandbox ?? false
    return { ...c, cur, curDelta, deficit, cyclePct, daysIn, flags, isSandbox }
  })
}

// ── Flag badge ────────────────────────────────────────────────
const FLAG_COLORS: Record<string,string> = {
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  red:  'bg-red-100 text-red-800 border-red-300',
  teal: 'bg-teal-100 text-teal-800 border-teal-300',
}

type Tab = 'main' | 'sandbox' | 'flags'

// ── Page ──────────────────────────────────────────────────────
export default function HeadDashboard() {
  const supabase = createClient()
  const router   = useRouter()

  const [cycles, setCycles]     = useState<ReturnType<typeof processRaw>>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('main')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    loadCycles()
  }, [])

  async function loadCycles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('cycles')
      .select('*, children:child_id(name, dob, id), teacher:teacher_id(full_name, role)')
      .eq('status', 'active')
      .order('started_at', { ascending: false })

    if (error) { console.warn('Supabase error:', error.message); setLoading(false); return }

    // Fetch real sessions for these cycles → sessDone + regression flags.
    const cycleIds = (data || []).map(c => c.id as string)
    const sessionsByCycle: Record<string, Session[]> = {}
    if (cycleIds.length) {
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('cycle_id, session_index, regression_flag, date')
        .in('cycle_id', cycleIds)
      for (const s of (sessions || []) as Array<{cycle_id:string; session_index:number; regression_flag:boolean; date:string}>) {
        (sessionsByCycle[s.cycle_id] ||= []).push({
          date: s.date, session_index: s.session_index, regression_flag: s.regression_flag,
        })
      }
    }

    // Map Supabase format to CycleRaw
    const raw: CycleRaw[] = (data || []).map((c: Record<string,unknown>) => ({
      id:               c.id as string,
      cycle_name:       c.cycle_name as string,
      status:           c.status as string,
      baseline_source:  c.baseline_source as string,
      started_at:       c.started_at as string,
      planned_sessions: (c.governance_meta as {planned_sessions?:number})?.planned_sessions ?? 24,
      governance_meta:  c.governance_meta as CycleRaw['governance_meta'],
      child:            c.children as CycleRaw['child'] || { name:'Unknown', id:'' },
      baseline:         c.baseline as CycleRaw['baseline'],
      target:           c.target as CycleRaw['target'],
      daily_sessions:   sessionsByCycle[c.id as string] || [],
      teacher_id:       (c.teacher_id as string) ?? null,
      therapist:        (c.teacher as Therapist) ?? null,
    }))

    setCycles(processRaw(raw))
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return cycles.filter(c =>
      !search ||
      c.child.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.cycle_name||'').toLowerCase().includes(search.toLowerCase())
    )
  }, [cycles, search])

  const main    = filtered.filter(c => !c.isSandbox)
  const sandbox = filtered.filter(c => c.isSandbox)
  // Sandbox cycles are excluded from all governance aggregates (main only).
  const allFlags = main.flatMap(c => (c.flags||[]).map(f => ({ ...f, childName: c.child.name })))

  // KPIs
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const sessThisWeek = main.flatMap(c => (c.daily_sessions||[]).filter(s => new Date(s.date) >= weekAgo)).length

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* Header */}
      <div className="bg-[var(--navy)] px-8 py-4 flex items-center justify-between">
        <div>
          <span className="font-serif font-bold text-white text-lg">SPEDUMAP</span>
          <span className="text-white/50 text-sm ml-2">/ Head Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm trẻ / cycle..."
            className="h-8 px-3 text-sm bg-white/10 text-white placeholder-white/40 rounded-lg border border-white/20 focus:outline-none focus:border-white/60 w-48"
          />
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="text-white/50 text-xs hover:text-white">
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Active Cycles',    value: main.length,                        sub:'đang can thiệp' },
            { label:'Main Pool',        value: main.length,                        sub:'cycles chính' },
            { label:'Sandbox',          value: sandbox.length,                     sub:'thử nghiệm protocol' },
            { label:'Flags',            value: allFlags.length,                    sub:'cần chú ý', alert: allFlags.length > 0 },
          ].map(kpi => (
            <div key={kpi.label} className={`bg-white border rounded-xl p-4 text-center ${kpi.alert ? 'border-orange-300' : 'border-[var(--rule)]'}`}>
              <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className={`text-3xl font-mono font-bold ${kpi.alert ? 'text-orange-600' : 'text-[var(--navy)]'}`}>{kpi.value}</div>
              <div className="text-xs text-[var(--ink-3)]">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--rule)]">
          {([
            { id:'main',    label:`Main Pool (${main.length})` },
            { id:'sandbox', label:`Sandbox (${sandbox.length})` },
            { id:'flags',   label:`Flags (${allFlags.length})`, alert: allFlags.length > 0 },
          ] as Array<{id:Tab; label:string; alert?:boolean}>).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[var(--navy)] text-[var(--navy)]'
                  : `border-transparent ${t.alert ? 'text-orange-600' : 'text-[var(--ink-3)]'} hover:text-[var(--ink)]`
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--ink-3)]">Đang tải...</div>
        ) : tab === 'flags' ? (
          /* Flags tab */
          <div className="space-y-2">
            {allFlags.length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--ink-3)]">Không có flag nào</div>
            ) : allFlags.map((f, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${FLAG_COLORS[f.cls] || FLAG_COLORS.gold}`}>
                <span className="font-semibold">{f.childName}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Cycle table */
          <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden">
            {(tab === 'main' ? main : sandbox).length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--ink-3)]">Không có cycle nào</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--rule-2)] border-b border-[var(--rule)]">
                  <tr>
                    {['Trẻ / Cycle','Therapist','Stage','Deficit','Tiến độ','Sessions','Flags',''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold text-[var(--ink-3)] text-left uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rule-2)]">
                  {(tab === 'main' ? main : sandbox).map(c => {
                    const sessDone = (c.daily_sessions||[]).length
                    const sessPct  = Math.round(sessDone / c.planned_sessions * 100)
                    return (
                      <tr key={c.id} className="hover:bg-[var(--rule-2)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--ink)]">{c.child.name}</div>
                          <div className="text-xs text-[var(--ink-3)]">{c.cycle_name || 'Unnamed cycle'}</div>
                          {c.isSandbox && c.governance_meta?.sandbox_hypothesis && (
                            <div className="text-xs text-yellow-700 mt-0.5 italic">{c.governance_meta.sandbox_hypothesis}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.therapist?.full_name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[var(--ink)]">{c.therapist.full_name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {ROLE_LABEL[c.therapist.role || ''] || c.therapist.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--ink-3)] italic">Chưa assign</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-[var(--navy)]">{c.baseline.stage}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--ink-2)]">{c.deficit.name}</span>
                        </td>
                        <td className="px-4 py-3 w-36">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${c.cyclePct >= 60 ? 'bg-[var(--green)]' : c.cyclePct >= 30 ? 'bg-[var(--gold)]' : 'bg-[var(--red)]'}`}
                                style={{ width: `${c.cyclePct}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-[var(--ink-3)] w-8">{c.cyclePct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono">{sessDone}/{c.planned_sessions}</span>
                          <span className="text-xs text-[var(--ink-3)] ml-1">({sessPct}%)</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.flags||[]).map((f,i) => (
                              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${FLAG_COLORS[f.cls]||FLAG_COLORS.gold}`}>
                                {f.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/therapist/report`)}
                            className="text-xs text-[var(--navy)] hover:underline"
                          >
                            Report →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
