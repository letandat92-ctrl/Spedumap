// lib/dmt.ts — DMT shadow engine v0.4
//
// Tách hoàn toàn khỏi lib/scoring v1.3. CHỈ GHI BÓNG TỐI, không hiển thị UI,
// không chặn flow, không báo lỗi ra màn hình. Mọi write là fire-and-forget.
//
// Invariant: KHÔNG import từ lib/scoring hoặc lib/engine → tránh contamination
// vào v1.3 display path.

import { DMT_K } from './ontology'

// ── Logistic sigmoid ────────────────────────────────────────────────────────
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

// ── p_stage ─────────────────────────────────────────────────────────────────
// Xác suất trẻ đạt milestone stage dựa trên block scores hiện tại.
// p = Π σ(K × (s_b − θ_b)) over all blocks in footprint.
// footprint = { block_key: theta } — theta là ngưỡng tối thiểu của block.
export function pStage(
  scores: Record<string, number>,
  footprint: Record<string, number>,
  k = DMT_K,
): number {
  const entries = Object.entries(footprint)
  if (!entries.length) return 0
  return entries.reduce((prod, [block, theta]) => {
    return prod * sigmoid(k * ((scores[block] ?? 0) - theta))
  }, 1)
}

// ── expectedStage ───────────────────────────────────────────────────────────
// Stage cao nhất mà p_stage ≥ 0.5. Trả null nếu stage 1 cũng không đạt.
export function expectedStage(
  scores: Record<string, number>,
  footprints: Array<{ stage: number; footprint: Record<string, number> }>,
  k = DMT_K,
): number | null {
  let best: number | null = null
  for (const { stage, footprint } of footprints) {
    if (pStage(scores, footprint, k) >= 0.5) best = stage
  }
  return best
}

// ── gateForecast ─────────────────────────────────────────────────────────────
// Dự báo cyclePct tại mỗi session với pace +1 đồng đều cho mọi target block.
// Tái hiện v1.3 delta math độc lập (không import lib/scoring để tránh coupling).
// PACE[+1] = 1.0 — mỗi session tiến (target_delta / N) × 1.0.
//
// Returns: [{session, cyclepct}] cho sessions 1..N
export function gateForecast(
  baseline: Record<string, number>,   // điểm baseline của từng block
  target: Record<string, number>,     // điểm target của từng block
  N: number,                          // planned sessions
): Array<{ session: number; cyclepct: number }> {
  if (N <= 0) return []
  const blocks = Object.keys(target)
  if (!blocks.length) return []

  // delta_per_session[block] = (target - baseline) / N  (PACE +1 = 1.0 × delta/N)
  const dps: Record<string, number> = {}
  for (const k of blocks) {
    dps[k] = ((target[k] ?? 0) - (baseline[k] ?? 0)) / Math.max(1, N)
  }

  const baseTotal = blocks.reduce((s, k) => s + (baseline[k] ?? 0), 0)
  const tgtTotal  = blocks.reduce((s, k) => s + (target[k] ?? 0), 0)
  const totalDelta = tgtTotal - baseTotal
  if (totalDelta <= 0) return []

  const curve: Array<{ session: number; cyclepct: number }> = []
  for (let i = 1; i <= N; i++) {
    let current = 0
    for (const k of blocks) {
      const tgt  = target[k] ?? 0
      const base = baseline[k] ?? 0
      current += Math.min(tgt, base + dps[k] * i)  // clamp tại target per block
    }
    curve.push({
      session:  i,
      cyclepct: Math.max(0, Math.min(100, Math.round((current - baseTotal) / totalDelta * 100))),
    })
  }
  return curve
}

// ── cyclePctFromTotals ───────────────────────────────────────────────────────
// cyclePct dựa trên tổng block scores trong target set (consistent với gateForecast).
// Dùng để tính actual trong cycle_error.
export function cyclePctFromTotals(
  baseline: Record<string, number>,
  target: Record<string, number>,
  retest: Record<string, number>,
): number {
  const blocks = Object.keys(target)
  if (!blocks.length) return 0
  const baseTotal  = blocks.reduce((s, k) => s + (baseline[k] ?? 0), 0)
  const tgtTotal   = blocks.reduce((s, k) => s + (target[k] ?? 0), 0)
  const retestTotal = blocks.reduce((s, k) => s + (retest[k] ?? 0), 0)
  const delta = tgtTotal - baseTotal
  if (delta <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((retestTotal - baseTotal) / delta * 100)))
}
