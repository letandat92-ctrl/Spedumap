'use client'

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BlocksMap } from '@/types/spedumap'

const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
const LAYER_LABELS: Record<string,string> = {
  L0:'L0 Sinh học', L1:'L1 Thần kinh', L2:'L2 Giác quan', L3:'L3 Vận động',
  L4:'L4 Xử lý', L5:'L5 Giao tiếp', L6:'L6 QL Cuộc sống', L7:'L7 Học thuật',
}
const LAYER_COLORS: Record<string,string> = {
  L0:'#8B1A1A', L1:'#A02020', L2:'#B83030', L3:'#C55030',
  L4:'#C87020', L5:'#4A8A60', L6:'#2A6A9A', L7:'#3A5AAA',
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

function layerScore(blocks: Record<string, unknown>, lid: string): number {
  const bw = BW[lid]; if (!bw) return 0
  return Object.entries(bw).reduce((s, [k, w]) => s + getScore(blocks[k] ?? 0) * w, 0)
}

interface GoalChartsProps {
  baselineBlocks: Record<string, unknown>
  targetBlocks:   BlocksMap
}

export function GoalCharts({ baselineBlocks, targetBlocks }: GoalChartsProps) {
  // Radar data — L7 at top (reverse)
  const radarData = [...LAYER_IDS].reverse().map(l => ({
    layer:    LAYER_LABELS[l].replace(/L\d+ /, ''),
    baseline: parseFloat(layerScore(baselineBlocks, l).toFixed(2)),
    target:   parseFloat(layerScore({ ...baselineBlocks, ...targetBlocks }, l).toFixed(2)),
    fullMark: 4,
  }))

  // Bar data — L7 at top (reverse), stacked: baseline + gain
  const barData = [...LAYER_IDS].reverse().map(l => {
    const base   = parseFloat(layerScore(baselineBlocks, l).toFixed(2))
    const tScore = parseFloat(layerScore({ ...baselineBlocks, ...targetBlocks }, l).toFixed(2))
    return {
      layer:   l,
      label:   l,
      base,
      gain:    parseFloat(Math.max(0, tScore - base).toFixed(2)),
      color:   LAYER_COLORS[l],
    }
  })

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Radar */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">Radar — Baseline vs Target</div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--ink-3)]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block bg-red-600"/>&nbsp;Baseline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block bg-green-600" style={{borderTop:'2px dashed #1A6A3A'}}/>&nbsp;Target</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis dataKey="layer" tick={{ fontSize: 9, fill: '#6B7280' }} />
            <Radar name="Baseline" dataKey="baseline" stroke="rgba(181,32,32,0.8)" fill="rgba(181,32,32,0.12)" fillOpacity={1} dot={{ r: 2, fill: 'rgba(181,32,32,0.8)' }} />
            <Radar name="Target"   dataKey="target"   stroke="rgba(26,122,74,0.8)"  fill="rgba(26,122,74,0.12)"  fillOpacity={1} dot={{ r: 2, fill: 'rgba(26,122,74,0.8)' }} strokeDasharray="4 3" />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Pyramid bar */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">Pyramid — Layer Delta</div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--ink-3)]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm bg-gray-400 opacity-70"/>&nbsp;Baseline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm bg-green-600 opacity-70"/>&nbsp;Target gain</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 32 }} barSize={14}>
            <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#6B7280' }} width={28} />
            <Tooltip
              formatter={(value, name) => [Number(value).toFixed(2), name === 'base' ? 'Baseline' : 'Target gain']}
              contentStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="base" stackId="a" radius={[0,0,0,0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.7} />
              ))}
            </Bar>
            <Bar dataKey="gain" stackId="a" fill="rgba(26,122,74,0.7)" radius={[0,2,2,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
