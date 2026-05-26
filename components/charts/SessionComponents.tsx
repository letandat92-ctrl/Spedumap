'use client'

import { useState } from 'react'
import type { LocalScore } from '@/hooks/useSession'


const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
const LAYER_NAMES: Record<string,string> = {
  L0:'Sinh học',L1:'Thần kinh',L2:'Giác quan',L3:'Vận động',
  L4:'Xử lý',L5:'Giao tiếp',L6:'QL Cuộc sống',L7:'Học thuật',
}
const LAYER_COLORS: Record<string,string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
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
  oral_language:'Oral Language',word_finding:'Word Finding',
  phonemic_awareness:'Phonemic Awareness',auditory_memory:'Auditory Memory',visual_memory:'Visual Memory',
  self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living',
  math:'Math',writing:'Writing',reading:'Reading',
}

const LAYER_BG: Record<string,string> = {
  L0:'#FDF5F5',L1:'#FDF2F0',L2:'#FDF5F0',L3:'#FDF8F0',
  L4:'#FDF8EC',L5:'#EEF8F2',L6:'#EEF2FC',L7:'#F0F2FF',
}

const LOCAL_DELTAS: Record<number, number> = { '-2': -0.50, '-1': -0.20, 0: 0.00, 1: 0.20, 2: 0.40 }

// ── Target Blocks Table ───────────────────────────────────────

interface TargetBlocksTableProps {
  activities:     Record<string, { localScore: number | null; note: string }>
  baselineBlocks: Record<string, unknown>
  targetBlocks:   Record<string, unknown>
  currentScores:  Record<string, number>
  onLocalScore:   (block: string, score: LocalScore | null) => void
  onNote:         (block: string, note: string) => void
}

export function TargetBlocksTable({
  activities, baselineBlocks, targetBlocks, currentScores,
  onLocalScore, onNote,
}: TargetBlocksTableProps) {
  const [activities2, setActivities2] = useState<Record<string, string>>({})
  const [focuses, setFocuses]         = useState<Record<string, string>>({})

  const keys = Object.keys(targetBlocks)

  return (
    <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--rule-2)] border-b border-[var(--rule)]">
        <span className="text-xs font-semibold text-[var(--ink)]">Target Delta Score</span>
        <span className="text-xs text-[var(--ink-3)]">
          {Object.values(activities).filter(a => a.localScore !== null).length} / {keys.length} blocks nhập
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-[var(--rule-2)]">
            <tr className="text-[10px] text-[var(--ink-3)] uppercase tracking-wider">
              <th className="px-3 py-2 text-left w-6">#</th>
              <th className="px-3 py-2 text-left">Hoạt động</th>
              <th className="px-3 py-2 text-left">Layer / Focus</th>
              <th className="px-3 py-2 text-center w-16">Target Δ</th>
              <th className="px-3 py-2 text-center">Local Score</th>
              <th className="px-3 py-2 text-left">Phản ứng / Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rule-2)]">
            {keys.map((key, i) => {
              const lid      = B2L[key] ?? 'L0'
              const color    = LAYER_COLORS[lid]
              const baseline = getScore(baselineBlocks[key] ?? 0)
              const target   = getScore(targetBlocks[key] ?? 0)
              const current  = currentScores[key] ?? baseline
              const td       = target - baseline
              const act      = activities[key]
              const ls       = act?.localScore ?? null
              const newScore = ls !== null
                ? Math.min(target, current + td * (LOCAL_DELTAS[ls] ?? 0))
                : null

              return (
                <tr key={key} className={`${ls !== null ? 'bg-green-50/30' : ''}`}>
                  <td className="px-3 py-2 text-[var(--ink-3)]">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-[var(--ink)] mb-0.5">{BN[key] ?? key}</div>
                    <input
                      value={activities2[key] ?? ''}
                      onChange={e => setActivities2(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="Hoạt động / bài tập hôm nay..."
                      className="w-full text-[10px] text-[var(--ink-3)] border-0 border-b border-[var(--rule-2)] outline-none bg-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: LAYER_BG[lid], color, border: `1px solid ${color}40` }}>
                      {lid}
                    </span>
                    <input
                      value={focuses[key] ?? ''}
                      onChange={e => setFocuses(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="Điểm tập trung..."
                      className="mt-1 w-full text-[10px] text-[var(--ink-3)] border-0 border-b border-[var(--rule-2)] outline-none bg-transparent"
                    />
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-[var(--navy)]">
                    +{td.toFixed(1)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-center">
                      {([-2,-1,0,1,2] as const).map(score => {
                        const labels: Record<number,string> = {'-2':'−2','-1':'−1','0':'0','1':'+1','2':'+2'}
                        const colors: Record<number,string> = {
                          '-2':'bg-red-100 text-red-800 border-red-300',
                          '-1':'bg-orange-100 text-orange-800 border-orange-300',
                           '0':'bg-gray-100 text-gray-600 border-gray-300',
                           '1':'bg-green-100 text-green-800 border-green-300',
                           '2':'bg-emerald-100 text-emerald-800 border-emerald-300',
                        }
                        const sel = ls === score
                        return (
                          <button
                            key={score}
                            onClick={() => onLocalScore(key, sel ? null : score)}
                            className={`w-8 h-7 text-[10px] font-bold rounded border transition-all ${
                              sel ? colors[score] + ' ring-1 ring-current' : 'border-[var(--rule)] text-[var(--ink-3)] hover:border-gray-400'
                            }`}
                          >
                            {labels[score]}
                          </button>
                        )
                      })}
                    </div>
                    {newScore !== null && (
                      <div className="text-center text-[10px] font-mono mt-1 text-[var(--ink-3)]">
                        {current.toFixed(1)} → <span className="font-bold text-[var(--navy)]">{newScore.toFixed(1)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={act?.note ?? ''}
                      onChange={e => onNote(key, e.target.value)}
                      placeholder="Phản ứng trẻ, điều chỉnh..."
                      className="w-full text-[10px] border-0 border-b border-[var(--rule-2)] outline-none bg-transparent"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
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

function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

function computeTotal(blocks: Record<string, unknown>): number {
  let t = 0
  LAYER_IDS.forEach(lid => {
    const bw = BW[lid]; let s = 0
    Object.entries(bw).forEach(([k, w]) => { s += getScore(blocks[k] ?? 0) * w })
    t += (s / 4) * LAYER_W[lid]
  })
  return t
}

function layerScore(blocks: Record<string, unknown>, lid: string): number {
  const bw = BW[lid]; if (!bw) return 0
  return Object.entries(bw).reduce((s, [k, w]) => s + getScore(blocks[k] ?? 0) * w, 0)
}

// ── Donut SVG ─────────────────────────────────────────────────

function Donut({ pct }: { pct: number }) {
  const r = 24, cx = 30, cy = 30
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg viewBox="0 0 60 60" width="60" height="60">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="#6EE7A0" strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fontFamily="DM Mono, monospace" fontSize="11" fontWeight="700" fill="white">
        {pct}%
      </text>
    </svg>
  )
}

// ── Session Summary Panel ─────────────────────────────────────

interface SessionSummaryProps {
  currentBlocks:  Record<string, number>
  baselineBlocks: Record<string, unknown>
  targetBlocks:   Record<string, unknown>
}

export function SessionSummary({ currentBlocks, baselineBlocks, targetBlocks }: SessionSummaryProps) {
  const current  = computeTotal(currentBlocks)
  const baseline = computeTotal(baselineBlocks)
  const target   = computeTotal({ ...baselineBlocks, ...targetBlocks })
  const delta    = current - baseline
  const needed   = target - baseline
  const pct      = needed > 0 ? Math.max(0, Math.min(100, Math.round(delta / needed * 100))) : 100

  return (
    <div className="bg-[var(--navy)] rounded-xl p-4">
      <div className="flex items-center gap-4 mb-3">
        <Donut pct={pct} />
        <div>
          <div className="text-2xl font-mono font-bold text-white">{current.toFixed(1)}</div>
          <div className="text-xs text-white/50">Tổng điểm hiện tại / 100</div>
          <div className="text-xs text-white/40 mt-0.5">% phát triển chu kỳ</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Baseline',           value: baseline.toFixed(1), color: 'text-[var(--gold)]' },
          { label: 'Target cuối chu kỳ', value: target.toFixed(1),   color: 'text-[var(--green)]' },
          { label: 'Delta từ baseline',  value: (delta >= 0 ? '+' : '') + delta.toFixed(1), color: delta >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]' },
        ].map(chip => (
          <div key={chip.label} className="bg-white/10 rounded-lg p-2 text-center">
            <div className="text-[9px] text-white/50 mb-0.5">{chip.label}</div>
            <div className={`text-sm font-mono font-bold ${chip.color}`}>{chip.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Layer Progress Table ──────────────────────────────────────

interface LayerTableProps {
  currentBlocks:  Record<string, number>
  baselineBlocks: Record<string, unknown>
  targetBlocks:   Record<string, unknown>
}

export function LayerTable({ currentBlocks, baselineBlocks, targetBlocks }: LayerTableProps) {
  const merged = { ...baselineBlocks, ...targetBlocks }

  const rows = LAYER_IDS.map(lid => {
    const hasTarget = Object.keys(targetBlocks).some(k => B2L[k] === lid)
    if (!hasTarget) return null

    const cur      = layerScore(currentBlocks, lid)
    const base     = layerScore(baselineBlocks, lid)
    const tgtScore = layerScore(merged, lid)
    const needed   = tgtScore - base
    const achieved = cur - base
    const pct      = needed > 0 ? Math.max(0, Math.min(100, Math.round(achieved / needed * 100))) : 100
    const pc       = pct >= 60 ? 'var(--green)' : pct >= 30 ? '#C07010' : 'var(--red)'

    return { lid, cur, tgtScore, needed, pct, pc }
  }).filter(Boolean) as Array<{lid:string;cur:number;tgtScore:number;needed:number;pct:number;pc:string}>

  if (!rows.length) return null

  return (
    <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--rule-2)] border-b border-[var(--rule)]">
        <span className="text-xs font-semibold text-[var(--ink)]">Target Delta Score — Tiến độ theo Layer</span>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-[var(--rule-2)] border-b border-[var(--rule)]">
          <tr>
            {['Layer','Hiện tại','Target','Còn lại','Tiến độ'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--rule-2)]">
          {rows.map(({ lid, cur, tgtScore, needed, pct, pc }) => (
            <tr key={lid}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[lid] }} />
                  <span className="font-medium text-[var(--ink)]">{LAYER_NAMES[lid]}</span>
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-[var(--navy)]">{cur.toFixed(2)}</td>
              <td className="px-3 py-2 font-mono text-[var(--ink-3)]">{tgtScore.toFixed(2)}</td>
              <td className="px-3 py-2 font-mono" style={{ color: pc }}>
                +{Math.max(0, tgtScore - cur).toFixed(2)}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pc }} />
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: pc }}>{pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
