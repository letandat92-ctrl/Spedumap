// __tests__/nearme-mix.test.mjs — nearmeMix invariant tests.
// Run: node __tests__/nearme-mix.test.mjs
//
// WHY: nearmeMix is the only public API for NEARMe domain weights.
// Consumers must never read NEARME_MIX_BY_LAYER directly so the
// upgrade path from phase (a) flat-layer to (b) score-interpolated
// stays intact without changing call sites.
//
// These constants + function are copied verbatim from lib/ontology.ts.
// If the test fails after editing ontology.ts, update both.

// ── Verbatim from lib/ontology.ts ───────────────────────────────────────────

const B2L = {
  sleep:'L0',microbiome:'L0',nutrition:'L0',immune:'L0',metabolic:'L0',
  arousal:'L1',reflex_survival:'L1',reflex_postural:'L1',reflex_cortical:'L1',tone:'L1',ns_stability:'L1',
  vestibular:'L2',proprioception:'L2',auditory:'L2',visual:'L2',tactile:'L2',taste:'L2',smell:'L2',
  motor_planning:'L3',gross_motor:'L3',fine_motor:'L3',postural_control:'L3',bilateral_coord:'L3',
  attention:'L4',auditory_processing:'L4',visual_processing:'L4',wm_link:'L4',
  oral_language:'L5',word_finding:'L5',phonemic_awareness:'L5',auditory_memory:'L5',visual_memory:'L5',
  self_control:'L6',behavior:'L6',social_skills:'L6',daily_living:'L6',
  math:'L7',writing:'L7',reading:'L7',
}
const NEARME_DOMAINS = ['N','E','A','R','Me']
const NEARME_MIX_BY_LAYER = {
  L0:{N:.50,Me:.50}, L1:{R:.90,Me:.10}, L2:{R:.90,Me:.10},
  L3:{R:.55,Me:.40,A:.05}, L4:{Me:.45,E:.45,A:.10},
  L5:{A:.45,E:.45,Me:.10}, L6:{A:.45,E:.45,Me:.10}, L7:{E:.85,A:.15},
}

function nearmeMix(block, score) {
  const layer = B2L[block]
  if (!layer) throw new Error(`nearmeMix: unknown block "${block}"`)
  void score
  const raw = NEARME_MIX_BY_LAYER[layer] ?? {}
  const out = { N:0, E:0, A:0, R:0, Me:0 }
  let sum = 0
  for (const d of NEARME_DOMAINS) { out[d] = raw[d] ?? 0; sum += out[d] }
  if (sum > 0) for (const d of NEARME_DOMAINS) out[d] /= sum
  return out
}

// ── Tests ───────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(actual, expected, label, tolerance = 0) {
  const ok = tolerance > 0
    ? Math.abs(actual - expected) <= tolerance
    : actual === expected
  if (ok) { passed++ }
  else { failed++; console.error(`  FAIL: ${label} — expected ${expected}, got ${actual}`) }
}

console.log('nearmeMix tests\n')

// 1. Σ ≈ 1 for every layer (via a representative block)
console.log('— sum ≈ 1 for representative blocks —')
const reps = ['sleep','arousal','vestibular','gross_motor','attention','oral_language','behavior','math']
for (const block of reps) {
  const mix = nearmeMix(block)
  const sum = NEARME_DOMAINS.reduce((s, d) => s + mix[d], 0)
  assert(sum, 1.0, `Σ(${block}) ≈ 1`, 1e-9)
}

// 2. L3 block returns R = 0.55
console.log('— L3 block motor_planning → R = 0.55 —')
const l3 = nearmeMix('motor_planning')
assert(l3.R, 0.55, 'motor_planning.R = 0.55', 1e-9)
assert(l3.Me, 0.40, 'motor_planning.Me = 0.40', 1e-9)
assert(l3.A, 0.05, 'motor_planning.A = 0.05', 1e-9)
assert(l3.N, 0, 'motor_planning.N = 0')
assert(l3.E, 0, 'motor_planning.E = 0')

// 3. All 5 domains present in output (even if 0)
console.log('— all 5 domains always present —')
const l0 = nearmeMix('sleep')
for (const d of NEARME_DOMAINS) {
  assert(typeof l0[d], 'number', `sleep.${d} is number`)
}

// 4. Unknown block throws
console.log('— unknown block throws —')
let threw = false
try { nearmeMix('nonexistent_block') } catch { threw = true }
assert(threw, true, 'unknown block throws')

// 5. score param accepted but ignored (phase a)
console.log('— score param ignored in phase (a) —')
const withScore = nearmeMix('sleep', 3.5)
const without   = nearmeMix('sleep')
for (const d of NEARME_DOMAINS) {
  assert(withScore[d], without[d], `sleep.${d} same with/without score`, 1e-12)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
