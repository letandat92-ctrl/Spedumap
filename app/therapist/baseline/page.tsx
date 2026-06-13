'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBaseline } from '@/hooks/useBaseline'
import { useRole } from '@/hooks/useRole'
import { can } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { getScore } from '@/lib/engine'
import { ONTOLOGY_VERSION, DEFAULT_SOURCE_TYPE, reliabilityTierFor } from '@/lib/ontology'
import { recordBaselineMilestoneObs } from '@/app/therapist/actions/moat'
import { LS_KEYS, type Directionality } from '@/types/spedumap'
import { LayerSection } from '@/components/blocks/LayerSection'
import { BaselineKPI } from '@/components/blocks/BaselineKPI'
import { BaselineCharts } from '@/components/charts/BaselineCharts'
import { SignalStrip } from '@/components/charts/CycleComponents'


export const dynamic = 'force-dynamic'


// Block metadata — mirrors BM in HTML file
const BM: Record<string, { label: string; blocks: Record<string, string> }> = {
  L0: { label:'L0 · Sức khỏe & Điều hòa sinh học', blocks:{ sleep:'Sleep',microbiome:'Microbiome',nutrition:'Nutrition',immune:'Immune',metabolic:'Metabolic' }},
  L1: { label:'L1 · Nền tảng hệ thần kinh', blocks:{ arousal:'Arousal',reflex_survival:'Reflex — Survival',reflex_postural:'Reflex — Postural',reflex_cortical:'Reflex — Cortical',tone:'Muscle Tone',ns_stability:'Neural Stability' }},
  L2: { label:'L2 · Hệ thống giác quan', blocks:{ vestibular:'Vestibular',proprioception:'Proprioception',auditory:'Auditory',visual:'Visual',tactile:'Tactile',taste:'Taste',smell:'Smell' }},
  L3: { label:'L3 · Vận động', blocks:{ motor_planning:'Motor Planning',gross_motor:'Gross Motor',fine_motor:'Fine Motor',postural_control:'Postural Control',bilateral_coord:'Bilateral Coord.' }},
  L4: { label:'L4 · Xử lý thông tin', blocks:{ attention:'Attention Focus',auditory_processing:'Auditory Processing',visual_processing:'Visual Processing',wm_link:'Working Memory Link' }},
  L5: { label:'L5 · Kỹ năng giao tiếp', blocks:{ oral_language:'Oral Language',word_finding:'Word Finding',phonemic_awareness:'Phonemic Awareness',auditory_memory:'Auditory Memory',visual_memory:'Visual Memory' }},
  L6: { label:'L6 · Quản lý cuộc sống', blocks:{ self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living' }},
  L7: { label:'L7 · Học thuật', blocks:{ math:'Math',writing:'Writing',reading:'Reading' }},
}

const LAYER_COLORS: Record<string, string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}

// Child directory picker shapes
interface PickerChild {
  id: string; name: string; dob: string | null; parent_id: string | null
  parent_email: string | null; parent_name: string | null; parent_phone: string | null
  parent_full_name: string | null
}
interface RawPickerChild {
  id: string; name: string; dob: string | null; parent_id: string | null
  parent_email: string | null; parent_name: string | null; parent_phone: string | null
  parent: { full_name: string | null } | null
}

export default function BaselinePage() {
  const router = useRouter()
  const {
    blocks, meta, engine, isLocked, isSaving, saveError,
    enteredCount, totalCount,
    setScore, setDir, setFlag, setNote, setMetaField,
    buildOutput, setIsLocked, setIsSaving, setSaveError,
    LAYER_IDS, B2L, BW, L2_BLOCKS,
  } = useBaseline()

  // Permission gate: only Senior Therapist+ may run assessment (lock baseline).
  // While the role is loading we keep the form locked (safe default).
  const { role, roleLoading } = useRole()
  const canAssess = !roleLoading && can(role, 'assessment')

  const [showLockModal, setShowLockModal] = useState(false)
  const [lockPassword, setLockPassword]   = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [attachments, setAttachments]     = useState<Array<{name:string;size:number;type:string}>>([])
  // ── Child directory picker ──
  const [childDirectory, setChildDirectory] = useState<PickerChild[]>([])
  const [childDropdownOpen, setChildDropdownOpen] = useState(false)
  const [childLocked, setChildLocked] = useState(false)  // true when pre-selected via retest seed

  // Parent lookup state (X1)
  const [parentLookupStatus, setParentLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')

  // 1d: Pyramid modal
  const [pyramidOpen, setPyramidOpen] = useState(false)

  // ── DMT: Milestone t0 anchor — stage-picker + graded stars (shadow) ──
  // observed_stage/skill = stage cao nhất mà MỌI star-milestone của stage đó đạt.
  // Star = gate bắt buộc qua stage. Ceiling-search dựa trên STAR, KHÔNG non-star.
  // Hiện battery 1 star/stage → 1 row/observed_stage. Khi battery có >1 milestone/stage:
  // chỉ cần star để xác định ranh; non-star không thuộc t0 ceiling-search.
  // Flow: chọn stage → grade star(s) tại stage đó (0–3, cùng thang daily session).
  // Đổi stage → reset grade skill đó. ∅ = not observed. Panel KHÔNG chặn lock.
  interface MilestoneRow { id: string; code: string | null; skill_family: string; stage: number }
  const [dmtMilestones, setDmtMilestones] = useState<MilestoneRow[]>([])
  const [dmtStages, setDmtStages] = useState<Record<string, number | null>>({})  // skill_family → stage | null
  const [dmtGrades, setDmtGrades] = useState<Record<string, number | null>>({})  // milestone_id → grade 0–3 | null
  const [dmtExpanded, setDmtExpanded] = useState(false)
  const GRADE_LABELS = ['0 Không', '1 Phần', '2 Nhiều', '3 Đầy đủ'] as const

  // Load active STAR milestones only (gate milestones that define stage boundary)
  useEffect(() => {
    const sb = createClient()
    sb.from('milestone')
      .select('id, code, skill_family, stage')
      .eq('is_active', true)
      .eq('star', true)
      .order('skill_family')
      .order('stage', { ascending: true })
      .then(({ data }) => { if (data) setDmtMilestones(data as MilestoneRow[]) })
  }, [])

  // Group milestones by skill_family (sorted by stage ascending)
  const dmtBySkill = dmtMilestones.reduce<Record<string, MilestoneRow[]>>((acc, m) => {
    (acc[m.skill_family] ??= []).push(m)
    return acc
  }, {})
  const dmtSkillFamilies = Object.keys(dmtBySkill).sort()
  const dmtObservedSkills = dmtSkillFamilies.filter(s => dmtStages[s] != null).length

  // Select stage for a skill — reset grades for stars of that skill
  function selectDmtStage(skill: string, stage: number | null) {
    setDmtStages(prev => ({ ...prev, [skill]: prev[skill] === stage ? null : stage }))
    // Reset grades for ALL stars of this skill (clean slate on stage change)
    const skillStars = dmtBySkill[skill] || []
    setDmtGrades(prev => {
      const next = { ...prev }
      for (const m of skillStars) delete next[m.id]
      return next
    })
  }

  // Stars at the selected stage for a skill
  function starsAtSelectedStage(skill: string): MilestoneRow[] {
    const stage = dmtStages[skill]
    if (stage == null) return []
    return (dmtBySkill[skill] || []).filter(m => m.stage === stage)
  }

  const supabase = createClient()

  // Load child directory for the picker (existing children + their parent info)
  useEffect(() => {
    supabase
      .from('children')
      .select('id, name, dob, parent_id, parent_email, parent_name, parent:parent_id(full_name)')
      .order('name')
      .then(({ data }) => {
        if (!data) return
        setChildDirectory((data as unknown as RawPickerChild[]).map(c => ({
          id: c.id, name: c.name, dob: c.dob,
          parent_id: c.parent_id,
          parent_email: c.parent_email,
          parent_name: c.parent_name,
          parent_phone: c.parent_phone,
          parent_full_name: c.parent?.full_name ?? null,
        })))
      })
  }, [supabase])

  // X1: Lookup parent on Enter — query user_profiles by email OR phone (1 field đủ)
  async function lookupParent() {
    const email = meta.parentEmail.trim()
    const phone = meta.parentPhone.trim()
    if (!email && !phone) return          // cả 2 rỗng mới bỏ qua
    setParentLookupStatus('loading')
    // Build OR filter — chỉ push field nào có giá trị
    const conditions: string[] = []
    if (email) conditions.push(`email.eq.${email}`)
    if (phone) conditions.push(`phone.eq.${phone}`)
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'parent')
      .eq('status', 'active')
      .or(conditions.join(','))
      .maybeSingle()                      // trả null (không lỗi) khi 0 rows
    if (data) {
      setMetaField('parentId', data.id)
      setMetaField('parentName', data.full_name ?? '')
      if (data.email) setMetaField('parentEmail', data.email)
      if (data.phone) setMetaField('parentPhone', data.phone)
      setParentLookupStatus('found')
    } else {
      setMetaField('parentId', null)
      setParentLookupStatus('not_found')
    }
  }

  // Pick a child from the directory → auto-fill identity + parent fields
  function selectChild(c: PickerChild) {
    setMetaField('childName', c.name)
    setMetaField('childDob', c.dob ?? '')
    setMetaField('parentEmail', c.parent_email ?? '')
    setMetaField('parentName', c.parent_name ?? c.parent_full_name ?? '')
    setMetaField('parentPhone', c.parent_phone ?? '')
    setMetaField('selectedChildId', c.id)
    // If child already linked to a parent user, pre-fill parentId (skip lookup wait)
    if (c.parent_id) {
      setMetaField('parentId', c.parent_id)
      setParentLookupStatus('found')
    }
    setChildDropdownOpen(false)
  }

  const childMatches = (!childLocked && meta.childName.trim())
    ? childDirectory.filter(c => c.name.toLowerCase().includes(meta.childName.trim().toLowerCase())).slice(0, 8)
    : []

  // Pre-seed from a closed cycle's retest ("Mở Cycle mới với Baseline này").
  // Pulls child name/dob + the 39 retest block scores into the new baseline,
  // then clears the seed so it only applies once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.RETEST_SEED)
      if (!raw) return
      const seed = JSON.parse(raw) as { child_id?: string; child?: { name?: string; dob?: string }; blocks?: Record<string, unknown> }
      if (seed?.child?.name) setMetaField('childName', seed.child.name)
      if (seed?.child?.dob)  setMetaField('childDob', seed.child.dob)
      // Carry the existing child id → reuse the same child record, lock the picker.
      if (seed?.child_id) {
        setMetaField('selectedChildId', seed.child_id)
        setChildLocked(true)
      }
      if (seed?.blocks) {
        for (const [k, v] of Object.entries(seed.blocks)) {
          setScore(k, getScore(v))
          const dir = (v as { directionality?: Directionality })?.directionality
          if (dir) setDir(k, dir)
        }
      }
      localStorage.removeItem(LS_KEYS.RETEST_SEED)
    } catch { /* ignore malformed seed */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))])
    e.target.value = ''
  }

  // Today's date for dob max constraint (1b)
  const todayISO = new Date().toISOString().split('T')[0]

  // 1b: dob must not be in the future
  const dobFuture = !!(meta.childDob && meta.childDob > todayISO)

  // Meta gate: required fields filled? (X3: parentId from lookup is mandatory)
  const metaComplete = !!(
    meta.childName && meta.childDob && !dobFuture && meta.evaluatorName &&
    meta.evalDate && meta.evalTimeStart && meta.evalTimeEnd &&
    meta.parentId
  )

  // All 39 blocks must have a score
  const allBlocksScored = Object.values(blocks).every(b => b.score !== null)

  // L2 blocks with score must have directionality set
  const dirErrors = L2_BLOCKS.filter(k =>
    blocks[k]?.score !== null && (!blocks[k]?.directionality || blocks[k]?.directionality === 'unknown')
  )

  // retest/assumed blocks must have notes
  const flagErrors = Object.entries(blocks).filter(([, b]) =>
    (b.flag === 'retest' || b.flag === 'assumed') && !b.note.trim()
  )

  const canLock = metaComplete && allBlocksScored && dirErrors.length === 0 && flagErrors.length === 0

  // Arrow key navigation across all block rows
  // Build ordered list of block keys
  const orderedBlockKeys = LAYER_IDS.flatMap(lid => Object.keys(BM[lid].blocks))
  function handleFocusRow(globalIndex: number, direction: 1 | -1) {
    const next = globalIndex + direction
    if (next < 0 || next >= orderedBlockKeys.length) return
    const el = document.querySelector(`[data-row-index="${next}"] input[type="text"]`) as HTMLInputElement
    el?.focus()
  }

  // Compute globalRowOffset per layer
  const layerOffsets: Record<string, number> = {}
  let offset = 0
  LAYER_IDS.forEach(lid => {
    layerOffsets[lid] = offset
    offset += Object.keys(BM[lid].blocks).length
  })

  async function handleLock() {
    setIsSaving(true)
    setSaveError(null)
    setPasswordError('')

    try {
      // Verify current user session còn valid (không cần nhập password lại)
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        setPasswordError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
        setIsSaving(false)
        return
      }
      const output = buildOutput()
      if (output) output.attachments = attachments

      // 1. Resolve child — reuse the picked directory child, else create new
      let resolvedChildId: string
      if (meta.selectedChildId) {
        // Existing child: don't create a duplicate; refresh parent contact (X2).
        resolvedChildId = meta.selectedChildId
        const { error: updErr } = await supabase
          .from('children')
          .update({
            parent_name:  output.child.parent_name || null,
            parent_id:    meta.parentId || null,
          })
          .eq('id', resolvedChildId)
        if (updErr) throw new Error('Lỗi cập nhật thông tin trẻ: ' + updErr.message)
      } else {
        const { data: child, error: childErr } = await supabase
          .from('children')
          .upsert({
            id:           undefined,
            name:         output.child.name,
            dob:          output.child.dob,
            parent_email: output.child.parent_email,
            parent_name:  output.child.parent_name,
            parent_id:    meta.parentId || null,  // X2: link to user_profiles row
          }, { onConflict: 'id' })
          .select('id')
          .single()
        if (childErr) throw new Error('Lỗi lưu thông tin trẻ: ' + childErr.message)
        resolvedChildId = child.id
      }

      // 2. Insert cycle
      const { data: cycle, error: cycleErr } = await supabase
        .from('cycles')
        .insert({
          child_id:   resolvedChildId,
          teacher_id: user.id ?? null,
          status:     'pending',
          baseline:   {
            blocks:           output.baseline_blocks,
            total_score:      output.engine_snapshot.total,
            stage:            output.engine_snapshot.stage,
            locked_at:        output.locked_at,
            source_type:      DEFAULT_SOURCE_TYPE,
            reliability_tier: reliabilityTierFor(DEFAULT_SOURCE_TYPE),
          },
          target:     { blocks: {} },
          started_at: output.eval_date,
          governance_meta: {
            knowledge_domain: output.knowledge_domain,
            protocol_version: `engine_v${ONTOLOGY_VERSION}`,
          },
        })
        .select('id')
        .single()

      if (cycleErr) throw new Error('Lỗi tạo cycle: ' + cycleErr.message)

      // 3. Save to localStorage
      const finalOutput = {
        ...output,
        child_id:           resolvedChildId,
        supabase_cycle_id:  cycle.id,
      }
      localStorage.setItem(LS_KEYS.BASELINE, JSON.stringify(finalOutput))

      // ── DMT SHADOW: baseline milestone t0 stage-picker + graded stars (fire-and-forget) ──
      // Per skill: send star(s) at the FINAL selected stage with their grade (0–3).
      // Stars at tried-then-changed stages are NOT sent (grade was reset).
      // ∅ skill (no stage) or ∅ grade (star not graded) → not sent.
      const milestonePayload: Array<{
        milestone_id: string; skill_family: string; stage: number;
        achievement: number; support_level: string | null;
      }> = []
      for (const skill of dmtSkillFamilies) {
        const stage = dmtStages[skill]
        if (stage == null) continue
        const stars = starsAtSelectedStage(skill)
        for (const star of stars) {
          const grade = dmtGrades[star.id]
          if (grade == null) continue  // ∅ = not graded = not sent
          milestonePayload.push({
            milestone_id: star.id,
            skill_family: skill,
            stage,
            achievement: grade,  // 0–3 ordinal, same encoding as daily session
            support_level: null,
          })
        }
      }
      if (milestonePayload.length) {
        recordBaselineMilestoneObs(cycle.id, resolvedChildId, milestonePayload)
          .catch(() => { /* shadow — silent */ })
      }
      // ── END DMT SHADOW ──

      setIsLocked(true)
      setShowLockModal(false)
      router.push('/therapist/goal')

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setIsSaving(false)
    }
  }

  const progressPct = totalCount > 0 ? Math.round((enteredCount / totalCount) * 100) : 0

  return (
    <div
      className="flex flex-col h-screen bg-[var(--warm-bg)] overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >

      {/* ── TOP APP-BAR HEADER ── */}
      <header className="flex-shrink-0 h-[52px] flex items-center justify-between px-5 bg-[var(--card)] border-b border-[var(--border)] z-30">
        <h1 className="text-[15px] font-bold tracking-[0.04em]" style={{ fontFamily: "'Oswald', sans-serif" }}>
          <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>SPEDUMAP</a>{' '}
          <span className="text-[var(--red)]">Baseline</span> Setting
        </h1>
        <div className="flex items-center gap-3">
          {/* Blocks progress track */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Blocks
            </span>
            <div className="w-[100px] h-[3px] bg-[var(--border)] rounded-sm overflow-hidden">
              <div
                className="h-full bg-[var(--red)] rounded-sm transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-[var(--red)] min-w-[34px]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {enteredCount}/{totalCount}
            </span>
          </div>
          {/* Pyramid diagram */}
          <button
            onClick={() => setPyramidOpen(true)}
            className="text-[11px] font-semibold tracking-[0.04em] rounded-[3px] px-3 py-[7px] border border-[var(--border)] bg-transparent text-[var(--sub)] hover:text-[var(--ink)] hover:border-[var(--navy)] transition-all"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Sơ đồ Pyramid
          </button>
          {/* Lock trigger */}
          <button
            onClick={() => setShowLockModal(true)}
            disabled={!canLock || isLocked || !canAssess}
            title={!canAssess && !roleLoading ? 'Yêu cầu Senior Therapist trở lên' : undefined}
            className={`text-[11px] font-semibold tracking-[0.06em] uppercase rounded-[3px] px-3.5 py-[7px] text-white transition-all ${
              isLocked
                ? 'bg-[var(--good)] cursor-default'
                : canLock && canAssess
                  ? 'bg-[var(--red)] hover:bg-[var(--red-dk)] cursor-pointer'
                  : 'bg-[var(--red)] opacity-35 cursor-not-allowed'
            }`}
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            {isLocked ? '✓ Đã khóa' : 'Khóa Baseline'}
          </button>
        </div>
      </header>

      {/* ── WORKBENCH: two panes ── */}
      <div className="flex flex-1 overflow-hidden">

      {/* ── LEFT: Input Panel ── */}
      <div className="w-[340px] flex-shrink-0 border-r border-[var(--border)] overflow-y-auto bg-[var(--card)]">
      {/* Permission gate: non-assessors (below Senior Therapist) get a fully
          read-only form — fieldset[disabled] disables every nested control. */}
      <fieldset disabled={!canAssess} className="contents">

        {!canAssess && !roleLoading && (
          <div className="m-3 px-3 py-2 rounded-md bg-[var(--gold-bg)] border border-[var(--gold-bd)] text-[11px] font-semibold text-[var(--gold)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Chỉ xem — Yêu cầu Senior Therapist trở lên để chấm & khóa baseline
          </div>
        )}

        <div className="p-4 border-b border-[var(--border)] space-y-3 bg-[#FAFAF8]">
          <h3 className="text-[9px] font-semibold text-[var(--sub)] uppercase tracking-[0.12em]" style={{ fontFamily: "'Oswald', sans-serif" }}>Thông tin chung</h3>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="block text-xs text-[var(--ink-3)] mb-1">
                Họ tên trẻ *
                {meta.selectedChildId && (
                  <span className="ml-1 text-[10px] text-[var(--green)]">· hồ sơ có sẵn</span>
                )}
              </label>
              <input
                value={meta.childName}
                readOnly={childLocked}
                onChange={e => {
                  // Free typing clears any picked child (backward compatible)
                  setMetaField('childName', e.target.value)
                  setMetaField('selectedChildId', null)
                  setChildDropdownOpen(true)
                }}
                onFocus={() => setChildDropdownOpen(true)}
                onBlur={() => setTimeout(() => setChildDropdownOpen(false), 150)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                placeholder="Gõ tên trẻ để tìm hồ sơ, hoặc nhập mới"
                autoComplete="off"
              />
              {childDropdownOpen && childMatches.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[var(--rule)] rounded-md shadow-lg max-h-56 overflow-y-auto">
                  {childMatches.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectChild(c) }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--rule-2)] border-b border-[var(--rule-2)] last:border-0"
                    >
                      <div className="text-xs font-medium text-[var(--ink)]">{c.name}</div>
                      <div className="text-[10px] text-[var(--ink-3)]">
                        {[c.dob, c.parent_name ?? c.parent_full_name, c.parent_email].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày sinh *</label>
              <input
                type="date"
                value={meta.childDob}
                max={todayISO}
                onChange={e => setMetaField('childDob', e.target.value)}
                className={`w-full h-8 px-2 text-sm border rounded focus:outline-none ${
                  dobFuture ? 'border-[var(--red)] focus:border-[var(--red)]' : 'border-[var(--rule)] focus:border-[var(--navy)]'
                }`}
              />
              {dobFuture && (
                <div className="mt-0.5 text-[10px] text-[var(--red)]">Ngày sinh không thể là tương lai</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Tên phụ huynh</label>
              <input
                readOnly
                value={meta.parentName}
                className={`w-full h-8 px-2 text-sm border rounded ${
                  meta.parentName ? 'bg-[#F5F9F5] border-[var(--green)] text-[var(--ink)]' : 'bg-[var(--warm-bg)] border-[var(--rule)] text-[var(--sub)]'
                }`}
                placeholder="Tự điền từ hồ sơ"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">SĐT phụ huynh</label>
              <input
                type="tel"
                value={meta.parentPhone}
                onChange={e => {
                  setMetaField('parentPhone', e.target.value)
                  setMetaField('parentId', null)
                  setMetaField('parentName', '')
                  setParentLookupStatus('idle')
                }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupParent() } }}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                placeholder="0909... rồi Enter"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Người đánh giá *</label>
              <input
                value={meta.evaluatorName}
                onChange={e => setMetaField('evaluatorName', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày đánh giá *</label>
              <input
                type="date"
                value={meta.evalDate}
                onChange={e => setMetaField('evalDate', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Giờ bắt đầu *</label>
              <input
                type="time"
                value={meta.evalTimeStart}
                onChange={e => setMetaField('evalTimeStart', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Giờ kết thúc *</label>
              <input
                type="time"
                value={meta.evalTimeEnd}
                onChange={e => setMetaField('evalTimeEnd', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--ink-3)] mb-1">
              Email phụ huynh <span className="text-[var(--red)]">*</span>
            </label>
            <input
              type="email"
              value={meta.parentEmail}
              onChange={e => {
                setMetaField('parentEmail', e.target.value)
                setMetaField('parentId', null)
                setMetaField('parentName', '')
                setParentLookupStatus('idle')
              }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupParent() } }}
              className={`w-full h-8 px-2 text-sm border rounded focus:outline-none ${
                parentLookupStatus === 'found'
                  ? 'border-[var(--green)] focus:border-[var(--green)]'
                  : parentLookupStatus === 'not_found' && (meta.parentEmail.trim() || meta.parentPhone.trim())
                    ? 'border-[var(--gold)] focus:border-[var(--gold)]'
                    : 'border-[var(--rule)] focus:border-[var(--navy)]'
              }`}
              placeholder="parent@email.com rồi Enter"
            />
            {parentLookupStatus === 'loading' && (
              <div className="mt-1 text-[11px] text-[var(--sub)]">Đang tìm hồ sơ…</div>
            )}
            {parentLookupStatus === 'found' && (
              <div className="mt-1 text-[11px] font-semibold text-[var(--green)]">✓ Đã liên kết</div>
            )}
            {parentLookupStatus === 'not_found' && (meta.parentEmail.trim() || meta.parentPhone.trim()) && (
              <div className="mt-1 text-[11px] text-[var(--gold)]">Phụ huynh chưa có hồ sơ — tạo ở Lễ tân/Admin trước</div>
            )}
          </div>

          {/* Clinical / Behavioral source toggle + badge */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-[#F5F1EB] border border-[var(--border)] rounded-md">
            <div className="flex-1 text-[11px] font-semibold text-[var(--ink)] leading-snug">
              Có kết quả lâm sàng / xét nghiệm cho L0
              <span className="block text-[10px] text-[var(--sub)] font-normal mt-px">
                Bật nếu có: xét nghiệm máu, vi sinh đường ruột, polysomnography... Ảnh hưởng đến rubric chấm điểm L0.
              </span>
            </div>
            {/* Source badge */}
            <span
              className={`text-[9px] font-bold px-[7px] py-0.5 rounded-[3px] flex-shrink-0 border ${
                meta.isClinic
                  ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-bd)]'
                  : 'bg-[#F5F1EB] text-[var(--gold)] border-[var(--gold-bd)]'
              }`}
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {meta.isClinic ? 'Clinical' : 'Behavioral'}
            </span>
            <div
              onClick={() => { if (canAssess) setMetaField('isClinic', !meta.isClinic) }}
              className={`w-[38px] h-5 rounded-full transition-colors flex-shrink-0 ${canAssess ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${meta.isClinic ? 'bg-[var(--green)]' : 'bg-[#CCC]'}`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-[3px] ${meta.isClinic ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
            </div>
          </div>

        </div>

        {/* X4: Block entry locked until metaComplete */}
        {!metaComplete && (
          <div className="mx-3 mt-2 mb-0 px-3 py-2 rounded-md bg-[var(--gold-bg)] border border-[var(--gold-bd)] text-[11px] font-semibold text-[var(--gold)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Điền đầy đủ thông tin phụ huynh (email/SĐT khớp hồ sơ) để mở nhập điểm
          </div>
        )}
        {/* Block sections */}
        <fieldset disabled={!metaComplete} className="contents">
        <div className="p-2">
          {LAYER_IDS.map(lid => (
            <LayerSection
              key={lid}
              layerId={lid}
              label={BM[lid].label}
              color={LAYER_COLORS[lid]}
              blocks={BM[lid].blocks}
              blockStates={blocks}
              blockWeights={BW[lid]}
              l2Blocks={L2_BLOCKS}
              globalRowOffset={layerOffsets[lid]}
              onScore={setScore}
              onDir={setDir}
              onFlag={setFlag}
              onNote={setNote}
              isClinic={meta.isClinic}
              onFocusRow={handleFocusRow}
              attachments={lid === 'L0' ? attachments : undefined}
              onAttach={handleFileAttach}
              onRemoveAttach={i => setAttachments(prev => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>
        </fieldset>{/* end X4 block gate */}

        {/* ── DMT: Milestone t0 — stage-picker + graded stars (shadow, không chặn lock) ── */}
        {dmtMilestones.length > 0 && (
          <div className="mx-2 mb-2">
            <button
              type="button"
              onClick={() => setDmtExpanded(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-dashed border-[var(--teal-bd)] bg-[var(--teal-bg)] hover:bg-[#D8EFF2] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-[var(--teal)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  Milestone t0
                </span>
                <span className="text-[10px] text-[var(--teal)]">
                  {dmtObservedSkills}/{dmtSkillFamilies.length} skill
                </span>
              </div>
              <span className="text-xs text-[var(--teal)]">{dmtExpanded ? '▲' : '▼'}</span>
            </button>

            {dmtExpanded && (
              <div className="mt-1 border border-dashed border-[var(--teal-bd)] rounded-md overflow-hidden">
                <div className="px-3 py-1.5 bg-[var(--teal)] text-white text-[9px] font-bold tracking-[0.08em] uppercase flex justify-between items-center" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  <span>Stage-Picker — Baseline Anchor</span>
                  <span className="text-[8px] font-normal opacity-70">shadow · chọn stage → grade star (0–3)</span>
                </div>
                {dmtSkillFamilies.map(skill => {
                  const milestones = dmtBySkill[skill]
                  const selectedStage = dmtStages[skill] ?? null
                  const stars = starsAtSelectedStage(skill)
                  return (
                    <div key={skill} className="border-b border-[var(--rule-2)] last:border-b-0 px-3 py-2">
                      {/* Row 1: skill name + stage picker */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-[var(--teal)] flex-shrink-0 w-[120px]">
                          {skill.replace(/_/g, ' ')}
                        </span>
                        <div className="flex gap-0 rounded overflow-hidden border border-[var(--rule)]">
                          <button
                            type="button"
                            onClick={() => selectDmtStage(skill, null)}
                            className="w-7 h-7 text-[10px] font-bold border-r border-[var(--rule)] transition-colors"
                            style={{
                              background: selectedStage === null ? 'var(--teal-bg)' : 'transparent',
                              color: selectedStage === null ? 'var(--teal)' : 'var(--ink-3)',
                            }}
                          >∅</button>
                          {milestones.map(m => {
                            const sel = selectedStage === m.stage
                            return (
                              <button
                                key={m.stage}
                                type="button"
                                onClick={() => selectDmtStage(skill, m.stage)}
                                className="w-7 h-7 text-[10px] font-bold border-r border-[var(--rule)] last:border-r-0 transition-colors"
                                style={{
                                  background: sel ? 'var(--teal)' : 'transparent',
                                  color: sel ? '#fff' : 'var(--ink-3)',
                                }}
                                title={m.code || `Stage ${m.stage}`}
                              >{m.stage}</button>
                            )
                          })}
                        </div>
                        {selectedStage !== null && (
                          <span className="text-[9px] font-bold text-[var(--teal)]">S{selectedStage}</span>
                        )}
                      </div>
                      {/* Row 2: star(s) at selected stage → grade 0–3 */}
                      {stars.map(star => {
                        const grade = dmtGrades[star.id] ?? null
                        return (
                          <div key={star.id} className="ml-[124px] flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[var(--ink-2)] w-[70px] flex-shrink-0 truncate" title={star.code || undefined}>
                              {star.code || `S${star.stage}`}
                            </span>
                            <div className="flex gap-0 rounded overflow-hidden border border-[var(--rule)]">
                              {[0, 1, 2, 3].map(v => {
                                const sel = grade === v
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setDmtGrades(prev => ({
                                      ...prev,
                                      [star.id]: prev[star.id] === v ? null : v,
                                    }))}
                                    className="w-[50px] h-6 text-[9px] font-semibold border-r border-[var(--rule)] last:border-r-0 transition-colors"
                                    style={{
                                      background: sel ? 'var(--teal)' : 'transparent',
                                      color: sel ? '#fff' : 'var(--ink-3)',
                                    }}
                                  >{GRADE_LABELS[v]}</button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {/* Hint when no stage selected */}
                      {selectedStage === null && (
                        <div className="ml-[124px] text-[9px] text-[var(--gold)] italic mt-0.5">chưa chọn stage</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Lock button + validation */}
        <div className="sticky bottom-0 p-4 bg-[var(--card)] border-t border-[var(--border)]">
          {!allBlocksScored && (
            <p className="text-xs text-[var(--sub)] text-center mb-1">
              Còn {Object.values(blocks).filter(b => b.score === null).length} blocks chưa nhập điểm
            </p>
          )}
          {dirErrors.length > 0 && (
            <p className="text-xs text-[var(--gold)] text-center mb-1">
              {dirErrors.length} block L2 chưa chọn Hyper/Hypo
            </p>
          )}
          {flagErrors.length > 0 && (
            <p className="text-xs text-[var(--red)] text-center mb-1">
              {flagErrors.length} block cần nhập lý do retest/assumed
            </p>
          )}
          {saveError && (
            <div className="mb-2 p-2 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded text-xs text-[var(--red)]">
              {saveError}
            </div>
          )}
          <button
            onClick={() => setShowLockModal(true)}
            disabled={!canLock || isLocked}
            className="w-full h-10 bg-[var(--red)] text-white rounded-lg text-sm font-bold hover:bg-[var(--red-dk)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            {isLocked ? '✓ Đã khóa Baseline' : 'Khóa Baseline →'}
          </button>
        </div>
      </fieldset>
      </div>

      {/* ── RIGHT: Result Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--warm-bg)]">

        {/* Summary strip — KPIs + dominant deficit + lock warning */}
        <div className="flex-shrink-0 px-3.5 py-2.5 bg-[var(--card)] border-b border-[var(--border)]">
          <BaselineKPI engine={engine} enteredCount={enteredCount} totalCount={totalCount} />
        </div>

        {/* Signal panel — 3 deficit signal cards */}
        <div className="flex-shrink-0 px-3.5 pt-2.5 pb-1 bg-[var(--card)] border-b border-[var(--border)]">
          <div
            className="text-[8px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)] mb-1.5"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Deficit Signals
          </div>
          <SignalStrip blocks={blocks as Record<string, unknown>} />
        </div>

        {/* Charts */}
        <div className="flex-1 px-3.5 py-2.5 overflow-hidden min-h-0">
          <BaselineCharts engine={engine} />
        </div>
      </div>

      </div>{/* end workbench */}

      {/* ── Lock Modal ── */}
      {showLockModal && (
        <div className="fixed inset-0 bg-[rgba(26,26,26,0.55)] flex items-center justify-center z-50" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="bg-white rounded-lg px-7 pt-7 pb-5 w-[90%] max-w-[420px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <div className="text-center text-[28px] mb-2.5">🔒</div>
            <h3 className="text-center text-[16px] font-bold tracking-[0.04em] text-[var(--red)] mb-2.5" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Xác nhận Khóa Baseline
            </h3>
            <p className="text-center text-xs text-[var(--sub-2)] leading-relaxed mb-4">
              Sau khi khóa, <strong className="text-[var(--ink)]">baseline không thể thay đổi</strong> trừ khi Quản trị viên mở lại.
              Điểm baseline sẽ được lưu vào Supabase trong cycle này.
            </p>
            <div className="text-center text-[10px] text-[var(--sub)] tracking-[0.04em] mb-1.5">
              Nhập mật khẩu của bạn để xác nhận
            </div>
            <input
              type="password"
              value={lockPassword}
              onChange={e => { setLockPassword(e.target.value); setPasswordError('') }}
              className="w-full h-9 px-3 bg-[var(--warm-bg)] border-[1.5px] border-[var(--border)] rounded text-center text-sm font-semibold tracking-[0.06em] mb-3.5 focus:outline-none focus:border-[var(--red)] focus:bg-white"
              style={{ fontFamily: "'Oswald', sans-serif" }}
              placeholder="••••••••"
              autoComplete="off"
            />
            {passwordError && <p className="text-xs text-[var(--red)] mb-2 text-center">{passwordError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 h-[34px] border-[1.5px] border-[var(--border)] rounded bg-[var(--warm-bg)] text-[11px] font-semibold tracking-[0.04em] text-[var(--sub-2)] hover:border-[#999] hover:text-[var(--ink)]"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleLock}
                disabled={isSaving}
                className="flex-1 h-[34px] bg-[var(--red)] text-white rounded text-[11px] font-bold tracking-[0.06em] hover:bg-[var(--red-dk)] disabled:opacity-40"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {isSaving ? 'Đang lưu...' : 'Khóa Baseline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1d: Pyramid diagram modal */}
      {pyramidOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPyramidOpen(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPyramidOpen(false)}
              className="absolute -top-8 right-0 text-white text-xl font-light hover:text-neutral-300"
            >✕</button>
            <img
              src="/pyramid.png"
              alt="SPEDUMAP Pyramid"
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
