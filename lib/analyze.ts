// lib/analyze.ts — Recommendation engine (extracted from goal/page.tsx)
// Identifies leverage, outlier, and bottleneck blocks for intervention.

import { B2L } from './ontology'

const PROP: Record<string, Record<string, number>> = {
  gut:                 { arousal:.70, sleep:.50, tone:.30 },
  sleep:               { arousal:.60, ns_stability:.50, attention:.40 },
  arousal:             { vestibular:.50, attention:.60, ns_stability:.70 },
  reflex:              { vestibular:.60, proprioception:.50, motor_planning:.40 },
  vestibular:          { motor_planning:.60, postural_control:.70 },
  attention:           { oral_language:.50, word_finding:.45, auditory_memory:.40 },
  auditory_processing: { phonemic_awareness:.65, oral_language:.50 },
  phonemic_awareness:  { reading:.70, writing:.50 },
}

export interface Rec { key: string; type: 'leverage' | 'outlier' | 'bottleneck'; reasons: string[] }

export function analyze(blocks: Record<string, unknown>, getScore: (v: unknown) => number): Rec[] {
  const acc: Record<string, { sum: number; n: number }> = {}
  const layerBlocks: Record<string, Array<[string, number]>> = {}
  for (const [k, raw] of Object.entries(blocks)) {
    const v = getScore(raw)
    const l = B2L[k]; if (!l) continue
    if (!acc[l]) acc[l] = { sum: 0, n: 0 }
    acc[l].sum += v; acc[l].n += 1
    ;(layerBlocks[l] ??= []).push([k, v])
  }
  const avgs: Record<string, number> = {}
  for (const l in acc) avgs[l] = acc[l].sum / acc[l].n

  const out: Rec[] = []
  const seen = new Set<string>()

  const lev: Array<Rec & { lscore: number }> = []
  for (const [k, raw] of Object.entries(blocks)) {
    const v = getScore(raw)
    if (v >= 2.5 || !PROP[k]) continue
    const ds = Object.entries(PROP[k])
    if (!ds.length) continue
    const ls = ds.reduce((s, [, x]) => s + x, 0) / ds.length
    lev.push({ key: k, type: 'leverage', reasons: ['leverage'], lscore: ds.length * ls * (2.5 - v) / 2.5 })
    seen.add(k)
  }
  lev.sort((a, b) => b.lscore - a.lscore)
  out.push(...lev.map(({ key, type, reasons }) => ({ key, type, reasons })))

  for (const [k, raw] of Object.entries(blocks)) {
    const v = getScore(raw)
    if (seen.has(k)) continue
    const l = B2L[k]; if (avgs[l] === undefined) continue
    if (avgs[l] - v < 1.0) continue
    out.push({ key: k, type: 'outlier', reasons: ['outlier'] })
    seen.add(k)
  }

  for (const [l, avg] of Object.entries(avgs)) {
    if (avg >= 2.0) continue
    const worst = (layerBlocks[l] || []).filter(([k]) => !seen.has(k)).sort((a, b) => a[1] - b[1])[0]
    if (!worst) continue
    out.push({ key: worst[0], type: 'bottleneck', reasons: ['bottleneck'] })
    seen.add(worst[0])
  }

  return out.slice(0, 6)
}
