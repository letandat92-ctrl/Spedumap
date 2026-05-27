'use client'

// app/therapist/retest/page.tsx
// Blind end-of-cycle retest. Same 39-block layout as the baseline form, but
// header shows only child name + age + cycle id, and there is NO result panel
// (no KPI, no signals, no charts, no baseline/target/previous scores) — strict
// blind assessment. Lock → useRetest.lock() → /therapist/close-summary.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRetest } from '@/hooks/useRetest'
import { LayerSection } from '@/components/blocks/LayerSection'

export const dynamic = 'force-dynamic'

// Block metadata — mirrors BM in baseline/page.tsx (identical layout/labels)
const BM: Record<string, { label: string; blocks: Record<string, string> }> = {
  L0: { label: 'L0 · Sức khỏe & Điều hòa sinh học', blocks: { sleep: 'Sleep', microbiome: 'Microbiome', nutrition: 'Nutrition', immune: 'Immune', metabolic: 'Metabolic' } },
  L1: { label: 'L1 · Nền tảng hệ thần kinh', blocks: { arousal: 'Arousal', reflex_survival: 'Reflex — Survival', reflex_postural: 'Reflex — Postural', reflex_cortical: 'Reflex — Cortical', tone: 'Muscle Tone', ns_stability: 'Neural Stability' } },
  L2: { label: 'L2 · Hệ thống giác quan', blocks: { vestibular: 'Vestibular', proprioception: 'Proprioception', auditory: 'Auditory', visual: 'Visual', tactile: 'Tactile', interoception: 'Interoception', taste_smell: 'Taste/Smell' } },
  L3: { label: 'L3 · Vận động', blocks: { motor_planning: 'Motor Planning', gross_motor: 'Gross Motor', fine_motor: 'Fine Motor', postural_control: 'Postural Control', bilateral_coord: 'Bilateral Coord.' } },
  L4: { label: 'L4 · Xử lý thông tin', blocks: { attention: 'Attention Focus', auditory_processing: 'Auditory Processing', visual_processing: 'Visual Processing', wm_link: 'Working Memory Link' } },
  L5: { label: 'L5 · Kỹ năng giao tiếp', blocks: { oral_language: 'Oral Language', word_finding: 'Word Finding', phonemic_awareness: 'Phonemic Awareness', auditory_memory: 'Auditory Memory', visual_memory: 'Visual Memory' } },
  L6: { label: 'L6 · Quản lý cuộc sống', blocks: { self_control: 'Self-Control', behavior: 'Behavior', social_skills: 'Social Skills', daily_living: 'Daily Living' } },
  L7: { label: 'L7 · Học thuật', blocks: { math: 'Math', writing: 'Writing', reading: 'Reading' } },
}

const LAYER_COLORS: Record<string, string> = {
  L0: '#8B1A1A', L1: '#A02020', L2: '#B83030', L3: '#C55030',
  L4: '#C87020', L5: '#4A8A60', L6: '#2A6A9A', L7: '#3A5AAA',
}

function ageString(dob: string): string {
  if (!dob) return ''
  const b = new Date(dob), n = new Date()
  if (isNaN(b.getTime())) return ''
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
  if (n.getDate() < b.getDate()) months--
  if (months < 0) months = 0
  return `${Math.floor(months / 12)} tuổi ${months % 12} tháng`
}

export default function RetestPage() {
  const router = useRouter()

  const [cycleId, setCycleId] = useState<string | null>(null)
  useEffect(() => {
    setCycleId(new URLSearchParams(window.location.search).get('cycle_id'))
  }, [])

  const {
    blocks, meta, loading, loadError, enteredCount, totalCount,
    setScore, setDir, setFlag, setNote, lock, isLocking, lockError,
    LAYER_IDS, BW, L2_BLOCKS,
  } = useRetest(cycleId)

  const [showModal, setShowModal] = useState(false)

  // Validation — identical rules to baseline (blind, but same quality gate)
  const allScored  = Object.values(blocks).every(b => b.score !== null)
  const dirErrors  = L2_BLOCKS.filter(k => blocks[k]?.score !== null && (!blocks[k]?.directionality || blocks[k]?.directionality === 'unknown'))
  const flagErrors = Object.entries(blocks).filter(([, b]) => (b.flag === 'retest' || b.flag === 'assumed') && !b.note.trim())
  const canLock    = allScored && dirErrors.length === 0 && flagErrors.length === 0

  // Arrow-key navigation across all rows
  const orderedBlockKeys = LAYER_IDS.flatMap(lid => Object.keys(BM[lid].blocks))
  function handleFocusRow(globalIndex: number, direction: 1 | -1) {
    const next = globalIndex + direction
    if (next < 0 || next >= orderedBlockKeys.length) return
    const el = document.querySelector(`[data-row-index="${next}"] input[type="text"]`) as HTMLInputElement
    el?.focus()
  }
  const layerOffsets: Record<string, number> = {}
  let offset = 0
  LAYER_IDS.forEach(lid => { layerOffsets[lid] = offset; offset += Object.keys(BM[lid].blocks).length })

  async function doLock() {
    const ok = await lock()
    setShowModal(false)
    if (ok && cycleId) router.push('/therapist/close-summary?cycle_id=' + cycleId)
  }

  const progressPct = totalCount > 0 ? Math.round((enteredCount / totalCount) * 100) : 0

  if (loading) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải thông tin trẻ...</div>

  if (loadError) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center p-6 max-w-sm">
        <div className="text-[var(--red)] font-semibold mb-2">{loadError}</div>
        <button onClick={() => router.push('/therapist/report')}
          className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm mt-3">
          Về Report →
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[var(--warm-bg)]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── TOP APP-BAR ── */}
      <header className="flex-shrink-0 h-[52px] flex items-center justify-between px-5 bg-[var(--card)] border-b border-[var(--border)] z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold tracking-[0.04em]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            SPEDUMAP <span className="text-[var(--red)]">Retest</span>
          </h1>
          <span className="text-[9px] font-bold px-[7px] py-0.5 rounded-[3px] bg-[var(--gold-bg)] text-[var(--gold)] border border-[var(--gold-bd)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            BLIND ASSESSMENT
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)]" style={{ fontFamily: "'Oswald', sans-serif" }}>Blocks</span>
            <div className="w-[100px] h-[3px] bg-[var(--border)] rounded-sm overflow-hidden">
              <div className="h-full bg-[var(--red)] rounded-sm transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-[var(--red)] min-w-[34px]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {enteredCount}/{totalCount}
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={!canLock}
            className={`text-[11px] font-semibold tracking-[0.06em] uppercase rounded-[3px] px-3.5 py-[7px] text-white transition-all ${
              canLock ? 'bg-[var(--red)] hover:bg-[var(--red-dk)] cursor-pointer' : 'bg-[var(--red)] opacity-35 cursor-not-allowed'
            }`}
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Khóa Retest
          </button>
        </div>
      </header>

      {/* ── BODY: single centered column (no result panel — blind) ── */}
      <div className="flex-1 w-full max-w-[460px] mx-auto px-3 py-4">

        {/* Child info strip — name + age + cycle id only */}
        <div className="mb-3 px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="text-[18px] font-semibold text-[var(--navy)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {meta?.childName || '—'}
          </div>
          <div className="text-[11px] text-[var(--sub-2)] mt-0.5">
            {ageString(meta?.childDob || '')}
            {meta?.cycleId && <> · Chu kỳ: <span className="font-mono">{meta.cycleId.slice(0, 8)}</span></>}
          </div>
          <div className="mt-2 text-[10px] leading-snug text-[var(--gold)] bg-[var(--gold-bg)] border border-[var(--gold-bd)] rounded px-2.5 py-1.5">
            Đánh giá mù: không hiển thị điểm baseline / mục tiêu / phiên trước. Chấm lại toàn bộ 39 block một cách độc lập.
          </div>
        </div>

        {/* 39-block form */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2">
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
              isClinic={false}
              onFocusRow={handleFocusRow}
            />
          ))}
        </div>

        {/* Lock button + validation */}
        <div className="sticky bottom-0 mt-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          {!allScored && (
            <p className="text-xs text-[var(--sub)] text-center mb-1">
              Còn {Object.values(blocks).filter(b => b.score === null).length} blocks chưa nhập điểm
            </p>
          )}
          {dirErrors.length > 0 && (
            <p className="text-xs text-[var(--gold)] text-center mb-1">{dirErrors.length} block L2 chưa chọn Hyper/Hypo</p>
          )}
          {flagErrors.length > 0 && (
            <p className="text-xs text-[var(--red)] text-center mb-1">{flagErrors.length} block cần nhập lý do retest/assumed</p>
          )}
          {lockError && (
            <div className="mb-2 p-2 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded text-xs text-[var(--red)]">{lockError}</div>
          )}
          <button
            onClick={() => setShowModal(true)}
            disabled={!canLock}
            className="w-full h-10 bg-[var(--red)] text-white rounded-lg text-sm font-bold hover:bg-[var(--red-dk)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Khóa Retest & Đóng Chu Kỳ →
          </button>
        </div>
      </div>

      {/* ── Lock Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-[rgba(26,26,26,0.55)] flex items-center justify-center z-50" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="bg-white rounded-lg px-7 pt-7 pb-5 w-[90%] max-w-[420px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <div className="text-center text-[28px] mb-2.5">🔒</div>
            <h3 className="text-center text-[16px] font-bold tracking-[0.04em] text-[var(--red)] mb-2.5" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Xác nhận Khóa Retest
            </h3>
            <p className="text-center text-xs text-[var(--sub-2)] leading-relaxed mb-4">
              Sau khi khóa, kết quả retest sẽ được lưu và <strong className="text-[var(--ink)]">chu kỳ sẽ đóng</strong>.
              Bạn sẽ được chuyển đến trang tổng kết so sánh Baseline → Mục tiêu → Retest.
            </p>
            {lockError && <p className="text-xs text-[var(--red)] mb-2 text-center">{lockError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={isLocking}
                className="flex-1 h-[34px] border-[1.5px] border-[var(--border)] rounded bg-[var(--warm-bg)] text-[11px] font-semibold tracking-[0.04em] text-[var(--sub-2)] hover:border-[#999] hover:text-[var(--ink)] disabled:opacity-40"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={doLock}
                disabled={isLocking}
                className="flex-1 h-[34px] bg-[var(--red)] text-white rounded text-[11px] font-bold tracking-[0.06em] hover:bg-[var(--red-dk)] disabled:opacity-40"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {isLocking ? 'Đang lưu...' : 'Khóa Retest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
