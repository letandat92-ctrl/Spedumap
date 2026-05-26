'use client'

import { useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, type LocalScore, type SessionInfo } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import {
  SessionSummary, LayerTable, TargetBlocksTable,
  ReferenceCard, EvaluationSection, SignatureRow,
} from '@/components/charts/SessionComponents'
import { A4PageWrapper } from '@/components/A4PageWrapper'
import { DocumentHeader } from '@/components/DocumentHeader'

export const dynamic = 'force-dynamic'


const BN: Record<string, string> = {
  sleep:'Sleep',microbiome:'Microbiome',nutrition:'Nutrition',immune:'Immune',metabolic:'Metabolic',
  arousal:'Arousal',reflex_survival:'Reflex Survival',reflex_postural:'Reflex Postural',
  reflex_cortical:'Reflex Cortical',tone:'Muscle Tone',ns_stability:'Neural Stability',
  vestibular:'Vestibular',proprioception:'Proprioception',auditory:'Auditory',visual:'Visual',
  tactile:'Tactile',interoception:'Interoception',taste_smell:'Taste/Smell',
  motor_planning:'Motor Planning',gross_motor:'Gross Motor',fine_motor:'Fine Motor',
  postural_control:'Postural Control',bilateral_coord:'Bilateral Coord.',
  attention:'Attention Focus',auditory_processing:'Auditory Processing',
  visual_processing:'Visual Processing',wm_link:'Working Memory Link',
  oral_language:'Oral Language',word_finding:'Word Finding',
  phonemic_awareness:'Phonemic Awareness',auditory_memory:'Auditory Memory',visual_memory:'Visual Memory',
  self_control:'Self-Control',behavior:'Behavior',social_skills:'Social Skills',daily_living:'Daily Living',
  math:'Math',writing:'Writing',reading:'Reading',
}

const LOCAL_LABELS: Record<number, { label: string; color: string }> = {
  '-2': { label: '−2', color: 'bg-red-100 text-red-800 border-red-300' },
  '-1': { label: '−1', color: 'bg-orange-100 text-orange-800 border-orange-300' },
   '0': { label: '0',  color: 'bg-gray-100 text-gray-600 border-gray-300' },
   '1': { label: '+1', color: 'bg-green-100 text-green-800 border-green-300' },
   '2': { label: '+2', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
}

// Compute "{y}y{m}m" age from a date-of-birth string — template init().
function computeAge(dob?: string): string {
  if (!dob) return '—'
  const d = new Date(dob)
  if (isNaN(d.getTime())) return '—'
  const now = new Date()
  const years  = Math.floor((now.getTime() - d.getTime()) / 31557600000)
  const months = Math.floor(((now.getTime() - d.getTime()) / 2628000000) % 12)
  return `${years}y${months}m`
}

// Info-grid row styles — template .info-row / .info-label / .info-val.
const infoRow: CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: 5, padding: '2px 0',
  borderBottom: '1px solid var(--rule-2)', fontSize: 11.5,
}
const infoLabel: CSSProperties = {
  color: 'var(--ink-3)', fontSize: 10.5, whiteSpace: 'nowrap', flexShrink: 0,
}
const infoVal: CSSProperties = {
  fontWeight: 600, color: 'var(--ink)', fontSize: 11.5,
}

export default function SessionPage() {
  const router   = useRouter()
  const supabase = createClient()
  const {
    cycle, activities, sessionInfo, sessionDate, therapistNote, loadError, submitted,
    currentScores, sessionIndex, plannedSessions,
    setLocalScore, setActivityNote, setSessionDate, setTherapistNote,
    setSessionInfo,
    buildSessionOutput, commitSession,
  } = useSession()

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  // "Kế hoạch điều chỉnh cho buổi tới" — presentation-only (hook has no plan field).
  const [plan, setPlan]       = useState('')

  const enteredCount = Object.values(activities).filter(a => a.localScore !== null).length
  const totalBlocks  = Object.keys(activities).length
  const readyToSubmit = enteredCount > 0

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const output = buildSessionOutput()
      if (!output) throw new Error('Không có data')

      // Supabase insert
      const cycleId = (cycle?.supabase_cycle_id as string) || (cycle?.cycle_id as string)
      if (cycleId && cycleId.includes('-')) {
        const { error: sbErr } = await supabase.from('daily_sessions').insert({
          cycle_id:            cycleId,
          child_id:            (cycle?.child as {id:string})?.id,
          date:                output.date,
          session_index:       output.session_index,
          is_first_session:    output.is_first_session,
          activities:          output.activities,
          observed_activities: output.observed_activities,
          notes:               output.notes,
          parent_confirmed:    false,
        })
        if (sbErr) console.warn('Supabase save failed:', sbErr.message)
      }

      commitSession(output)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm text-center p-6">
          <div className="text-[var(--red)] font-semibold mb-2">Chưa có chu kỳ active</div>
          <p className="text-sm text-[var(--ink-3)] mb-4">{loadError}</p>
          <button onClick={() => router.push('/therapist/cycle')}
            className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm">
            Đến Cycle Open →
          </button>
        </div>
      </div>
    )
  }

  if (!cycle) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>

  const child = cycle.child as {name:string; dob?:string; id?:string}

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="max-w-sm text-center p-8">
          <div className="text-4xl mb-3">✓</div>
          <div className="font-semibold text-[var(--green)] text-lg mb-1">
            Session {sessionIndex - 1} đã nộp
          </div>
          <p className="text-sm text-[var(--ink-3)] mb-6">
            {enteredCount} blocks · {sessionDate}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/therapist/report')}
              className="px-4 py-2 border border-[var(--rule)] rounded-lg text-sm text-[var(--ink-3)] hover:bg-[var(--rule-2)]"
            >
              Xem Progress Report
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm"
            >
              Session mới →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] overflow-hidden">

      {/* LEFT: Block list */}
      <div className="w-[400px] flex-shrink-0 border-r border-[var(--rule)] overflow-y-auto bg-white">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--navy)] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-serif font-bold text-white text-sm">SPEDUMAP</span>
              <span className="text-white/50 text-xs ml-2">/ Daily Session</span>
            </div>
            <div className="text-white/70 text-xs font-mono">
              {sessionIndex} / {plannedSessions}
            </div>
          </div>
          <div className="text-white/60 text-xs mt-0.5">{child.name}</div>
        </div>

        {/* Session meta */}
        <div className="px-4 py-3 border-b border-[var(--rule-2)] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày</label>
              <input type="date" value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--ink-3)] mb-1">Ghi chú session</label>
              <input value={therapistNote}
                onChange={e => setTherapistNote(e.target.value)}
                placeholder="Trẻ hợp tác tốt..."
                className="w-full h-8 px-2 text-xs border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--navy)]"
              />
            </div>
          </div>
          <div className="text-xs text-[var(--ink-3)]">
            Đã nhập: <span className="font-semibold text-[var(--navy)]">{enteredCount}</span>/{totalBlocks} blocks
          </div>
        </div>

        {/* Activity rows */}
        <div className="divide-y divide-[var(--rule-2)]">
          {Object.entries(activities).map(([block, activity]) => {
            const current  = currentScores[block] ?? 0
            const target   = cycle.target as {blocks: Record<string, {score:number}>}
            const tScore   = target?.blocks?.[block]?.score ?? 0
            const progress = tScore > 0 ? Math.min(1, current / tScore) : 0

            return (
              <div key={block} className="px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-medium text-[var(--ink)]">{BN[block] ?? block}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--navy)] rounded-full transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--ink-3)]">
                        {current.toFixed(1)} → {tScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Local score buttons */}
                <div className="flex gap-1">
                  {([-2,-1,0,1,2] as LocalScore[]).map(score => {
                    const cfg = LOCAL_LABELS[score]
                    const selected = activity.localScore === score
                    return (
                      <button
                        key={score}
                        onClick={() => setLocalScore(block, selected ? null : score)}
                        className={`flex-1 h-7 text-xs font-mono font-bold rounded border transition-all ${
                          selected
                            ? cfg.color + ' ring-1 ring-offset-0 ring-current'
                            : 'border-[var(--rule)] text-[var(--ink-3)] hover:border-gray-400'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>

                {activity.localScore !== null && (
                  <input
                    value={activity.note}
                    onChange={e => setActivityNote(block, e.target.value)}
                    placeholder="Ghi chú..."
                    className="mt-1.5 w-full h-6 px-2 text-[10px] border border-[var(--rule-2)] rounded focus:outline-none focus:border-[var(--navy)]"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Submit footer */}
        <div className="sticky bottom-0 p-3 bg-white border-t border-[var(--rule)]">
          {error && (
            <div className="mb-2 p-2 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded text-xs text-[var(--red)]">
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!readyToSubmit || saving}
            className="w-full h-10 bg-[var(--navy)] text-white rounded-lg text-sm font-bold hover:bg-[var(--navy-mid)] disabled:opacity-40"
          >
            {saving ? 'Đang nộp...' : `Nộp Session ${sessionIndex} (${enteredCount} blocks) ✓`}
          </button>
        </div>
      </div>

      {/* RIGHT: Progress summary (A4 document) */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg)] py-6">
        <A4PageWrapper>
          <DocumentHeader
            title="SPEDUMAP — Daily Session Report"
            subtitle="Báo cáo buổi trị liệu · Tài liệu lâm sàng nội bộ"
            right={
              <div className="date-field">
                <span>Ngày:</span>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                />
              </div>
            }
          />
          <div className="doc-body">

            {/* ROW 1: Thông tin chung + Tóm tắt nhanh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>

              {/* Thông tin chung */}
              <div style={{ border: '1px solid var(--rule)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ fontFamily: "'Source Sans 3', sans-serif", background: 'var(--navy)', padding: '5px 11px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff' }}>
                  Thông tin chung
                </div>
                <div style={{ padding: '10px 11px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
                    {[
                      { label: 'Họ và tên trẻ', value: child.name },
                      { label: 'ID trẻ',        value: child.id || '—' },
                      { label: 'Tuổi',          value: computeAge(child.dob) },
                      { label: 'Chu kỳ',        value: (cycle.cycle_id as string) || '—' },
                      { label: 'Buổi số',       value: `${sessionIndex} / ${plannedSessions}` },
                    ].map(row => (
                      <div key={row.label} style={infoRow}>
                        <span style={infoLabel}>{row.label}:</span>
                        <span style={infoVal}>{row.value}</span>
                      </div>
                    ))}
                    <div style={infoRow}>
                      <span style={infoLabel}>Therapist:</span>
                      <input
                        value={sessionInfo.therapistName}
                        onChange={e => setSessionInfo({ ...sessionInfo, therapistName: e.target.value })}
                        placeholder="Tên therapist"
                        style={{ ...infoVal, border: 'none', background: 'transparent', outline: 'none', cursor: 'text', width: '100%' }}
                      />
                    </div>
                    <div style={infoRow}>
                      <span style={infoLabel}>Thời gian:</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="time" value={sessionInfo.timeStart}
                          onChange={e => setSessionInfo({ ...sessionInfo, timeStart: e.target.value })}
                          style={{ ...infoVal, fontSize: 11, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', width: 72 }}
                        />
                        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>–</span>
                        <input type="time" value={sessionInfo.timeEnd}
                          onChange={e => setSessionInfo({ ...sessionInfo, timeEnd: e.target.value })}
                          style={{ ...infoVal, fontSize: 11, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', width: 72 }}
                        />
                      </div>
                    </div>
                    <div style={{ ...infoRow, borderBottom: 'none' }}>
                      <span style={infoLabel}>Địa điểm:</span>
                      <select
                        value={sessionInfo.location}
                        onChange={e => setSessionInfo({ ...sessionInfo, location: e.target.value as SessionInfo['location'] })}
                        style={{ ...infoVal, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="clinic">Tại clinic</option>
                        <option value="home">Tại nhà</option>
                        <option value="school">Tại trường</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tóm tắt nhanh */}
              <SessionSummary
                currentBlocks={currentScores as Record<string, number>}
                baselineBlocks={(cycle.baseline as {blocks: Record<string, unknown>})?.blocks ?? {}}
                targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
                baselineTotal={(cycle.baseline as {total_score?: number})?.total_score}
              />
            </div>

            {/* ROW 2: Layer table + Reference data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <LayerTable
                currentBlocks={currentScores as Record<string, number>}
                baselineBlocks={(cycle.baseline as {blocks: Record<string, unknown>})?.blocks ?? {}}
                targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
              />
              <ReferenceCard
                baselineDate={(cycle.baseline as {date?: string})?.date}
                baselineTotal={(cycle.baseline as {total_score?: number})?.total_score}
                baselineStage={(cycle.baseline as {stage?: string})?.stage}
                sessions={(cycle.daily_sessions as Array<{ session_index: number; date: string }>) ?? []}
                currentSessionIndex={sessionIndex}
              />
            </div>

            {/* ROW 3: Hoạt động hôm nay */}
            <div style={{ marginBottom: 10 }}>
              <TargetBlocksTable
                activities={activities}
                baselineBlocks={(cycle.baseline as {blocks: Record<string, unknown>})?.blocks ?? {}}
                targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
                currentScores={currentScores as Record<string, number>}
                onLocalScore={setLocalScore}
                onNote={setActivityNote}
              />
            </div>

            {/* ROW 4: Nhận xét cuối ngày & Đánh giá tiến bộ */}
            <div style={{ marginBottom: 10 }}>
              <EvaluationSection
                targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
                notes={therapistNote}
                plan={plan}
                onNotes={setTherapistNote}
                onPlan={setPlan}
              />
            </div>

            {/* Signatures */}
            <SignatureRow therapistName={sessionInfo.therapistName} />

          </div>
        </A4PageWrapper>
      </div>
    </div>
  )
}
