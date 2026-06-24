'use server'

// ── MOAT WRITES: server actions for DMT shadow tables ───────────────────────
// Integrity: client sends ONLY minimal IDs. Server reads authoritative data,
// builds payloads, and inserts via user-session Supabase client (RLS preserved).
//
// Invariant: shadow, fire-and-forget. Errors are logged server-side, never
// surfaced to UI, never block clinical flow. v1.3 display is untouched.
//
// Uses createClient from lib/supabase/server (anon key + user JWT cookies).
// DOES NOT use service-role key.

import { createClient } from '@/lib/supabase/server'
import { cyclePctFromTotals, expectedStage, gateForecast } from '@/lib/dmt'
import { DMT_K, B2L } from '@/lib/ontology'
import { runEngine, getScore } from '@/lib/engine'

const VERSION = 'dmt-v0.5'
const VALID_ACHIEVEMENT = new Set([25, 50, 75])

/** Validate achievement is 25/50/75. Throws if invalid — fail loud at write layer. */
function assertAchievement(value: number, context: string): void {
  if (!VALID_ACHIEVEMENT.has(value)) {
    throw new Error(`[DMT] invalid achievement ${value} in ${context} — must be 25, 50, or 75`)
  }
}

const BATTERY_SKILLS = [
  'gross_motor', 'fine_motor', 'daily_living', 'cognition',
  'interaction_duration', 'language', 'eyecontact_nonverbal', 'flexibility',
] as const

// ── helpers ──────────────────────────────────────────────────────────────────
function toNum(blocks: Record<string, unknown> = {}): Record<string, number> {
  return Object.fromEntries(
    Object.entries(blocks).map(([k, v]) => [k, getScore(v)])
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. recordCycleClose — cycle_error + transition_record
// ══════════════════════════════════════════════════════════════════════════════
export async function recordCycleClose(cycleId: string): Promise<void> {
  try {
    const supabase = await createClient()

    // ── Read authoritative data server-side ──
    const { data: cyc, error: cycErr } = await supabase
      .from('cycles')
      .select('id, child_id, status, baseline, target, retest_baseline, started_at, ended_at, retest_locked_at, governance_meta')
      .eq('id', cycleId)
      .single()
    if (cycErr || !cyc) { console.debug('[DMT] recordCycleClose: cycle not found', cycErr?.message); return }
    if (!cyc.retest_baseline?.blocks) { console.debug('[DMT] recordCycleClose: no retest data'); return }

    const { data: childRow } = await supabase
      .from('children').select('dob').eq('id', cyc.child_id).single()

    const { count: sessionCount } = await supabase
      .from('daily_sessions').select('id', { count: 'exact', head: true }).eq('cycle_id', cycleId)

    const baseNums = toNum(cyc.baseline?.blocks)
    const tgtNums  = toNum(cyc.target?.blocks)
    const reNums   = toNum(cyc.retest_baseline?.blocks ?? {})

    // ── cycle_error ──
    const actual = cyclePctFromTotals(baseNums, tgtNums, reNums)

    const { data: ledger } = await supabase
      .from('forecast_ledger')
      .select('cyclepct_forecast_curve')
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: false })
      .limit(1)
    const curve = (ledger?.[0] as { cyclepct_forecast_curve?: Array<{ session: number; cyclepct: number }> } | undefined)?.cyclepct_forecast_curve ?? []
    const forecastAtGoal = curve.length ? curve[curve.length - 1].cyclepct : null

    await supabase.from('cycle_error').upsert({
      child_id:         cyc.child_id,
      cycle_id:         cycleId,
      actual_retest:    { blocks: cyc.retest_baseline?.blocks, total: runEngine(reNums).total },
      forecast_at_goal: forecastAtGoal,
      error:            forecastAtGoal !== null ? actual - forecastAtGoal : null,
      version:          VERSION,
    }, { onConflict: 'cycle_id,version' }).then(({ error: e }) => { if (e) console.debug('[DMT] cycle_error:', e.message) })

    // ── transition_record ──
    const { data: milestones } = await supabase
      .from('milestone')
      .select('skill_family, stage, footprint')
      .in('skill_family', [...BATTERY_SKILLS])
      .eq('is_active', true)
      .order('stage', { ascending: true })
    if (!milestones?.length) { console.debug('[DMT] transition_record: no milestones, skip'); return }

    // Group by skill_family; extract {block:theta}
    const bySkill: Record<string, Array<{ stage: number; footprint: Record<string, number> }>> = {}
    for (const m of milestones as Array<{ skill_family: string; stage: number; footprint: Record<string, { theta: number }> }>) {
      if (!bySkill[m.skill_family]) bySkill[m.skill_family] = []
      const thetaMap: Record<string, number> = {}
      for (const [block, val] of Object.entries(m.footprint)) thetaMap[block] = val.theta
      bySkill[m.skill_family].push({ stage: m.stage, footprint: thetaMap })
    }

    // domains_applied: solution_outcomes -> solution_library.nearme_domain (best-effort)
    let domainsApplied: string[] | null = null
    try {
      const { data: soRows } = await supabase
        .from('solution_outcomes').select('solution_id').eq('cycle_id', cycleId)
      const ids = [...new Set((soRows ?? []).map((r: { solution_id: string }) => r.solution_id).filter(Boolean))]
      if (ids.length) {
        const { data: libs } = await supabase
          .from('solution_library').select('nearme_domain').in('id', ids)
        const domainSet = new Set<string>()
        for (const lib of libs ?? []) for (const d of ((lib as { nearme_domain?: string[] }).nearme_domain ?? [])) domainSet.add(d)
        domainsApplied = domainSet.size ? [...domainSet] : null
      }
    } catch { /* best-effort */ }

    // elapsed_days
    let elapsedDays: number | null = null
    if (cyc.ended_at && cyc.started_at) {
      elapsedDays = Math.round((new Date(cyc.ended_at).getTime() - new Date(cyc.started_at).getTime()) / 86400000)
    } else {
      const rl = cyc.retest_locked_at ?? (cyc.retest_baseline as { locked_at?: string } | null)?.locked_at
      const bl = (cyc.baseline as { locked_at?: string } | null)?.locked_at
      if (rl && bl) elapsedDays = Math.round((new Date(rl).getTime() - new Date(bl).getTime()) / 86400000)
    }

    // intensity proxy
    const plannedSessions = cyc.governance_meta?.planned_sessions ?? null
    const sc = sessionCount ?? 0
    const intensityProxy = (sc > 0 && elapsedDays && elapsedDays > 0)
      ? Math.round(sc / (elapsedDays / 7) * 100) / 100
      : null

    // age_months at cycle start
    let ageMonths: number | null = null
    if (childRow?.dob && cyc.started_at) {
      const b = new Date(childRow.dob), s = new Date(cyc.started_at)
      ageMonths = (s.getFullYear() - b.getFullYear()) * 12 + (s.getMonth() - b.getMonth())
      if (s.getDate() < b.getDate()) ageMonths--
      if (ageMonths < 0) ageMonths = 0
    }

    const reliabilityTier = (cyc.baseline as { reliability_tier?: string } | null)?.reliability_tier ?? null

    // Build rows: 1 per skill with observable stage_from
    const rows = []
    for (const skill of BATTERY_SKILLS) {
      const fps = bySkill[skill]
      if (!fps?.length) continue

      const stageFrom = expectedStage(baseNums, fps)
      if (stageFrom === null) continue  // no observable edge — skip

      const stageTo = expectedStage(reNums, fps)
      const outcome = stageTo === null ? 'stalled'
        : stageTo > stageFrom ? 'transitioned'
        : stageTo < stageFrom ? 'regressed'
        : 'stalled'

      rows.push({
        child_id:            cyc.child_id,
        cycle_id:            cycleId,
        skill_family:        skill,
        stage_from:          stageFrom,
        stage_to:            stageTo,
        config_before:       baseNums,   // FULL vector
        config_after:        Object.keys(reNums).length ? reNums : null,
        domains_applied:     domainsApplied,
        elapsed_days:        elapsedDays,
        outcome,
        suggestion_followed: false,
        covariates: {
          age_months:         ageMonths,
          intensity_proxy:    intensityProxy,
          intensity_is_proxy: true,
          planned_sessions:   plannedSessions,
          stage_source:       'gate_fallback',
        },
        reliability_tier:    reliabilityTier,
        version:             VERSION,
      })
    }

    if (rows.length) {
      const { error: txErr } = await supabase.from('transition_record').insert(rows)
      if (txErr) console.debug('[DMT] transition_record:', txErr.message)
      else console.debug(`[DMT] transition_record: ${rows.length} rows written`)
    }
  } catch (e) {
    console.debug('[DMT] recordCycleClose error:', e)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. recordGoalForecast — forecast_ledger + assessment_range
// ══════════════════════════════════════════════════════════════════════════════
export async function recordGoalForecast(
  cycleId: string,
  layerRange: [number, number],
  stageRange: [number, number],
): Promise<void> {
  try {
    const supabase = await createClient()

    // Read authoritative cycle data server-side
    const { data: cyc, error: cycErr } = await supabase
      .from('cycles')
      .select('child_id, baseline, target, governance_meta')
      .eq('id', cycleId)
      .single()
    if (cycErr || !cyc) { console.debug('[DMT] recordGoalForecast: cycle not found', cycErr?.message); return }

    const childId = cyc.child_id

    // assessment_range
    await supabase.from('assessment_range').upsert({
      child_id:    childId,
      cycle_id:    cycleId,
      layer_range: layerRange,
      stage_range: stageRange,
    }, { onConflict: 'cycle_id' }).then(({ error: e }) => { if (e) console.debug('[DMT] assessment_range:', e.message) })

    // forecast_ledger
    const baseNums: Record<string, number> = {}
    const tgtNums:  Record<string, number> = {}
    for (const [k, b] of Object.entries(cyc.baseline?.blocks ?? {})) baseNums[k] = getScore(b)
    for (const [k, b] of Object.entries(cyc.target?.blocks ?? {}))   tgtNums[k]  = getScore(b)
    const N = cyc.governance_meta?.planned_sessions || 24
    const curve = gateForecast(baseNums, tgtNums, N)

    await supabase.from('forecast_ledger').upsert({
      child_id:                childId,
      cycle_id:                cycleId,
      block_target:            cyc.target?.blocks ?? {},
      stage_forecast:          null,
      cyclepct_forecast_curve: curve,
      k_used:                  DMT_K,
      version:                 VERSION,
      baseline_snapshot:       baseNums,
      velocity_snapshot:       null,
    }, { onConflict: 'cycle_id,version' }).then(({ error: e }) => { if (e) console.debug('[DMT] forecast_ledger:', e.message) })
  } catch (e) {
    console.debug('[DMT] recordGoalForecast error:', e)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2b. readFrozenGoal — read baseline_snapshot + block_target from forecast_ledger
// ══════════════════════════════════════════════════════════════════════════════
export async function readFrozenGoal(
  cycleId: string,
): Promise<{ baseline_snapshot: Record<string, number>; block_target: Record<string, unknown> } | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('forecast_ledger')
      .select('baseline_snapshot, block_target')
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !data?.length) return null
    const row = data[0] as { baseline_snapshot: Record<string, number> | null; block_target: Record<string, unknown> | null }
    if (!row.baseline_snapshot) return null
    return { baseline_snapshot: row.baseline_snapshot, block_target: row.block_target ?? {} }
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. recordMilestoneObs — milestone_obs
// ══════════════════════════════════════════════════════════════════════════════
export async function recordMilestoneObs(
  sessionId: string,
  cycleId: string,
  observations: Array<{
    milestone_id: string
    achievement: number | null   // 25/50/75 percent. NULL when ∅ — not observed.
    support_level: string | null
    time_sec: number | null
  }>,
): Promise<void> {
  try {
    if (!observations.length) return

    const supabase = await createClient()

    // Validate session belongs to cycle (integrity check)
    const { data: sess, error: sessErr } = await supabase
      .from('daily_sessions')
      .select('id, cycle_id, child_id, source_type')
      .eq('id', sessionId)
      .eq('cycle_id', cycleId)
      .single()
    if (sessErr || !sess) { console.debug('[DMT] recordMilestoneObs: session not found or cycle mismatch'); return }

    // Validate achievement encoding at write layer — fail loud
    for (const o of observations) {
      if (o.achievement !== null && o.achievement !== undefined) {
        assertAchievement(o.achievement, `recordMilestoneObs session=${sessionId}`)
      }
    }

    const rows = observations
      .filter(o => o.achievement !== undefined || o.support_level || o.time_sec)
      .map(o => ({
        child_id:            sess.child_id,
        cycle_id:            cycleId,
        milestone_id:        o.milestone_id,
        achievement:         o.achievement,        // 25/50/75 or NULL
        support_level:       o.achievement === null ? null : o.support_level,
        time_to_achieve_sec: o.achievement === null ? null : o.time_sec,
        reliability_tier:    sess.source_type ?? 'in_person',
        source_type:         sess.source_type ?? 'in_person',
      }))

    if (rows.length) {
      await supabase.from('milestone_obs').insert(rows)
        .then(({ error: e }) => { if (e) console.debug('[DMT] milestone_obs:', e.message) })
    }
  } catch (e) {
    console.debug('[DMT] recordMilestoneObs error:', e)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. recordBaselineMilestoneObs — t0 anchor: observed_stage per skill
//    at baseline lock. source_type='baseline' distinguishes from daily session.
//    observed_stage/skill = stage cao nhất mà MỌI star-milestone đạt (gate).
//    Ceiling-search dựa trên STAR, KHÔNG non-star. Hiện battery 1 star/stage
//    → 1 row/skill. Khi >1 milestone/stage: milestone_obs ghi (các) star tại
//    stage-ranh; non-star không thuộc t0 ceiling-search.
//    assessment_range: stage_range = [observed, observed] (point = ceiling).
//    Shadow, fire-and-forget.
// ══════════════════════════════════════════════════════════════════════════════
export async function recordBaselineMilestoneObs(
  cycleId: string,
  childId: string,
  observations: Array<{
    milestone_id: string
    skill_family: string
    stage: number
    achievement: number       // 25/50/75 percent
    support_level: string | null
  }>,
): Promise<void> {
  try {
    if (!observations.length) return

    // Validate achievement encoding at write layer — fail loud
    for (const o of observations) {
      assertAchievement(o.achievement, `recordBaselineMilestoneObs cycle=${cycleId}`)
    }

    const supabase = await createClient()

    // Validate cycle exists and belongs to this child (integrity)
    const { data: cyc, error: cycErr } = await supabase
      .from('cycles')
      .select('id, child_id, baseline')
      .eq('id', cycleId)
      .eq('child_id', childId)
      .single()
    if (cycErr || !cyc) { console.debug('[DMT] recordBaselineMilestoneObs: cycle not found or child mismatch'); return }

    const reliabilityTier = (cyc.baseline as { reliability_tier?: string } | null)?.reliability_tier ?? 'in_person'

    // ── milestone_obs: ONE row per skill at observed_stage ──
    const rows = observations.map(o => ({
      child_id:            childId,
      cycle_id:            cycleId,
      milestone_id:        o.milestone_id,
      achievement:         o.achievement,       // 25/50/75 percent
      support_level:       o.support_level || null,
      time_to_achieve_sec: null,
      reliability_tier:    reliabilityTier,
      source_type:         'baseline',
    }))
    const { error: obsErr } = await supabase.from('milestone_obs').insert(rows)
    if (obsErr) throw new Error(`[DMT] baseline milestone_obs: ${obsErr.message}`)

    // ── assessment_range per skill: point = [stage, stage] ──
    const rangeRows = observations.map(o => ({
      child_id:    childId,
      cycle_id:    cycleId,
      layer_range: [0, 7],  // baseline covers all layers
      stage_range: [o.stage, o.stage],  // point — single observed_stage
    }))

    if (rangeRows.length) {
      const { error: rangeErr } = await supabase.from('assessment_range').insert(rangeRows)
      if (rangeErr) throw new Error(`[DMT] baseline assessment_range: ${rangeErr.message}`)
    }

    console.debug(`[DMT] baseline t0: ${rows.length} milestone_obs + ${rangeRows.length} assessment_range (observed_stage)`)
  } catch (e) {
    console.debug('[DMT] recordBaselineMilestoneObs error:', e)
  }
}
