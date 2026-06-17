// TEMPORARY TEST ROUTE — DELETE AFTER QA. DO NOT SHIP TO PRODUCTION.
// Wraps recordBaselineMilestoneObs to exercise the real server action write path.
// Auth: forwards user JWT from cookies (same as baseline lock flow).

import { NextResponse } from 'next/server'
import { recordBaselineMilestoneObs } from '@/app/therapist/actions/moat'

// Milestone IDs from DB (star=true, is_active=true)
const MILESTONES: Record<string, Record<number, string>> = {
  gross_motor:           { 1:'a0ae60bb-156d-4b7b-9c78-83f178b8b947', 2:'bbf418a4-ad31-421e-bd7e-01713a318aa2', 3:'a7988dbb-ec1f-4345-b521-52f93071070e' },
  fine_motor:            { 1:'f1e70ed0-593e-4fb3-af24-9c1819407b5b', 2:'401e172a-c79c-44c4-b757-eb8971b7e581', 3:'efc0408f-df88-47c4-9c89-a6507e22884d' },
  daily_living:          { 1:'7f4545a9-4cc9-4fbf-a1a7-09474519519e', 2:'3998f147-75db-412d-86b9-512ee05dca67' },
  cognition:             { 1:'c90a4e8e-d5da-43b6-883a-caf1844ad0f4', 2:'4c6832e8-b367-4ee0-b6de-22c429211f43', 3:'548aeaa3-0e9c-4f21-9c6a-c1652a71e398' },
  interaction_duration:  { 2:'4e41f946-c27c-4da0-a9fd-cfef14f6529d', 3:'5a9e4ad0-aa4f-45fd-b78b-474b98199f38' },
  language:              { 1:'039b5715-8967-4301-a12c-4336acb4fd32', 2:'262ee9a1-b22e-4733-b95e-1fcb316e085c' },
  eyecontact_nonverbal:  { 2:'4ae25c0d-04a1-459b-9687-d5aba4160825' },
  // flexibility: ∅ — deliberately left empty to test ∅ skill → no row
}

// Test matrix: each case seeds different skill/stage/grade combos
// Grade encoding: 0–3 ordinal (same as daily session)
// ∅ skill = not in map → no row
const CASES: Record<string, { cycleId: string; childId: string; anchors: Array<{ skill: string; stage: number; grade: number }> }> = {
  C1: {
    cycleId: '46b1514b-fef2-430d-aa34-921b29c18ecf',
    childId: 'eecd54fa-be79-4f2d-a529-951bbd37c53f',
    anchors: [
      { skill: 'gross_motor', stage: 1, grade: 2 },
      { skill: 'fine_motor', stage: 1, grade: 1 },
      { skill: 'cognition', stage: 1, grade: 0 },
      // daily_living ∅, interaction_duration ∅, language ∅, eyecontact ∅, flexibility ∅
    ],
  },
  C2: {
    cycleId: '93218901-339b-457a-9177-b43116895cde',
    childId: '06b92a9e-17fb-4582-b421-f2d6205de402',
    anchors: [
      { skill: 'gross_motor', stage: 3, grade: 3 },
      { skill: 'fine_motor', stage: 3, grade: 3 },
      { skill: 'daily_living', stage: 2, grade: 3 },
      { skill: 'cognition', stage: 3, grade: 2 },
      { skill: 'interaction_duration', stage: 3, grade: 3 },
      { skill: 'language', stage: 2, grade: 3 },
      { skill: 'eyecontact_nonverbal', stage: 2, grade: 2 },
      // flexibility ∅
    ],
  },
  C3: {
    cycleId: 'd860ada9-fc96-4f22-b797-3d87b93e886f',
    childId: '0aa9c940-f6fb-41cb-abbf-4d52c4378d20',
    anchors: [
      { skill: 'gross_motor', stage: 2, grade: 2 },
      { skill: 'cognition', stage: 1, grade: 1 },
      { skill: 'language', stage: 1, grade: 0 },
      // rest ∅
    ],
  },
  C4: {
    cycleId: 'd031fd35-d222-45c7-ba38-44e66c3f1aaa',
    childId: '69e39337-0a25-4409-abee-bb0749909d40',
    anchors: [
      { skill: 'gross_motor', stage: 3, grade: 3 },
      { skill: 'fine_motor', stage: 2, grade: 2 },
      { skill: 'daily_living', stage: 1, grade: 1 },
      { skill: 'interaction_duration', stage: 2, grade: 2 },
      // cognition ∅, language ∅, eyecontact ∅, flexibility ∅
    ],
  },
  C5: {
    cycleId: '6f7d74bb-19e6-4e48-a9ed-252363c3e76a',
    childId: 'fd3a3cab-0968-45f8-b886-99aa27779c65',
    anchors: [
      { skill: 'gross_motor', stage: 2, grade: 1 },
      { skill: 'cognition', stage: 2, grade: 1 },
      // rest ∅
    ],
  },
  C6: {
    cycleId: '28b22548-22e3-4702-b3e2-422475108cd4',
    childId: '1bb886b8-0152-40e2-8d3c-2b832e70c1c8',
    anchors: [
      { skill: 'gross_motor', stage: 2, grade: 2 },
      { skill: 'fine_motor', stage: 2, grade: 2 },
      { skill: 'daily_living', stage: 2, grade: 1 },
      { skill: 'cognition', stage: 2, grade: 2 },
      { skill: 'language', stage: 2, grade: 1 },
      // interaction ∅, eyecontact ∅, flexibility ∅
    ],
  },
}

export async function POST(request: Request) {
  try {
    const { caseKey } = await request.json() as { caseKey?: string }

    if (caseKey && CASES[caseKey]) {
      // Seed single case
      const c = CASES[caseKey]
      const obs = c.anchors.map(a => ({
        milestone_id: MILESTONES[a.skill]?.[a.stage] ?? '',
        skill_family: a.skill,
        stage: a.stage,
        achievement: a.grade,
        support_level: null,
      })).filter(o => o.milestone_id)

      await recordBaselineMilestoneObs(c.cycleId, c.childId, obs)
      return NextResponse.json({ ok: true, case: caseKey, rows: obs.length })
    }

    // Seed all cases
    const results: Array<{ case: string; rows: number }> = []
    for (const [key, c] of Object.entries(CASES)) {
      const obs = c.anchors.map(a => ({
        milestone_id: MILESTONES[a.skill]?.[a.stage] ?? '',
        skill_family: a.skill,
        stage: a.stage,
        achievement: a.grade,
        support_level: null,
      })).filter(o => o.milestone_id)

      await recordBaselineMilestoneObs(c.cycleId, c.childId, obs)
      results.push({ case: key, rows: obs.length })
    }

    return NextResponse.json({ ok: true, results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
