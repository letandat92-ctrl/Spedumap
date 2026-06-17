// TEMPORARY — DELETE AFTER SEED. Achievement goes through assertAchievement guard.
import { NextResponse } from 'next/server'
import { recordBaselineMilestoneObs } from '@/app/therapist/actions/moat'

const M: Record<string, Record<number, string>> = {
  gross_motor:          {1:'a0ae60bb-156d-4b7b-9c78-83f178b8b947',2:'bbf418a4-ad31-421e-bd7e-01713a318aa2',3:'a7988dbb-ec1f-4345-b521-52f93071070e'},
  fine_motor:           {1:'f1e70ed0-593e-4fb3-af24-9c1819407b5b',2:'401e172a-c79c-44c4-b757-eb8971b7e581',3:'efc0408f-df88-47c4-9c89-a6507e22884d'},
  daily_living:         {1:'7f4545a9-4cc9-4fbf-a1a7-09474519519e',2:'3998f147-75db-412d-86b9-512ee05dca67'},
  cognition:            {1:'c90a4e8e-d5da-43b6-883a-caf1844ad0f4',2:'4c6832e8-b367-4ee0-b6de-22c429211f43',3:'548aeaa3-0e9c-4f21-9c6a-c1652a71e398'},
  interaction_duration: {2:'4e41f946-c27c-4da0-a9fd-cfef14f6529d',3:'5a9e4ad0-aa4f-45fd-b78b-474b98199f38'},
  language:             {1:'039b5715-8967-4301-a12c-4336acb4fd32',2:'262ee9a1-b22e-4733-b95e-1fcb316e085c'},
  eyecontact_nonverbal: {2:'4ae25c0d-04a1-459b-9687-d5aba4160825'},
}

const C: Record<string, {cid:string,kid:string,a:Array<{s:string,st:number,g:number}>}> = {
  C1:{cid:'46b1514b-fef2-430d-aa34-921b29c18ecf',kid:'eecd54fa-be79-4f2d-a529-951bbd37c53f',a:[
    {s:'gross_motor',st:1,g:50},{s:'fine_motor',st:1,g:25},{s:'cognition',st:1,g:25}]},
  C2:{cid:'93218901-339b-457a-9177-b43116895cde',kid:'06b92a9e-17fb-4582-b421-f2d6205de402',a:[
    {s:'gross_motor',st:3,g:75},{s:'fine_motor',st:3,g:75},{s:'daily_living',st:2,g:75},
    {s:'cognition',st:3,g:50},{s:'interaction_duration',st:3,g:75},{s:'language',st:2,g:75},
    {s:'eyecontact_nonverbal',st:2,g:50}]},
  C3:{cid:'d860ada9-fc96-4f22-b797-3d87b93e886f',kid:'0aa9c940-f6fb-41cb-abbf-4d52c4378d20',a:[
    {s:'gross_motor',st:2,g:50},{s:'cognition',st:1,g:25},{s:'language',st:1,g:25}]},
  C4:{cid:'d031fd35-d222-45c7-ba38-44e66c3f1aaa',kid:'69e39337-0a25-4409-abee-bb0749909d40',a:[
    {s:'gross_motor',st:3,g:75},{s:'fine_motor',st:2,g:50},{s:'daily_living',st:1,g:25},
    {s:'interaction_duration',st:2,g:50}]},
  C5:{cid:'6f7d74bb-19e6-4e48-a9ed-252363c3e76a',kid:'fd3a3cab-0968-45f8-b886-99aa27779c65',a:[
    {s:'gross_motor',st:2,g:25},{s:'cognition',st:2,g:25}]},
  C6:{cid:'28b22548-22e3-4702-b3e2-422475108cd4',kid:'1bb886b8-0152-40e2-8d3c-2b832e70c1c8',a:[
    {s:'gross_motor',st:2,g:50},{s:'fine_motor',st:2,g:50},{s:'daily_living',st:2,g:25},
    {s:'cognition',st:2,g:50},{s:'language',st:2,g:25}]},
}

export async function POST(request: Request) {
  try {
    const { caseKey } = await request.json() as { caseKey?: string }
    const cases = caseKey && C[caseKey] ? { [caseKey]: C[caseKey] } : C
    const results: Array<{case:string,rows:number}> = []
    for (const [k, c] of Object.entries(cases)) {
      const obs = c.a.map(x => ({
        milestone_id: M[x.s]?.[x.st] ?? '', skill_family: x.s,
        stage: x.st, achievement: x.g, support_level: null,
      })).filter(o => o.milestone_id)
      await recordBaselineMilestoneObs(c.cid, c.kid, obs)
      results.push({ case: k, rows: obs.length })
    }
    return NextResponse.json({ ok: true, results })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
