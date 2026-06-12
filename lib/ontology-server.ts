// lib/ontology-server.ts — PROPRIETARY NEARMe mix logic.
// This module is server-only: importing it from a client component
// will THROW at build time (loud fail, no silent leak).

import 'server-only'
import { B2L, NEARME_DOMAINS, type NearmeDomain } from './ontology'

// ── NEARMe mix by layer (Sigma = 1 per layer) ───────────────────────────────
// How much each domain contributes to progress at a given pyramid layer.
export const NEARME_MIX_BY_LAYER: Record<string, Partial<Record<NearmeDomain, number>>> = {
  L0: { N: 0.50, Me: 0.50 },
  L1: { R: 0.90, Me: 0.10 },
  L2: { R: 0.90, Me: 0.10 },
  L3: { R: 0.55, Me: 0.40, A: 0.05 },
  L4: { Me: 0.45, E: 0.45, A: 0.10 },
  L5: { A: 0.45, E: 0.45, Me: 0.10 },
  L6: { A: 0.45, E: 0.45, Me: 0.10 },
  L7: { E: 0.85, A: 0.15 },
}

/**
 * nearmeMix — return the NEARMe domain mix for a block.
 *
 * Invariant: consumers ALWAYS call this function, NEVER read
 * NEARME_MIX_BY_LAYER directly. This preserves the upgrade path to (b).
 *
 * @param block  A block key (must exist in B2L).
 * @param score  Block score (0-4). Currently unused.
 *               // (b) future: interpolate mix by score-within-layer — proprietary, not yet active.
 * @returns      Record with all 5 domains, missing ones filled as 0. Sigma approx 1.
 * @throws       If block is not found in B2L.
 */
export function nearmeMix(block: string, score?: number): Record<NearmeDomain, number> {
  const layer = B2L[block]
  if (!layer) throw new Error(`nearmeMix: unknown block "${block}"`)

  // (a) Phase: flat layer-level mix, score ignored.
  void score

  const raw = NEARME_MIX_BY_LAYER[layer] ?? {}
  const out: Record<NearmeDomain, number> = { N: 0, E: 0, A: 0, R: 0, Me: 0 }
  let sum = 0
  for (const d of NEARME_DOMAINS) {
    out[d] = raw[d] ?? 0
    sum += out[d]
  }
  // Normalise (guard against floating-point drift)
  if (sum > 0) for (const d of NEARME_DOMAINS) out[d] /= sum
  return out
}
