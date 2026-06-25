'use server'

import { createClient } from '@/lib/supabase/server'
import { runEngine, getScore } from '@/lib/engine'
import { expectedStage } from '@/lib/dmt'
import { B2L, LAYER_IDS } from '@/lib/ontology'
import { analyze } from '@/lib/analyze'

const BATTERY_SKILLS = [
  'gross_motor', 'fine_motor', 'daily_living', 'cognition',
  'interaction_duration', 'language', 'eyecontact_nonverbal', 'flexibility',
] as const

const LAYER_VN: Record<string, string> = {
  L0: 'Sinh học', L1: 'Thần kinh', L2: 'Giác quan', L3: 'Vận động',
  L4: 'Xử lý', L5: 'Giao tiếp', L6: 'QL Cuộc sống', L7: 'Học thuật',
}

const BN: Record<string, string> = {
  sleep:'Giấc ngủ',microbiome:'Hệ vi sinh',nutrition:'Dinh dưỡng',immune:'Miễn dịch',metabolic:'Chuyển hoá',
  arousal:'Kích thích',reflex_survival:'PX Sinh tồn',reflex_postural:'PX Tư thế',
  reflex_cortical:'PX Vỏ não',tone:'Trương lực cơ',ns_stability:'Ổn định TK',
  vestibular:'Tiền đình',proprioception:'Bản thể',auditory:'Thính giác',visual:'Thị giác',
  tactile:'Xúc giác',taste:'Vị giác',smell:'Khứu giác',
  motor_planning:'Lập kế hoạch VĐ',gross_motor:'Vận động thô',fine_motor:'Vận động tinh',
  postural_control:'Kiểm soát tư thế',bilateral_coord:'Phối hợp 2 bên',
  attention:'Chú ý',auditory_processing:'Xử lý thính giác',
  visual_processing:'Xử lý thị giác',wm_link:'Bộ nhớ làm việc',
  oral_language:'Ngôn ngữ nói',word_finding:'Tìm từ',
  phonemic_awareness:'Nhận thức âm vị',auditory_memory:'Trí nhớ thính giác',visual_memory:'Trí nhớ thị giác',
  self_control:'Tự kiểm soát',behavior:'Hành vi',social_skills:'Kỹ năng xã hội',daily_living:'Sinh hoạt hàng ngày',
  math:'Toán',writing:'Viết',reading:'Đọc',
}

function toNum(blocks: Record<string, unknown> = {}): Record<string, number> {
  return Object.fromEntries(
    Object.entries(blocks).map(([k, v]) => [k, getScore(v)])
  )
}

function ageFromDob(dob: string): string {
  if (!dob) return ''
  const d = new Date(dob)
  const now = new Date()
  let y = now.getFullYear() - d.getFullYear()
  let m = now.getMonth() - d.getMonth()
  if (m < 0) { y--; m += 12 }
  return `${y} tuổi ${m} tháng`
}

export interface PdfData {
  childName: string
  childAge: string
  cycleName: string
  evalDate: string
  expiresAt: string | null
  baselineResult: { total: number; stage: string; layerScores: Record<string, number> }
  targetResult: { total: number; stage: string; layerScores: Record<string, number> }
  layerTable: Array<{ id: string; label: string; baselineScore: number; targetScore: number }>
  recommendations: Array<{ blockKey: string; blockLabel: string; solutionTitle: string | null }>
  notes: Array<{ blockLabel: string; note: string }>
  milestones: Array<{ skillFamily: string; stage: number; description: string }>
}

export async function getCyclePdfData(cycleId: string): Promise<PdfData> {
  const supabase = await createClient()

  // 1. Cycle + child
  const { data: cyc, error: cycErr } = await supabase
    .from('cycles')
    .select('id, child_id, cycle_name, started_at, expires_at, baseline, target, status')
    .eq('id', cycleId)
    .single()
  if (cycErr || !cyc) throw new Error('Cycle not found')

  const { data: child } = await supabase
    .from('children')
    .select('name, dob')
    .eq('id', cyc.child_id)
    .single()
  if (!child) throw new Error('Child not found')

  // 2. Baseline + target engine results
  const baselineBlocks = (cyc.baseline as { blocks?: Record<string, unknown> })?.blocks ?? {}
  const targetBlocks = (cyc.target as { blocks?: Record<string, unknown> })?.blocks ?? {}
  const baselineNums = toNum(baselineBlocks)
  const targetNums = toNum(targetBlocks)
  const baselineResult = runEngine(baselineNums)
  const targetResult = runEngine(targetNums)

  // 3. Layer table
  const layerTable = LAYER_IDS.map(lid => ({
    id: lid,
    label: `${lid} · ${LAYER_VN[lid] ?? lid}`,
    baselineScore: Math.round((baselineResult.layerScores[lid] ?? 0) * 100) / 100,
    targetScore: Math.round((targetResult.layerScores[lid] ?? 0) * 100) / 100,
  }))

  // 4. Recommendations + solution (1 per block)
  const recs = analyze(baselineBlocks, getScore)
  const recBlocks = recs.map(r => r.key)

  let solutions: Record<string, string> = {}
  if (recBlocks.length) {
    const { data: libs } = await supabase
      .from('solution_library')
      .select('title, target_blocks, category')
      .eq('is_active', true)
    if (libs) {
      for (const bk of recBlocks) {
        const layer = B2L[bk]
        const match = (libs as Array<{ title: string; target_blocks: string[] | null; category: string | null }>)
          .find(s => (s.target_blocks ?? []).includes(bk) || s.category === layer)
        if (match) solutions[bk] = match.title
      }
    }
  }

  const recommendations = recs.map(r => ({
    blockKey: r.key,
    blockLabel: BN[r.key] ?? r.key,
    solutionTitle: solutions[r.key] ?? null,
  }))

  // 5. Clinical notes
  const { data: noteRows } = await supabase
    .from('assessment_block_notes')
    .select('block, note')
    .eq('cycle_id', cycleId)
  const notes = (noteRows ?? []).map((r: { block: string; note: string }) => ({
    blockLabel: BN[r.block] ?? r.block,
    note: r.note,
  }))

  // 6. Milestone expected stages
  const { data: msRows } = await supabase
    .from('milestone')
    .select('skill_family, stage, footprint, description')
    .in('skill_family', [...BATTERY_SKILLS])
    .eq('is_active', true)
    .order('stage', { ascending: true })

  const milestones: PdfData['milestones'] = []
  if (msRows?.length) {
    const bySkill: Record<string, Array<{ stage: number; footprint: Record<string, number>; description: string }>> = {}
    for (const m of msRows as Array<{ skill_family: string; stage: number; footprint: Record<string, { theta: number }>; description: string | null }>) {
      if (!bySkill[m.skill_family]) bySkill[m.skill_family] = []
      const thetaMap: Record<string, number> = {}
      for (const [block, val] of Object.entries(m.footprint ?? {})) thetaMap[block] = val.theta
      bySkill[m.skill_family].push({ stage: m.stage, footprint: thetaMap, description: m.description ?? '' })
    }

    for (const [skill, fps] of Object.entries(bySkill)) {
      const footprints = fps.map(f => ({ stage: f.stage, footprint: f.footprint }))
      const es = expectedStage(targetNums, footprints)
      if (es !== null) {
        const matched = fps.find(f => f.stage === es)
        milestones.push({
          skillFamily: skill,
          stage: es,
          description: matched?.description ?? `Giai đoạn ${es}`,
        })
      }
    }
  }

  return {
    childName: child.name ?? '',
    childAge: ageFromDob(child.dob ?? ''),
    cycleName: cyc.cycle_name ?? '',
    evalDate: cyc.started_at ?? '',
    expiresAt: (cyc.expires_at as string) ?? null,
    baselineResult: {
      total: Math.round(baselineResult.total * 10) / 10,
      stage: baselineResult.stage,
      layerScores: baselineResult.layerScores,
    },
    targetResult: {
      total: Math.round(targetResult.total * 10) / 10,
      stage: targetResult.stage,
      layerScores: targetResult.layerScores,
    },
    layerTable,
    recommendations,
    notes,
    milestones,
  }
}
