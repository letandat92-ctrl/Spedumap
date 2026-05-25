'use client'

import { useState } from 'react'

// ── Report Donut KPI ──────────────────────────────────────────

interface ReportKPIProps {
  current:    number
  baseline:   number
  target:     number
  sessionsDone: number
  planned:    number
  startedAt?: string
}

export function ReportKPI({ current, baseline, target, sessionsDone, planned, startedAt }: ReportKPIProps) {
  const delta    = current - baseline
  const needed   = target - baseline
  const pct      = needed > 0 ? Math.max(0, Math.min(100, Math.round(delta / needed * 100))) : 100
  const sessPct  = planned > 0 ? Math.round(sessionsDone / planned * 100) : 0

  const r = 20, cx = 26, cy = 26
  const circ  = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)

  const daysIn = startedAt
    ? Math.round((new Date().getTime() - new Date(startedAt).getTime()) / 86400000)
    : 0

  return (
    <div className="bg-[var(--navy)] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <svg viewBox="0 0 52 52" width="52" height="52">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke="#6EE7A0" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 26 26)"
            />
            <text x={cx} y={cy + 4} textAnchor="middle"
              fontFamily="DM Mono, monospace" fontSize="11" fontWeight="700" fill="white">
              {pct}%
            </text>
          </svg>
          <div>
            <div className="text-2xl font-mono font-bold text-white">{current.toFixed(1)}</div>
            <div className="text-xs text-white/50">Điểm hiện tại / 100</div>
            <div className="text-xs text-white/40">% phát triển tổng thể</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex gap-4 flex-1">
          {[
            { label: 'Baseline', value: baseline.toFixed(1), color: 'text-[var(--gold)]' },
            { label: 'Target',   value: target.toFixed(1),   color: 'text-[var(--green)]' },
            { label: 'Δ từ Baseline', value: (delta >= 0 ? '+' : '') + delta.toFixed(1), color: delta >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]' },
          ].map(kpi => (
            <div key={kpi.label} className="text-center">
              <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className={`text-xl font-mono font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Session progress */}
        <div className="flex-shrink-0 min-w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50">Sessions</span>
            <span className="text-xs font-mono font-bold text-white">{sessionsDone}/{planned}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--green)] rounded-full transition-all" style={{ width: `${sessPct}%` }} />
          </div>
          {daysIn > 0 && (
            <div className="text-[10px] text-white/40 mt-1">Ngày thứ {daysIn}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Metadata Strip ────────────────────────────────────────────

interface MetadataStripProps {
  reportTs?:   string
  startedAt?:  string
  closedAt?:   string
}

export function MetadataStrip({ reportTs, startedAt, closedAt }: MetadataStripProps) {
  const now    = new Date().toLocaleString('vi-VN')
  const daysIn = startedAt
    ? Math.round((new Date().getTime() - new Date(startedAt).getTime()) / 86400000)
    : null

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--rule-2)] border border-[var(--rule)] rounded-lg mb-4 text-[10px] text-[var(--ink-3)]">
      <span>🖨 Báo cáo tạo lúc: <strong className="text-[var(--ink-2)]">{reportTs || now}</strong></span>
      {startedAt && (
        <>
          <span className="text-[var(--rule)]">|</span>
          <span>Cycle bắt đầu: <strong className="text-[var(--ink-2)]">{new Date(startedAt).toLocaleDateString('vi-VN')}</strong></span>
          {daysIn !== null && (
            <>
              <span className="text-[var(--rule)]">|</span>
              <span>Ngày thứ: <strong className="text-[var(--ink-2)]">{daysIn}</strong></span>
            </>
          )}
        </>
      )}
      {closedAt && (
        <>
          <span className="text-[var(--rule)]">|</span>
          <span>Đóng lúc: <strong className="text-red-600">{new Date(closedAt).toLocaleDateString('vi-VN')}</strong></span>
        </>
      )}
    </div>
  )
}

// ── Session Timeline ──────────────────────────────────────────

interface SessionItem {
  session_index:      number
  date:               string
  therapist?:         string
  activities?:        Array<{ delta: number }>
  observed_activities?: Array<{ delta: number }>
  regression_note?:   string
  notes?:             string
}

interface SessionTimelineProps {
  sessions: SessionItem[]
}

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  const [expanded, setExpanded] = useState(false)
  const SHOW = 3

  if (!sessions.length) return null

  const reversed = [...sessions].reverse()
  const recent   = reversed.slice(0, SHOW)
  const older    = reversed.slice(SHOW)

  function TimelineItem({ s }: { s: SessionItem }) {
    const totalDelta =
      (s.activities?.reduce((sum, a) => sum + (a.delta || 0), 0) ?? 0) +
      (s.observed_activities?.reduce((sum, a) => sum + (a.delta || 0), 0) ?? 0)
    const dc        = totalDelta > 0 ? 'text-[var(--green)]' : totalDelta < 0 ? 'text-[var(--red)]' : 'text-[var(--ink-3)]'
    const hasReg    = !!s.regression_note

    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-[var(--rule-2)] last:border-0 text-xs ${
        hasReg ? 'bg-yellow-50 border-yellow-200' : ''
      }`}>
        <span className="text-[var(--ink-3)] w-24 flex-shrink-0">{s.date}</span>
        <div className="flex-1">
          <span className="font-medium text-[var(--ink)]">Session {s.session_index}</span>
          <span className="text-[var(--ink-3)] ml-1">· {s.activities?.length || 0} blocks</span>
          {hasReg && <span className="text-yellow-700 text-[10px] ml-1">⚠ Regression</span>}
          {s.notes && <div className="text-[10px] text-[var(--ink-3)] mt-0.5 truncate">{s.notes}</div>}
        </div>
        <span className="text-[var(--ink-3)] text-[10px] hidden sm:block">{s.therapist || '—'}</span>
        <span className={`font-mono font-bold w-14 text-right ${dc}`}>
          {totalDelta >= 0 ? '+' : ''}{totalDelta.toFixed(2)}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--rule)] rounded-xl overflow-hidden mb-4">
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-[var(--rule-2)] border-b border-[var(--rule)] cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xs font-semibold text-[var(--ink)]">Timeline Sessions</span>
        <div className="flex items-center gap-2 text-xs text-[var(--ink-3)]">
          <span>{sessions.length} sessions</span>
          <span style={{ transform: expanded ? '' : 'rotate(-90deg)', transition: 'transform .2s' }}>▼</span>
        </div>
      </div>
      {expanded && (
        <div>
          {recent.map(s => <TimelineItem key={s.session_index} s={s} />)}
          {older.length > 0 && (
            <>
              {expanded && older.map(s => <TimelineItem key={s.session_index} s={s} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}


interface ChildStripProps {
  name:      string
  dob?:      string
  cycleId?:  string
  status:    'active' | 'closed'
  startedAt?: string
}

export function ChildStrip({ name, dob, cycleId, status, startedAt }: ChildStripProps) {
  const age = dob
    ? Math.floor((new Date().getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-4 bg-white border border-[var(--rule)] rounded-xl px-5 py-3 mb-4">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[var(--navy)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {initials || '?'}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[var(--ink)]">{name}</div>
        <div className="text-xs text-[var(--ink-3)]">
          {age !== null && `${age} tuổi`}
          {cycleId && <span className="ml-2">· Cycle {cycleId.slice(-4)}</span>}
          {startedAt && <span className="ml-2">· Bắt đầu {new Date(startedAt).toLocaleDateString('vi-VN')}</span>}
        </div>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
        status === 'active'
          ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-bd)]'
          : 'bg-[var(--rule-2)] text-[var(--ink-3)] border-[var(--rule)]'
      }`}>
        {status === 'active' ? 'ACTIVE' : 'CLOSED'}
      </span>
    </div>
  )
}
