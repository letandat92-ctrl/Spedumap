'use client'

import type { GoalEntry } from '@/hooks/useGoal'
import type { BlocksMap } from '@/types/spedumap'

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
  oral_language:'Oral Language',word_finding:'Word Finding',
  phonemic_awareness:'Phonemic Awareness',auditory_memory:'Auditory Memory',visual_memory:'Visual Memory',
  self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living',
  math:'Math',writing:'Writing',reading:'Reading',
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
const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']

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

// ── GoalKPI ──────────────────────────────────────────────────

interface GoalKPIProps {
  baselineBlocks:  BlocksMap
  targetBlocks:    BlocksMap
  goals:           Record<string, GoalEntry>
  baselineStage:   string
  baselineTotal:   number   // locked baseline snapshot (engine_snapshot.total) — single source of truth
  signals?:        Record<string, number>
}

export function GoalKPI({ baselineBlocks, targetBlocks, goals, baselineStage, baselineTotal, signals }: GoalKPIProps) {
  // Anchor baseline + delta to the locked snapshot total so the goal KPI matches
  // Cycle Open's bTotal. `gain` keeps the existing scoring formula unchanged.
  const baseTotal   = baselineTotal
  const gain        = computeTotal({ ...baselineBlocks, ...targetBlocks }) - computeTotal(baselineBlocks)
  const targetTotal = baseTotal + gain
  const delta       = gain
  const goalCount   = Object.keys(goals).length

  // Dominant signal
  let topSignal = '—'
  if (signals) {
    const top = Object.entries(signals).sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] > 0) {
      topSignal = { sensorimotor: 'Sensorimotor', regulation: 'Regulation', cognitive: 'Cognitive' }[top[0]] ?? top[0]
    }
  }

  const kpis = [
    { label: 'Baseline',     value: baseTotal.toFixed(1),     color: 'var(--warn)', delta: false, small: false },
    { label: 'Target',       value: targetTotal.toFixed(1),   color: 'var(--good)', delta: false, small: false },
    { label: 'Tổng delta kỳ vọng', value: `+${delta.toFixed(1)}`, color: 'var(--good)', delta: true,  small: false },
    { label: 'Stage',        value: baselineStage,            color: 'var(--warn)', delta: false, small: false },
    { label: 'Goals',        value: String(goalCount),        color: goalCount > 0 ? 'var(--good)' : 'var(--sub)', delta: false, small: false },
    { label: 'Signal chính', value: topSignal,                color: 'var(--red)',  delta: false, small: true  },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
      {kpis.map(kpi => (
        <div
          key={kpi.label}
          className="flex flex-col items-center"
          style={{
            minWidth: kpi.delta ? 90 : kpi.small ? 80 : 70,
            padding: '6px 12px',
            borderRadius: 7,
            background: kpi.delta ? 'var(--good-bg)' : 'var(--warm-bg)',
            border: `1px solid ${kpi.delta ? 'var(--good-bd)' : 'var(--border)'}`,
          }}
        >
          <div
            className="uppercase"
            style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.1em', marginBottom: 2, color: kpi.delta ? 'var(--good)' : 'var(--sub)' }}
          >
            {kpi.label}
          </div>
          <div
            style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, lineHeight: 1, fontSize: kpi.small ? 11 : kpi.delta ? 18 : 20, paddingTop: kpi.small ? 3 : 0, color: kpi.color }}
          >
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── GoalChips ─────────────────────────────────────────────────

interface GoalChipsProps {
  goals:          Record<string, GoalEntry>
  baselineBlocks: Record<string, unknown>
}

export function GoalChips({ goals, baselineBlocks }: GoalChipsProps) {
  const entries = Object.entries(goals)

  if (!entries.length) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontStyle: 'italic', color: 'var(--sub)', padding: '6px 0' }}>
        Chưa chọn goal nào
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
      {entries.map(([key, goal]) => {
        const lid      = B2L[key] ?? 'L0'
        const color    = LAYER_COLORS[lid]
        const base     = getScore(baselineBlocks[key] ?? 0)
        const target   = base + goal.delta
        const isWarn   = goal.delta >= 2.0
        const deltaColor = isWarn ? 'var(--warn)' : 'var(--good)'

        return (
          <div
            key={key}
            className="flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: 'var(--warm-bg)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 8px' }}
          >
            <div className="rounded-sm flex-shrink-0" style={{ width: 3, height: 22, background: color }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink)' }}>{BN[key] ?? key}</div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: 'var(--sub)' }}>
                {base.toFixed(1)} → <span style={{ fontWeight: 700, color: deltaColor }}>{target.toFixed(1)}</span>{' '}
                <span style={{ fontWeight: 700, color: deltaColor }}>(+{goal.delta.toFixed(1)})</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
