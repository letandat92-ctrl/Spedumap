'use client'

import type { GoalEntry } from '@/hooks/useGoal'
import type { BlocksMap } from '@/types/spedumap'
import { computeSignals, SIGNAL_T } from '@/lib/signals'

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
const LAYER_COLORS: Record<string,string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}
const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']

function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

// ── Signal Strip ──────────────────────────────────────────────

interface SignalStripProps { blocks: Record<string, unknown> }

export function SignalStrip({ blocks }: SignalStripProps) {
  const T = SIGNAL_T
  // Shared Formula A (see lib/signals.ts) — same ranking as the baseline engine
  // and the goal page's Dominant-Deficit badge.
  const sig = computeSignals(blocks)

  const signals = [
    { label: 'Sensorimotor Deficit', val: sig.sensorimotor, color: '#B83030' },
    { label: 'Regulation Deficit',   val: sig.regulation,   color: '#A02020' },
    { label: 'Cognitive Deficit',    val: sig.cognitive,    color: '#C87020' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {signals.map(s => {
        const pct = Math.min(100, Math.round(s.val / T * 100))
        return (
          <div key={s.label} className="bg-white border border-[var(--rule)] rounded-lg p-3">
            <div className="text-[10px] text-[var(--ink-3)] mb-1">{s.label}</div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-sm" style={{ color: s.val > 0 ? s.color : 'var(--green)' }}>
                {s.val.toFixed(2)}
              </span>
              <span className="text-[10px] text-[var(--ink-3)]">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Baseline Readonly ─────────────────────────────────────────

interface BaselineReadonlyProps { blocks: Record<string, unknown> }

export function BaselineReadonly({ blocks }: BaselineReadonlyProps) {
  // Group by layer
  const grouped: Record<string, Array<[string, number]>> = {}
  for (const [k, v] of Object.entries(blocks)) {
    const l = B2L[k]; if (!l) continue
    if (!grouped[l]) grouped[l] = []
    grouped[l].push([k, getScore(v)])
  }

  return (
    <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--rule-2)] border-b border-[var(--rule)]">
        <span className="text-xs font-semibold text-[var(--ink)]">Baseline đã khoá — Chỉ đọc</span>
      </div>
      <div className="divide-y divide-[var(--rule-2)] max-h-64 overflow-y-auto">
        {LAYER_IDS.map(lid => {
          const items = grouped[lid] || []
          if (!items.length) return null
          return items.map(([k, v]) => {
            const sc = v >= 3 ? 'text-[var(--green)]' : v >= 2 ? 'text-[var(--gold)]' : v >= 1 ? '#C07010' : 'text-[var(--red)]'
            return (
              <div key={k} className="flex items-center gap-2 px-4 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: LAYER_COLORS[lid] }} />
                <span className="text-xs text-[var(--ink-2)] flex-1">{BN[k] ?? k}</span>
                <span className="text-[10px] text-[var(--ink-3)]">{lid}</span>
                <span className="text-xs font-mono font-bold" style={{ color: sc }}>{v.toFixed(1)}</span>
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}

// ── Target Readonly ───────────────────────────────────────────

interface TargetReadonlyProps {
  baselineBlocks: Record<string, unknown>
  targetBlocks:   BlocksMap
  goalDetail:     Record<string, GoalEntry>
}

export function TargetReadonly({ baselineBlocks, targetBlocks, goalDetail }: TargetReadonlyProps) {
  const entries = Object.entries(targetBlocks)

  if (!entries.length) {
    return (
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4 text-xs text-[var(--ink-3)] italic">
        Chưa có target blocks.
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--rule-2)] border-b border-[var(--rule)]">
        <span className="text-xs font-semibold text-[var(--ink)]">Target blocks đã xác nhận — Chỉ đọc</span>
      </div>
      <div className="divide-y divide-[var(--rule-2)] max-h-64 overflow-y-auto">
        {entries.map(([k, tv]) => {
          const lid      = B2L[k] ?? 'L0'
          const base     = getScore(baselineBlocks[k] ?? 0)
          const target   = getScore(tv)
          const delta    = target - base
          const goal     = goalDetail[k]
          const hasWarn  = delta >= 2.0
          return (
            <div key={k} className="flex items-center gap-2 px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: LAYER_COLORS[lid] }} />
              <span className="text-xs text-[var(--ink-2)] flex-1">{BN[k] ?? k}</span>
              <span className="text-[10px] font-mono text-[var(--ink-3)]">{base.toFixed(1)}</span>
              <span className="text-[10px] text-[var(--ink-3)]">→</span>
              <span className="text-xs font-mono font-bold text-[var(--navy)]">{target.toFixed(1)}</span>
              <span className={`text-[10px] font-mono ${hasWarn ? 'text-[var(--gold)]' : 'text-[var(--green)]'}`}>
                (+{delta.toFixed(1)})
              </span>
              {goal?.regression && (
                <span className="text-[9px] text-[var(--gold)] border border-[var(--gold-bd)] bg-[var(--gold-bg)] px-1 rounded">
                  regression
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
