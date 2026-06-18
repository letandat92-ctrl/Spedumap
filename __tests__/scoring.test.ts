// __tests__/scoring.test.ts
// Suite 14 — computeBlockDelta (v1.3) + stage (raw-chain, STAGE_THRESHOLD=3.0).
// Run: npx tsx __tests__/scoring.test.ts
//
// IMPORTS FROM REAL ENGINE — NOT inlined copies. If engine logic changes,
// these tests MUST fail (R9: test phải fail được khi logic thật đổi).

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { computeBlockDelta } from '../lib/scoring'
import { runEngine, STAGE_THRESHOLD, DEFICIT_THRESHOLD } from '../lib/engine'
import { BLOCK_WEIGHTS } from '../lib/ontology'

const EPS = 1e-10
const ALL_BLOCKS = Object.keys(BLOCK_WEIGHTS).flatMap(lid => Object.keys(BLOCK_WEIGHTS[lid]))

function makeBlocks(fill: number, overrides: Record<string, number> = {}): Record<string, number> {
  const b: Record<string, number> = {}
  for (const k of ALL_BLOCKS) b[k] = overrides[k] ?? fill
  return b
}

// ══════════════════════════════════════════════════════════════════════════════
// DELTA TESTS (T1–T8) — computeBlockDelta from lib/scoring.ts
// ══════════════════════════════════════════════════════════════════════════════

test('T1 — regression heavier than progress (same targetDelta, same N)', () => {
  const G = 1.0, N = 24
  const neg = computeBlockDelta(-2, G, N)
  const pos = computeBlockDelta(2, G, N)
  assert.ok(Math.abs(neg) > Math.abs(pos),
    `|delta(-2)| ${Math.abs(neg)} should be > |delta(+2)| ${Math.abs(pos)}`)
})

test('T2 — anchor: +1 pace × N sessions == targetDelta', () => {
  const G = 1.0, N = 24
  const sum = computeBlockDelta(1, G, N) * N
  assert.ok(Math.abs(sum - G) < EPS, `Sum ${sum} should equal G ${G}`)
})

test('T3 — anchor: +1 × N=30, G=2.0 → Σ == 2.0', () => {
  const sum = computeBlockDelta(1, 2.0, 30) * 30
  assert.ok(Math.abs(sum - 2.0) < EPS, `Sum ${sum} should equal 2.0`)
})

test('T4 — 2 sessions +1, N=24 → progress ~8.3%', () => {
  const pct = (computeBlockDelta(1, 1.0, 24) * 2) / 1.0
  assert.ok(pct > 0.07 && pct < 0.10, `Got ${(pct * 100).toFixed(1)}%`)
})

test('T5 — +2 pace reaches goal before N sessions', () => {
  const d2 = computeBlockDelta(2, 1.0, 24)
  const kReach = Math.ceil(1.0 / d2)
  assert.ok(kReach < 24 && kReach > 0, `kReach=${kReach}`)
})

test('T6 — 0 pace → delta is exactly 0', () => {
  assert.strictEqual(computeBlockDelta(0, 1.5, 24), 0)
  assert.strictEqual(computeBlockDelta(0, 0.0, 10), 0)
})

test('T7 — negative targetDelta with +1 pace', () => {
  assert.strictEqual(computeBlockDelta(1, 0, 24), 0)
  assert.ok(computeBlockDelta(1, -0.5, 10) < 0)
})

test('T8 — N=1: +1 × 1 session == G', () => {
  const G = 0.8
  assert.ok(Math.abs(computeBlockDelta(1, G, 1) - G) < EPS)
})

// ══════════════════════════════════════════════════════════════════════════════
// STAGE TESTS (T9–T14) — runEngine from lib/engine.ts (REAL import)
// Stage = full chain on RAW (rough): highest L where ALL L0..L raw >= 3.0.
// ══════════════════════════════════════════════════════════════════════════════

// T9: uniform 2.9 → L0 (ngưỡng: dưới at-age không đạt)
// WHY: STAGE_THRESHOLD=3.0 = "đúng tuổi". Mọi block=2.9 = "gần đúng tuổi nhưng
// chưa đạt" → stage phải L0. Upstream-First: nền chưa vững thì trần không tính.
// Vách cứng (2.9 rớt như 0.5) là CỐ Ý — graded là DMT, không vá ở v1.3.
test('T9 — uniform 2.9 → L0 (dưới at-age, ngưỡng 3.0)', () => {
  assert.strictEqual(runEngine(makeBlocks(2.9)).stage, 'L0')
})

// T10: uniform 3.0 → L7 (ngưỡng: at-age đạt)
// WHY: Mọi layer raw=3.0 ("đúng tuổi") → full chain pass → stage cao nhất.
test('T10 — uniform 3.0 → L7 (at-age, đạt ngưỡng 3.0)', () => {
  assert.strictEqual(runEngine(makeBlocks(3.0)).stage, 'L7')
})

// T11: L1 raw=1.8 rest=4 → L0 (full-chain: nền hổng chặn trần, KHÔNG nhảy gap)
// WHY: Trẻ giỏi L2-L7 nhưng L1 yếu. Upstream-First: nền hổng = trần không đếm.
// OLD engine cho L7 (nhảy gap). Full-chain: L0=4≥3✅ L1=1.8<3❌ → break → L0.
test('T11 — L1=1.8 rest=4 → L0 (nền hổng chặn trần)', () => {
  const blocks = makeBlocks(4)
  for (const k of Object.keys(BLOCK_WEIGHTS.L1)) blocks[k] = 1.8
  assert.strictEqual(runEngine(blocks).stage, 'L0')
})

// T12: double-count guard — chain trên raw, L2 không phạt nhai
// WHY: L1=1.8 gãy chain. L2 raw=4≥3 nhưng chain đã break tại L1 → L0.
// Lock cascade phạt L2 adj (total), nhưng stage đọc raw → không phạt lần hai.
test('T12 — L1=1.8 L2=4(raw) → L0 (double-count guard)', () => {
  const blocks = makeBlocks(4)
  for (const k of Object.keys(BLOCK_WEIGHTS.L1)) blocks[k] = 1.8
  assert.strictEqual(runEngine(blocks).stage, 'L0')
})

// T13: C5 (L4/L5=2.4, rest=2.6) → L0
// WHY: OLD engine stage=L7 (ngưỡng 2.5). NEW: L0 raw=2.6<3.0 → chain gãy → L0.
test('T13 — C5 profile (2.4–2.6) → L0 (ngưỡng 3.0 chặn)', () => {
  const blocks = makeBlocks(2.6)
  for (const k of Object.keys(BLOCK_WEIGHTS.L4)) blocks[k] = 2.4
  for (const k of Object.keys(BLOCK_WEIGHTS.L5)) blocks[k] = 2.4
  assert.strictEqual(runEngine(blocks).stage, 'L0')
})

// T14: C6 (uniform 2.5) → L0 (regression test: cũ L7, nay L0)
// WHY: Trẻ mọi block=2.5 ("dưới tuổi") → không được stage cao. OLD engine nhảy
// L7 vì ngưỡng 2.5≥2.5. NEW: 2.5<3.0 → L0.
test('T14 — C6 uniform 2.5 → L0 (cũ L7, nay HẾT nhảy)', () => {
  assert.strictEqual(runEngine(makeBlocks(2.5)).stage, 'L0')
})

// Sanity: STAGE_THRESHOLD and DEFICIT_THRESHOLD are what we expect
test('T15 — thresholds are correct constants', () => {
  assert.strictEqual(STAGE_THRESHOLD, 3.0)
  assert.strictEqual(DEFICIT_THRESHOLD, 2.5)
})

console.log('\n✅ Suite 15 complete.\n')
