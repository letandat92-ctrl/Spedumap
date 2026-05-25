'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBaseline } from '@/hooks/useBaseline'
import { createClient } from '@/lib/supabase/client'
import { LS_KEYS } from '@/types/spedumap'
import { BlockRow } from '@/components/blocks/BlockRow'
import { LayerSection } from '@/components/blocks/LayerSection'
import { BaselineKPI } from '@/components/blocks/BaselineKPI'
import { BaselineCharts } from '@/components/charts/BaselineCharts'
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
  
  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))])
    e.target.value = ''
  }

  // Meta gate: required fields filled?
  const metaComplete = !!(
    meta.childName && meta.childDob && meta.evaluatorName &&
    meta.evalDate && meta.evalTimeStart && meta.evalTimeEnd
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

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">

      {/* ── LEFT: Input Panel ── */}
      <div className="w-[380px] flex-shrink-0 border-r border-[var(--rule)] overflow-y-auto bg-white">

        {/* Meta fields */}
        <div className="px-3 py-2 bg-[var(--navy)] text-right">
          <span className="text-white/70 text-xs font-mono">{enteredCount}/{totalCount} blocks</span>
        </div>

        <div className="p-4 border-b border-[var(--rule-2)] space-y-3">
          <h3 className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">Thông tin chung</h3>

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
            <label className="block text-xs text-[var(--ink-3)] mb-1">Email phụ huynh</label>
            <input
              type="email"
              value={meta.parentEmail}
              onChange={e => setMetaField('parentEmail', e.target.value)}
              className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              placeholder="parent@email.com"
            />
          </div>

          {/* Clinical toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setMetaField('isClinic', !meta.isClinic)}
              className={`w-9 h-5 rounded-full transition-colors ${meta.isClinic ? 'bg-[var(--navy)]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${meta.isClinic ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-[var(--ink-2)]">Có kết quả lâm sàng / xét nghiệm cho L0</span>
          </label>

          {/* File attachment L0 */}
          <div className="mt-2 px-3 py-2 bg-[var(--rule-2)] rounded-lg">
            <div className="text-[10px] text-[var(--ink-3)] mb-1.5">Tài liệu đính kèm (xét nghiệm, MRI, đo khúc xạ...)</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px] bg-white border border-[var(--rule)] rounded px-2 py-0.5">
                  <span>{f.type.includes('pdf') ? '📄' : f.type.includes('image') ? '🖼' : '📎'}</span>
                  <span className="text-[var(--ink-2)] max-w-24 truncate">{f.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="text-[var(--ink-3)] hover:text-[var(--red)] ml-0.5">×</button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--navy)] cursor-pointer hover:underline">
              <span>＋ Đính kèm</span>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dcm,.doc,.docx"
                onChange={handleFileAttach} className="hidden" />
            </label>
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
            />
          ))}
        </div>

        {/* Lock button */}
        <div className="sticky bottom-0 p-4 bg-white border-t border-[var(--rule)]">
          {!allBlocksScored && (
            <p className="text-xs text-[var(--ink-3)] text-center mb-1">
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
            className="w-full h-10 bg-[var(--red)] text-white rounded-lg text-sm font-bold hover:bg-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLocked ? '✓ Đã khóa Baseline' : 'Khóa Baseline →'}
          </button>
        </div>
      </div>

      {/* ── RIGHT: Summary Panel ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <BaselineKPI engine={engine} />
        <div className="mt-4">
          <BaselineCharts engine={engine} />
        </div>
      </div>

      {/* ── Lock Modal ── */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-serif font-bold text-[var(--navy)] mb-1">Khóa Baseline</h3>
            <p className="text-xs text-[var(--ink-3)] mb-4">
              Sau khi khóa, điểm baseline sẽ được lưu vào Supabase và không thể thay đổi trong cycle này.
            </p>
            <label className="block text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
              Mật khẩu xác nhận
            </label>
            <input
              type="password"
              value={lockPassword}
              onChange={e => { setLockPassword(e.target.value); setPasswordError('') }}
              className="w-full h-9 px-3 border border-[var(--rule)] rounded-lg text-sm mb-2 focus:outline-none focus:border-[var(--navy)]"
              placeholder="••••"
            />
            {passwordError && <p className="text-xs text-[var(--red)] mb-2">{passwordError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 h-9 border border-[var(--rule)] rounded-lg text-sm text-[var(--ink-3)] hover:bg-[var(--rule-2)]"
              >
                Hủy
              </button>
              <button
                onClick={handleLock}
                disabled={isSaving}
                className="flex-1 h-9 bg-[var(--navy)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--navy-mid)] disabled:opacity-40"
              >
                {isSaving ? 'Đang lưu...' : 'Xác nhận khóa'}
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
