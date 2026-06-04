// Precheck: capture engine output before ontology refactor.
// Run: node __tests__/ontology-precheck.mjs
// Import only the pure data (no re-exports that pull in scoring/anchor chains)
// We verify these values match by running the same engine logic.
const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
const LAYER_WEIGHTS = { L0:18, L1:16, L2:14, L3:12, L4:12, L5:10, L6:10, L7:8 }
const BLOCK_WEIGHTS = {
  L0:{sleep:.25,microbiome:.25,nutrition:.20,immune:.15,metabolic:.15},
  L1:{arousal:.40,reflex_survival:.10,reflex_postural:.10,reflex_cortical:.05,tone:.20,ns_stability:.15},
  L2:{vestibular:.22,proprioception:.18,auditory:.16,visual:.16,tactile:.12,taste:.08,smell:.08},
  L3:{motor_planning:1/5,gross_motor:1/5,fine_motor:1/5,postural_control:1/5,bilateral_coord:1/5},
  L4:{attention:.35,auditory_processing:.30,visual_processing:.30,wm_link:.05},
  L5:{oral_language:1/5,word_finding:1/5,phonemic_awareness:1/5,auditory_memory:1/5,visual_memory:1/5},
  L6:{self_control:1/4,behavior:1/4,social_skills:1/4,daily_living:1/4},
  L7:{math:1/3,writing:1/3,reading:1/3},
}

// Inline a minimal runEngine for precheck — avoids deep import chain issues in raw Node
const THRESHOLD = 2.5

function computeLayerScore(blocks, weights) {
  let total = 0
  for (const b in weights) total += (blocks[b] ?? 0) * weights[b]
  return total
}
function normalizeWeights(w) {
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  const out = {}
  for (const k in w) out[k] = w[k] / total
  return out
}
function computeSignals(rough) {
  return {
    sensorimotor: Math.max(0, THRESHOLD - ((rough.L2 || 0) * 0.55 + (rough.L3 || 0) * 0.45)),
    regulation:   Math.max(0, THRESHOLD - ((rough.L1 || 0) * 0.70 + (rough.L0 || 0) * 0.30)),
    cognitive:    Math.max(0, THRESHOLD - ((rough.L4 || 0) * 0.60 + (rough.L5 || 0) * 0.40)),
  }
}
function adjustL0(w, s) { const o = {...w}; o.sleep *= (1+0.30*s.regulation); o.microbiome *= (1+0.20*s.sensorimotor); return normalizeWeights(o) }
function adjustL1(w, s) { const o = {...w}; o.arousal *= (1+0.25*s.regulation); const rb = (1+0.20*s.sensorimotor); o.reflex_survival *= rb; o.reflex_postural *= rb; o.reflex_cortical *= rb; return normalizeWeights(o) }
function adjustL2(w, s) { const o = {...w}; o.vestibular *= (1+0.20*s.sensorimotor); o.proprioception *= (1+0.20*s.sensorimotor); return normalizeWeights(o) }
function adjustL4(w, s) { const o = {...w}; o.attention *= (1+0.25*s.regulation); o.attention *= (1+0.15*s.cognitive); return normalizeWeights(o) }
function applyLayerLock(ls) { const adj = {...ls}; for (let i=1;i<LAYER_IDS.length;i++) { const lo=LAYER_IDS[i-1],c=LAYER_IDS[i]; if(ls[lo]<1.5) adj[c]*=0.4; else if(ls[lo]<2.0) adj[c]*=0.7 } return adj }
function runEngine(blocks) {
  const rough = {}; LAYER_IDS.forEach(lid => { rough[lid] = computeLayerScore(blocks, BLOCK_WEIGHTS[lid]) })
  const signals = computeSignals(rough)
  const final = {}; LAYER_IDS.forEach(lid => {
    let w = {...BLOCK_WEIGHTS[lid]}
    if (lid==='L0') w = adjustL0(w, signals)
    else if (lid==='L1') w = adjustL1(w, signals)
    else if (lid==='L2') w = adjustL2(w, signals)
    else if (lid==='L4') w = adjustL4(w, signals)
    final[lid] = computeLayerScore(blocks, w)
  })
  const adj = applyLayerLock(final)
  let total = 0; LAYER_IDS.forEach(lid => { total += (adj[lid]/4.0)*LAYER_WEIGHTS[lid] })
  let stage = 'L0'; LAYER_IDS.forEach((lid,i) => { if (adj[lid]>=2.5 && (i===0||adj[LAYER_IDS[i-1]]>=2.0)) stage = lid })
  let lockActive = false; for (let i=1;i<LAYER_IDS.length;i++) { if (final[LAYER_IDS[i-1]]<2.0) { lockActive=true; break } }
  return { signals: { sensorimotor: Math.round(signals.sensorimotor*1000)/1000, regulation: Math.round(signals.regulation*1000)/1000, cognitive: Math.round(signals.cognitive*1000)/1000 }, layerScores: adj, total, stage, lockActive }
}

// Sample baseline: all blocks at 2.0
const blocks = {}
const allBlocks = [
  'sleep','microbiome','nutrition','immune','metabolic',
  'arousal','reflex_survival','reflex_postural','reflex_cortical','tone','ns_stability',
  'vestibular','proprioception','auditory','visual','tactile','taste','smell',
  'motor_planning','gross_motor','fine_motor','postural_control','bilateral_coord',
  'attention','auditory_processing','visual_processing','wm_link',
  'oral_language','word_finding','phonemic_awareness','auditory_memory','visual_memory',
  'self_control','behavior','social_skills','daily_living',
  'math','writing','reading',
]
for (const b of allBlocks) blocks[b] = 2.0

const result = runEngine(blocks)
console.log('=== PRECHECK ENGINE OUTPUT ===')
console.log('total:', result.total)
console.log('stage:', result.stage)
console.log('signals:', JSON.stringify(result.signals))
console.log('lockActive:', result.lockActive)
console.log('layerScores:', JSON.stringify(result.layerScores))

// Sample 2: mixed scores (simulate real data)
const blocks2 = { ...blocks }
blocks2.sleep = 3.5; blocks2.arousal = 1.0; blocks2.vestibular = 3.0; blocks2.attention = 0.5
const r2 = runEngine(blocks2)
console.log('\n=== PRECHECK MIXED ===')
console.log('total:', r2.total)
console.log('stage:', r2.stage)
console.log('signals:', JSON.stringify(r2.signals))
console.log('lockActive:', r2.lockActive)

// CyclePct sample
const baseTotal = result.total
const targetTotal = 80
const currentTotal = 55
const cyclePct = Math.max(0, Math.min(100, Math.round((currentTotal - baseTotal) / (targetTotal - baseTotal) * 100)))
console.log('\n=== PRECHECK CYCLE PCT ===')
console.log('baseTotal:', baseTotal, 'targetTotal:', targetTotal, 'currentTotal:', currentTotal)
console.log('cyclePct:', cyclePct)
