'use server'

import { nearmeMix } from '@/lib/ontology-server'
import type { NearmeDomain } from '@/lib/ontology'

/**
 * Validate that for each selected domain, at least one target block
 * has nearmeMix(block)[domain] > 0.
 * Returns the list of invalid domains (empty = all OK).
 */
export async function validateSolutionDomains(
  targetBlocks: string[],
  domains: string[],
): Promise<string[]> {
  if (!targetBlocks.length || !domains.length) return []
  return domains.filter(d => {
    return !targetBlocks.some(b => {
      try { return (nearmeMix(b)[d as NearmeDomain] ?? 0) > 0 } catch { return false }
    })
  })
}
