// lib/scoring.ts — delta model v1.3
// Pure scoring logic. No React, no Supabase — importable in tests and edge.

// Pace multiplier per local-score rating.
// Invariant: |PACE[-2]| > |PACE[+2]| — regression penalised heavier than progress.
export const PACE: Record<string, number> = {
  '-2': -2.0,
  '-1': -1.0,
   '0':  0.0,
   '1':  1.0,
   '2':  1.5,
}

/**
 * computeBlockDelta(local, targetDelta, N)
 *
 * Returns the score delta for ONE session.
 *
 * @param local       LocalScore rating (-2 | -1 | 0 | 1 | 2)
 * @param targetDelta goal gap = targetScore - baselineScore
 * @param N           planned_sessions for this cycle (must be ≥1)
 *
 * Property:  Σ_{i=1}^{N} computeBlockDelta(+1, G, N) === G
 *            (exactly reaches goal in N sessions at pace +1)
 */
export function computeBlockDelta(local: number, targetDelta: number, N: number): number {
  return (targetDelta / Math.max(1, N)) * (PACE[String(local)] ?? 0)
}

export const SCORING_VERSION = '1.3'
