// lib/supabase/migrations.ts
// Query functions for assessments, hypotheses, layer_progression, activity_outcomes, parent_engagement, parent_observations

import { SupabaseClient } from '@supabase/supabase-js'
import {
  Assessment, CycleHypothesis, LayerProgression, ActivityOutcome,
  ParentEngagement, ParentEngagementSummary, ParentObservation
} from '@/types/spedumap'

// ============ ASSESSMENTS ============

export async function createAssessment(
  client: SupabaseClient,
  childId: string,
  therapistId: string,
  assessmentDate: string,
  identifiedBlocks: Array<{name: string; severity: number; location?: string}>,
  assignedLayer: number,
  confidenceScore: number,
  source: 'workshop' | 'observation' | 'parent_report' | 'standardized_tool',
  notes?: string
): Promise<Assessment> {
  const { data, error } = await client
    .from('assessments')
    .insert({
      child_id: childId,
      therapist_id: therapistId,
      assessment_date: assessmentDate,
      identified_blocks: identifiedBlocks,
      assigned_layer: assignedLayer,
      confidence_score: confidenceScore,
      source,
      notes,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create assessment: ${error.message}`)
  return data as Assessment
}

export async function getAssessmentsByChild(
  client: SupabaseClient,
  childId: string
): Promise<Assessment[]> {
  const { data, error } = await client
    .from('assessments')
    .select('*')
    .eq('child_id', childId)
    .order('assessment_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch assessments: ${error.message}`)
  return (data || []) as Assessment[]
}

export async function getLatestAssessment(
  client: SupabaseClient,
  childId: string
): Promise<Assessment | null> {
  const { data, error } = await client
    .from('assessments')
    .select('*')
    .eq('child_id', childId)
    .order('assessment_date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return (data as Assessment) || null
}

// ============ CYCLE HYPOTHESES ============

export async function createCycleHypothesis(
  client: SupabaseClient,
  cycleId: string,
  hypothesisStatement: string,
  rootCauseAssumption?: string,
  interventionStrategy?: string,
  successCriterion?: string
): Promise<CycleHypothesis> {
  const { data, error } = await client
    .from('cycle_hypotheses')
    .insert({
      cycle_id: cycleId,
      hypothesis_statement: hypothesisStatement,
      root_cause_assumption: rootCauseAssumption,
      intervention_strategy: interventionStrategy,
      success_criterion: successCriterion,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create hypothesis: ${error.message}`)
  return data as CycleHypothesis
}

export async function getHypothesisByCycle(
  client: SupabaseClient,
  cycleId: string
): Promise<CycleHypothesis | null> {
  const { data, error } = await client
    .from('cycle_hypotheses')
    .select('*')
    .eq('cycle_id', cycleId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as CycleHypothesis) || null
}

// ============ LAYER PROGRESSION ============

export async function createLayerProgression(
  client: SupabaseClient,
  childId: string,
  cycleId: string,
  layerFrom: number,
  layerTo: number,
  transitionDate: string,
  evidenceTrigger: string,
  assessmentIdFrom?: string,
  assessmentIdTo?: string
): Promise<LayerProgression> {
  const { data, error } = await client
    .from('layer_progression')
    .insert({
      child_id: childId,
      cycle_id: cycleId,
      assessment_id_from: assessmentIdFrom,
      assessment_id_to: assessmentIdTo,
      layer_from: layerFrom,
      layer_to: layerTo,
      transition_date: transitionDate,
      evidence_trigger: evidenceTrigger,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create layer progression: ${error.message}`)
  return data as LayerProgression
}

export async function getLayerProgressionByCycle(
  client: SupabaseClient,
  cycleId: string
): Promise<LayerProgression[]> {
  const { data, error } = await client
    .from('layer_progression')
    .select('*')
    .eq('cycle_id', cycleId)
    .order('transition_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch layer progression: ${error.message}`)
  return (data || []) as LayerProgression[]
}

export async function getChildLayerHistory(
  client: SupabaseClient,
  childId: string
): Promise<LayerProgression[]> {
  const { data, error } = await client
    .from('layer_progression')
    .select('*')
    .eq('child_id', childId)
    .order('transition_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch layer history: ${error.message}`)
  return (data || []) as LayerProgression[]
}

// ============ ACTIVITY OUTCOMES ============

export async function createActivityOutcome(
  client: SupabaseClient,
  sessionId: string,
  activityName: string,
  activityIndex: number,
  outcomeIndicator: 'block_move' | 'duration_change' | 'frequency_change' | 'skill_emergence',
  blockName?: string,
  outcomeValue?: number,
  notes?: string
): Promise<ActivityOutcome> {
  const { data, error } = await client
    .from('activity_outcomes')
    .insert({
      session_id: sessionId,
      activity_name: activityName,
      activity_index: activityIndex,
      outcome_indicator: outcomeIndicator,
      block_name: blockName,
      outcome_value: outcomeValue,
      notes,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create activity outcome: ${error.message}`)
  return data as ActivityOutcome
}

export async function getActivityOutcomesBySession(
  client: SupabaseClient,
  sessionId: string
): Promise<ActivityOutcome[]> {
  const { data, error } = await client
    .from('activity_outcomes')
    .select('*')
    .eq('session_id', sessionId)
    .order('activity_index', { ascending: true })

  if (error) throw new Error(`Failed to fetch activity outcomes: ${error.message}`)
  return (data || []) as ActivityOutcome[]
}

// ============ PARENT ENGAGEMENT ============

export async function createParentEngagement(
  client: SupabaseClient,
  childId: string,
  homeworkAssignedDate: string,
  homeworkDescription: string
): Promise<ParentEngagement> {
  const { data, error } = await client
    .from('parent_engagement')
    .insert({
      child_id: childId,
      homework_assigned_date: homeworkAssignedDate,
      homework_description: homeworkDescription,
      homework_completed: false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create parent engagement: ${error.message}`)
  return data as ParentEngagement
}

export async function updateParentEngagementCompletion(
  client: SupabaseClient,
  engagementId: string,
  completionDate: string,
  qualityScore?: number,
  therapistNotes?: string
): Promise<ParentEngagement> {
  const { data, error } = await client
    .from('parent_engagement')
    .update({
      homework_completed: true,
      completion_date: completionDate,
      quality_score: qualityScore,
      therapist_notes: therapistNotes,
    })
    .eq('id', engagementId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update engagement: ${error.message}`)
  return data as ParentEngagement
}

export async function getParentEngagementByChild(
  client: SupabaseClient,
  childId: string
): Promise<ParentEngagement[]> {
  const { data, error } = await client
    .from('parent_engagement')
    .select('*')
    .eq('child_id', childId)
    .order('homework_assigned_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch parent engagement: ${error.message}`)
  return (data || []) as ParentEngagement[]
}

export async function getParentEngagementSummary(
  client: SupabaseClient,
  childId: string
): Promise<ParentEngagementSummary> {
  const engagements = await getParentEngagementByChild(client, childId)

  const completedCount = engagements.filter(e => e.homework_completed).length
  const qualityScores = engagements
    .filter(e => e.quality_score !== null && e.quality_score !== undefined)
    .map(e => e.quality_score!)

  return {
    child_id: childId,
    total_homework_assigned: engagements.length,
    completed_count: completedCount,
    completion_rate: engagements.length > 0 ? completedCount / engagements.length : 0,
    avg_quality_score: qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0,
    pending_homework: engagements.filter(e => !e.homework_completed),
  }
}

// ============ PARENT OBSERVATIONS ============

export async function createParentObservation(
  client: SupabaseClient,
  childId: string,
  observationDate: string,
  blockObserved: string,
  observationContext?: string,
  severity?: number,
  childState?: string,
  parentNotes?: string
): Promise<ParentObservation> {
  const { data, error } = await client
    .from('parent_observations')
    .insert({
      child_id: childId,
      observation_date: observationDate,
      block_observed: blockObserved,
      observation_context: observationContext,
      severity,
      child_state: childState,
      parent_notes: parentNotes,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create parent observation: ${error.message}`)
  return data as ParentObservation
}

export async function getParentObservationsByChild(
  client: SupabaseClient,
  childId: string
): Promise<ParentObservation[]> {
  const { data, error } = await client
    .from('parent_observations')
    .select('*')
    .eq('child_id', childId)
    .order('observation_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch parent observations: ${error.message}`)
  return (data || []) as ParentObservation[]
}

export async function getParentObservationsByBlock(
  client: SupabaseClient,
  childId: string,
  blockName: string
): Promise<ParentObservation[]> {
  const { data, error } = await client
    .from('parent_observations')
    .select('*')
    .eq('child_id', childId)
    .eq('block_observed', blockName)
    .order('observation_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch block observations: ${error.message}`)
  return (data || []) as ParentObservation[]
}
