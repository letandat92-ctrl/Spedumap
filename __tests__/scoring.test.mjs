// __tests__/scoring.test.mjs
// Suite 8 — computeBlockDelta (v1.3) invariant tests.
// Run: node __tests__/scoring.test.mjs
// No external deps — pure Node.js assert.

import { strict as assert } from 'node:assert'
import { test } from 'node:test'

// Inline the function (identical to lib/scoring.ts) so the test
// runs without TypeScript transpilation.
const PACE = { '-2': -2.0, '-1': -1.0, '0': 0.0, '1': 1.0, '2': 1.5 }
function computeBlockDelta(local, targetDelta, N) {
  return (targetDelta / Math.max(1, N)) * (PACE[String(local)] ?? 0)
}

const EPS = 1e-10 // floating-point tolerance

// ── Test 1: regression invariant |delta(-2)| > |delta(+2)| ─────────────────
test('T1 — regression heavier than progress (same targetDelta, same N)', () => {
  const G = 1.0, N = 24
  const neg = computeBlockDelta(-2, G, N)
  const pos = computeBlockDelta( 2, G, N)
  assert.ok(Math.abs(neg) > Math.abs(pos),
    `|delta(-2)| ${Math.abs(neg)} should be > |delta(+2)| ${Math.abs(pos)}`)
})

// ── Test 2: +1 × N sessions exactly reaches goal ────────────────────────────
test('T2 — anchor: +1 pace × N sessions == targetDelta', () => {
  const G = 1.0, N = 24
  const d = computeBlockDelta(1, G, N)
  const sum = d * N
  assert.ok(Math.abs(sum - G) < EPS,
    `Sum ${sum} should equal G ${G} (diff ${Math.abs(sum - G)})`)
})

// ── Test 3: anchor with G=2.0, N=30 ────────────────────────────────────────
test('T3 — anchor: +1 × N=30, G=2.0 → Σ == 2.0', () => {
  const G = 2.0, N = 30
  const sum = computeBlockDelta(1, G, N) * N
  assert.ok(Math.abs(sum - G) < EPS,
    `Sum ${sum} should equal G ${G}`)
})

// ── Test 4: 2 sessions +1, N=24 → progress ~8%, NOT 100% ───────────────────
// Regression test for old bug: LOCAL_TO_DELTA had no /N, so 2 sessions
// returned 0.40 flat regardless of N (>> 8% for small goals).
test('T4 — regression: 2 sessions +1, N=24 → progress ~8.3%, not 100%', () => {
  const G = 1.0, N = 24
  const twoSessions = computeBlockDelta(1, G, N) * 2
  const pct = twoSessions / G
  assert.ok(pct > 0.07 && pct < 0.10,
    `2 sessions should give ~8.3% progress, got ${(pct * 100).toFixed(1)}%`)
})

// ── Test 5: +2 pace reaches goal before N sessions ──────────────────────────
// At +2 (pace 1.5×), cumulative at session k = G * 1.5 * k / N
// Reaches G when k = N/1.5 ≈ 0.667×N
test('T5 — +2 pace clamps to goal before N sessions', () => {
  const G = 1.0, N = 24
  const d2 = computeBlockDelta(2, G, N)
  const kReach = Math.ceil(G / d2)  // first session where cumΔ >= G
  assert.ok(kReach < N,
    `+2 pace should reach goal before N=${N} sessions, reaches at k=${kReach}`)
  assert.ok(kReach > 0, 'kReach must be positive')
})

// ── Test 6: 0 pace → no change ─────────────────────────────────────────────
test('T6 — 0 pace → delta is exactly 0', () => {
  assert.strictEqual(computeBlockDelta(0, 1.5, 24), 0)
  assert.strictEqual(computeBlockDelta(0, 0.0, 10), 0)
})

// ── Test 7: regression direction — negative targetDelta with positive pace ──
test('T7 — negative targetDelta with +1 pace accumulates correctly', () => {
  // A block already at target (targetDelta = 0) → no movement
  assert.strictEqual(computeBlockDelta(1, 0, 24), 0)
  // A block where baseline > target (targetDelta < 0) → negative delta at +1
  const d = computeBlockDelta(1, -0.5, 10)
  assert.ok(d < 0, `Expected negative delta, got ${d}`)
})

// ── Test 8: N=1 edge case ────────────────────────────────────────────────────
test('T8 — N=1: +1 × 1 session == G', () => {
  const G = 0.8, N = 1
  const d = computeBlockDelta(1, G, N)
  assert.ok(Math.abs(d - G) < EPS,
    `Single session +1 should equal G=${G}, got ${d}`)
})

console.log('\n✅ Suite 8 complete.\n')
