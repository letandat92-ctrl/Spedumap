'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBaseline } from '@/hooks/useBaseline'
import { createClient } from '@/lib/supabase/client'
import { getScore } from '@/lib/engine'
import { LS_KEYS, type Directionality } from '@/types/spedumap'
import { LayerSection } from '@/components/blocks/LayerSection'
import { BaselineKPI } from '@/components/blocks/BaselineKPI'
import { BaselineCharts } from '@/components/charts/BaselineCharts'
import { SignalStrip } from '@/components/charts/CycleComponents'
import AssessmentForm from '@/components/forms/AssessmentForm'

export const dynamic = 'force-dynamic'


// Block metadata — mirrors BM in HTML file
const BM: Record<string, { label: string; blocks: Record<string, string> }> = {
  L0: { label:'L0 · Sức khỏe & Điều hòa sinh học', blocks:{ sleep:'Sleep',microbiome:'Microbiome',nutrition:'Nutrition',immune:'Immune',metabolic:'Metabolic' }},
  L1: { label:'L1 · Nền tảng hệ thần kinh', blocks:{ arousal:'Arousal',reflex_survival:'Reflex — Survival',reflex_postural:'Reflex — Postural',reflex_cortical:'Reflex — Cortical',tone:'Muscle Tone',ns_stability:'Neural Stability' }},
  L2: { label:'L2 · Hệ thống giác quan', blocks:{ vestibular:'Vestibular',proprioception:'Proprioception',auditory:'Auditory',visual:'Visual',tactile:'Tactile',interoception:'Interoception',taste_smell:'Taste/Smell' }},
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

export default function BaselinePage() {
  const router = useRouter()
  const {
    blocks, meta, engine, isLocked, isSaving, saveError,
    enteredCount, totalCount,
    setScore, setDir, setFlag, setNote, setMetaField,
    buildOutput, setIsLocked, setIsSaving, setSaveError,
    LAYER_IDS, B2L, BW, L2_BLOCKS,
  } = useBaseline()

  const [showLockModal, setShowLockModal] = useState(false)
  const [lockPassword, setLockPassword]   = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [attachments, setAttachments]     = useState<Array<{name:string;size:number;type:string}>>([])
  const [showAssessmentForm, setShowAssessmentForm] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const [therapistId, setTherapistId] = useState<string | null>(null)

  const supabase = createClient()

  // Get therapist ID from auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setTherapistId(user.id)
    })
  }, [supabase])

  // Pre-seed from a closed cycle's retest ("Mở Cycle mới với Baseline này").
  // Pulls child name/dob + the 39 retest block scores into the new baseline,
  // then clears the seed so it only applies once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.RETEST_SEED)
      if (!raw) return
      const seed = JSON.parse(raw) as { child?: { name?: string; dob?: string }; blocks?: Record<string, unknown> }
      if (seed?.child?.name) setMetaField('childName', seed.child.name)
      if (seed?.child?.dob)  setMetaField('childDob', seed.child.dob)
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

  // Meta gate: required fields filled?
  const metaComplete = !!(
    meta.childName && meta.childDob && meta.evaluatorName &&
    meta.evalDate && meta.evalTimeStart && meta.evalTimeEnd &&
    meta.parentEmail.trim()
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

      // 1. Upsert child
      const childId = undefined // TODO: load from existing if re-lock
      const { data: child, error: childErr } = await supabase
        .from('children')
        .upsert({
          id:           childId,
          name:         output.child.name,
          dob:          output.child.dob,
          parent_email: output.child.parent_email,
        }, { onConflict: 'id' })
        .select('id')
        .single()

      if (childErr) throw new Error('Lỗi lưu thông tin trẻ: ' + childErr.message)

      // 2. Insert cycle
      const { data: cycle, error: cycleErr } = await supabase
        .from('cycles')
        .insert({
          child_id:   child.id,
          status:     'pending',
          baseline:   {
            blocks:      output.baseline_blocks,
            total_score: output.engine_snapshot.total,
            stage:       output.engine_snapshot.stage,
            locked_at:   output.locked_at,
          },
          target:     { blocks: {} },
          started_at: output.eval_date,
          governance_meta: {
            knowledge_domain: output.knowledge_domain,
            protocol_version: 'engine_v3.2',
          },
        })
        .select('id')
        .single()

      if (cycleErr) throw new Error('Lỗi tạo cycle: ' + cycleErr.message)

      // 3. Save to localStorage
      const finalOutput = {
        ...output,
        child_id:           child.id,
        supabase_cycle_id:  cycle.id,
      }
      localStorage.setItem(LS_KEYS.BASELINE, JSON.stringify(finalOutput))

      setIsLocked(true)
      setChildId(child.id)
      setShowLockModal(false)
      setShowAssessmentForm(true)
      // Don't redirect immediately — let user fill assessment first

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
          SPEDUMAP <span className="text-[var(--red)]">Baseline</span> Setting
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
          {/* Lock trigger */}
          <button
            onClick={() => setShowLockModal(true)}
            disabled={!canLock || isLocked}
            className={`text-[11px] font-semibold tracking-[0.06em] uppercase rounded-[3px] px-3.5 py-[7px] text-white transition-all ${
              isLocked
                ? 'bg-[var(--good)] cursor-default'
                : canLock
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

        <div className="p-4 border-b border-[var(--border)] space-y-3 bg-[#FAFAF8]">
          <h3 className="text-[9px] font-semibold text-[var(--sub)] uppercase tracking-[0.12em]" style={{ fontFamily: "'Oswald', sans-serif" }}>Thông tin chung</h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Họ tên trẻ *</label>
              <input
                value={meta.childName}
                onChange={e => setMetaField('childName', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày sinh *</label>
              <input
                type="date"
                value={meta.childDob}
                onChange={e => setMetaField('childDob', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Tên phụ huynh</label>
              <input
                value={meta.parentName}
                onChange={e => setMetaField('parentName', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                placeholder="Nguyễn Thị B"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">SĐT phụ huynh</label>
              <input
                type="tel"
                value={meta.parentPhone}
                onChange={e => setMetaField('parentPhone', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
                placeholder="0909..."
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
              onChange={e => setMetaField('parentEmail', e.target.value)}
              className={`w-full h-8 px-2 text-sm border rounded focus:outline-none ${
                meta.parentEmail.trim()
                  ? 'border-[var(--rule)] focus:border-[var(--navy)]'
                  : 'border-[var(--red)] focus:border-[var(--red)]'
              }`}
              placeholder="parent@email.com"
            />
            {!meta.parentEmail.trim() && (
              <div className="mt-1 text-[11px] text-[var(--red)]">Email phụ huynh là bắt buộc</div>
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
              onClick={() => setMetaField('isClinic', !meta.isClinic)}
              className={`w-[38px] h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${meta.isClinic ? 'bg-[var(--green)]' : 'bg-[#CCC]'}`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-[3px] ${meta.isClinic ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
            </div>
          </div>

        </div>

        {/* Block sections */}
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

      {/* Assessment Form — After baseline locked */}
      {isLocked && showAssessmentForm && childId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-neutral-900">Assessment (Đánh giá chi tiết)</h2>
              <button
                onClick={() => {
                  setShowAssessmentForm(false)
                  // Redirect to goal setting after assessment
                  setTimeout(() => router.push('/therapist/goal'), 500)
                }}
                className="text-neutral-500 hover:text-neutral-700 text-2xl font-light"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {therapistId && childId ? (
                <AssessmentForm
                  childId={childId}
                  therapistId={therapistId}
                  supabaseClient={supabase}
                  onSuccess={() => {
                    // After assessment saved, redirect to goal
                    setTimeout(() => router.push('/therapist/goal'), 1000)
                  }}
                  onError={(err) => {
                    console.error('Assessment save failed:', err)
                  }}
                />
              ) : (
                <div className="text-center text-neutral-500 py-4">Loading...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
