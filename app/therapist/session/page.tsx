'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, type LocalScore, type SessionInfo } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import ActivityOutcomeForm from '@/components/forms/ActivityOutcomeForm'
import { SessionSummary, LayerTable, TargetBlocksTable } from '@/components/charts/SessionComponents'
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

// Legend for the −2…+2 local-progress scale used in TargetBlocksTable.
const SCALE_LEGEND: Array<{ label: string; desc: string; color: string }> = [
  { label: '−2', desc: 'Tệ hơn\nrõ rệt',  color: 'var(--red)' },
  { label: '−1', desc: 'Tệ hơn',          color: '#C07010' },
  { label: '0',  desc: 'Không đổi',       color: 'var(--ink-3)' },
  { label: '+1', desc: 'Cải thiện',       color: 'var(--green)' },
  { label: '+2', desc: 'Tiến bộ\nnhiều',  color: 'var(--green)' },
]

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

  const child = cycle.child as {name:string; dob?:string}

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
          <div className="doc-body space-y-4">

        {/* Info card */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-3">Thông tin chung</div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Họ và tên trẻ', value: child.name },
              { label: 'Chu kỳ',        value: (cycle.cycle_name as string) || '—' },
              { label: 'Buổi số',       value: `${sessionIndex} / ${plannedSessions}` },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[var(--ink-3)]">{row.label}</span>
                <span className="font-semibold text-[var(--ink)]">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-[var(--ink-3)]">Therapist</span>
              <input
                value={sessionInfo.therapistName}
                onChange={e => setSessionInfo({ ...sessionInfo, therapistName: e.target.value })}
                placeholder="Tên therapist"
                className="text-right text-xs font-semibold text-[var(--ink)] border-0 border-b border-[var(--rule)] outline-none w-36"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--ink-3)]">Thời gian</span>
              <div className="flex items-center gap-1">
                <input type="time" value={sessionInfo.timeStart}
                  onChange={e => setSessionInfo({ ...sessionInfo, timeStart: e.target.value })}
                  className="text-xs font-semibold text-[var(--ink)] border-0 border-b border-[var(--rule)] outline-none w-20"
                />
                <span className="text-[var(--ink-3)]">–</span>
                <input type="time" value={sessionInfo.timeEnd}
                  onChange={e => setSessionInfo({ ...sessionInfo, timeEnd: e.target.value })}
                  className="text-xs font-semibold text-[var(--ink)] border-0 border-b border-[var(--rule)] outline-none w-20"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--ink-3)]">Địa điểm</span>
              <select
                value={sessionInfo.location}
                onChange={e => setSessionInfo({ ...sessionInfo, location: e.target.value as SessionInfo['location'] })}
                className="text-xs font-semibold text-[var(--ink)] border-0 outline-none bg-transparent"
              >
                <option value="clinic">Tại clinic</option>
                <option value="home">Tại nhà</option>
                <option value="school">Tại trường</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </div>
        <SessionSummary
          currentBlocks={currentScores as Record<string, number>}
          baselineBlocks={(cycle.baseline as {blocks: Record<string, unknown>})?.blocks ?? {}}
          targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
        />
        <LayerTable
          currentBlocks={currentScores as Record<string, number>}
          baselineBlocks={(cycle.baseline as {blocks: Record<string, unknown>})?.blocks ?? {}}
          targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
        />
        {/* Evaluation scale legend (−2 … +2) */}
        <div>
          <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1.5">
            Thang đánh giá tiến bộ
          </div>
          <div className="eval-scale-header">
            {SCALE_LEGEND.map(item => (
              <div key={item.label} className="esh-item" style={{ color: item.color }}>
                {item.label}
                <span>
                  {item.desc.split('\n').map((line, i) => (
                    <span key={i} style={{ display: 'block' }}>{line}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <TargetBlocksTable
          activities={activities}
          baselineBlocks={(cycle.baseline as {blocks: Record<string, unknown>})?.blocks ?? {}}
          targetBlocks={(cycle.target as {blocks: Record<string, unknown>})?.blocks ?? {}}
          currentScores={currentScores as Record<string, number>}
          onLocalScore={setLocalScore}
          onNote={setActivityNote}
        />

        {/* Therapist notes */}
        <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-2">
            Ghi chú buổi trị liệu
          </div>
          <textarea
            value={therapistNote}
            onChange={e => setTherapistNote(e.target.value)}
            placeholder="Quan sát chung, mức độ hợp tác, kế hoạch cho buổi tiếp theo..."
            rows={4}
            className="w-full px-3 py-2 text-xs text-[var(--ink-2)] border border-[var(--rule)] rounded-lg outline-none focus:border-[var(--navy)] resize-y"
          />
        </div>

          </div>
        </A4PageWrapper>
      </div>
    </div>
  )
}
