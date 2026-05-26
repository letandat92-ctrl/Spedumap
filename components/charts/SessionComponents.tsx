'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import type { LocalScore } from '@/hooks/useSession'

// Template fonts (loaded globally): Libre Baskerville headings, Source Sans 3
// body, DM Mono numbers. Applied via inline style since the Tailwind font-*
// utilities map to different families in this project's tailwind.config.
const FONT_SERIF = "'Libre Baskerville', Georgia, serif"
const FONT_SANS  = "'Source Sans 3', sans-serif"
const FONT_MONO  = "'DM Mono', ui-monospace, monospace"

const LAYER_IDS = ['L0','L1','L2','L3','L4','L5','L6','L7']
// Full layer names matching the ui_daily_session.html template (LAYER_NAMES).
const LAYER_NAMES: Record<string,string> = {
  L0:'L0 Health & Nutrition', L1:'L1 Regulation', L2:'L2 Sensory', L3:'L3 Motor',
  L4:'L4 Processing', L5:'L5 Communication', L6:'L6 Social', L7:'L7 Academic',
}
// Layer dot colors — template LC map.
const LAYER_COLORS: Record<string,string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}
const BW: Record<string,Record<string,number>> = {
  L0:{sleep:.25,microbiome:.25,nutrition:.20,immune:.15,metabolic:.15},
  L1:{arousal:.40,reflex_survival:.10,reflex_postural:.10,reflex_cortical:.05,tone:.20,ns_stability:.15},
  L2:{vestibular:.20,proprioception:.15,auditory:.15,visual:.15,tactile:.10,interoception:.10,taste_smell:.15},
  L3:{motor_planning:.2,gross_motor:.2,fine_motor:.2,postural_control:.2,bilateral_coord:.2},
  L4:{attention:.35,auditory_processing:.30,visual_processing:.30,wm_link:.05},
  L5:{oral_language:.2,word_finding:.2,phonemic_awareness:.2,auditory_memory:.2,visual_memory:.2},
  L6:{self_control:.25,behavior:.25,social_skills:.25,daily_living:.25},
  L7:{math:1/3,writing:1/3,reading:1/3},
}
const LAYER_W: Record<string,number> = {L0:18,L1:16,L2:14,L3:12,L4:12,L5:10,L6:10,L7:8}
const BN: Record<string,string> = {
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

// Per-layer warm/cool tint backgrounds for the layer chips — template LAYER_BG.
const LAYER_BG: Record<string,string> = {
  L0:'#FDF5F5',L1:'#FDF2F0',L2:'#FDF5F0',L3:'#FDF8F0',
  L4:'#FDF8EC',L5:'#EEF8F2',L6:'#EEF2FC',L7:'#F0F2FF',
}

// Mock activity / focus suggestions per block — mirrors template MOCK_ACT.
const MOCK_ACT: Record<string, { act: string; focus: string }> = {
  microbiome:{act:'Massage bụng + Probiotic feeding', focus:'Kích thích nhu động ruột, cân bằng vi sinh'},
  gut:      {act:'Massage bụng + Probiotic feeding', focus:'Kích thích nhu động ruột, cân bằng vi sinh'},
  arousal:  {act:'Bài sờ chạm sâu (Deep Pressure)',  focus:'Giảm over-arousal, ổn định hệ thần kinh'},
  attention:{act:'Bài phân loại đồ vật theo hình',   focus:'Tăng thời gian duy trì chú ý'},
  sleep:    {act:'Breathing routine + đèn mờ',        focus:'Thiết lập tín hiệu ngủ, giảm arousal tối'},
}

// Local-score delta map (−2…+2) — mirrors hook L2D.
const LOCAL_DELTAS: Record<number, number> = { '-2': -0.50, '-1': -0.20, 0: 0.00, 1: 0.20, 2: 0.40 }

// Local-score buttons — template LS (note: 4 buttons −2, 0, +1, +2 in the template;
// we keep the full −2…+2 set the hook supports, with template num/label styling).
const LS: Array<{ val: LocalScore; num: string; lbl: string; cls: string }> = [
  { val: -2, num: '−2', lbl: 'Tệ hơn rõ',  cls: 'sel-w'  },
  { val: -1, num: '−1', lbl: 'Tệ hơn',     cls: 'sel-w'  },
  { val:  0, num: '0',  lbl: 'Như cũ',     cls: 'sel-0'  },
  { val:  1, num: '+1', lbl: 'Tốt hơn',    cls: 'sel-p1' },
  { val:  2, num: '+2', lbl: 'Tốt hơn rõ', cls: 'sel-p2' },
]

// Selected-button styling per template .ls-btn.sel-* rules.
const LS_SEL_STYLE: Record<string, { bg: string; bd: string; fg: string }> = {
  'sel-w':  { bg: 'var(--red-bg)',   bd: 'var(--red)',   fg: 'var(--red)'   },
  'sel-0':  { bg: 'var(--rule-2)',   bd: 'var(--ink-3)', fg: 'var(--ink-2)' },
  'sel-p1': { bg: 'var(--green-bg)', bd: '#70B090',      fg: 'var(--green)' },
  'sel-p2': { bg: '#D8F0E4',         bd: '#1A6A3A',      fg: '#0F5C30'      },
}

const B2L: Record<string,string> = {
  sleep:'L0',microbiome:'L0',nutrition:'L0',immune:'L0',metabolic:'L0',
  arousal:'L1',reflex_survival:'L1',reflex_postural:'L1',reflex_cortical:'L1',tone:'L1',ns_stability:'L1',
  vestibular:'L2',proprioception:'L2',auditory:'L2',visual:'L2',tactile:'L2',interoception:'L2',taste_smell:'L2',
  motor_planning:'L3',gross_motor:'L3',fine_motor:'L3',postural_control:'L3',bilateral_coord:'L3',
  attention:'L4',auditory_processing:'L4',visual_processing:'L4',wm_link:'L4',
  oral_language:'L5',word_finding:'L5',phonemic_awareness:'L5',auditory_memory:'L5',visual_memory:'L5',
  self_control:'L6',behavior:'L6',social_skills:'L6',daily_living:'L6',
  math:'L7',writing:'L7',reading:'L7',
}

function getScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

function computeTotal(blocks: Record<string, unknown>): number {
  let t = 0
  LAYER_IDS.forEach(lid => {
    const bw = BW[lid]; let s = 0
    Object.entries(bw).forEach(([k, w]) => { s += getScore(blocks[k] ?? 0) * w })
    t += (s / 4) * LAYER_W[lid]
  })
  return t
}

function layerScore(blocks: Record<string, unknown>, lid: string): number {
  const bw = BW[lid]; if (!bw) return 0
  return Object.entries(bw).reduce((s, [k, w]) => s + getScore(blocks[k] ?? 0) * w, 0)
}

// ── Shared card chrome (template .card / .card-head / .card-body) ──────────

function Card({ title, headRight, bodyPadding = '10px 11px', children }: {
  title: string
  headRight?: ReactNode
  bodyPadding?: string
  children: ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 5, overflow: 'hidden' }}>
      <div
        style={{
          fontFamily: FONT_SANS,
          background: 'var(--navy)', padding: '5px 11px', fontSize: 10, fontWeight: 700,
          letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff',
          display: headRight ? 'flex' : undefined,
          justifyContent: headRight ? 'space-between' : undefined,
          alignItems: headRight ? 'center' : undefined,
        }}
      >
        <span>{title}</span>
        {headRight}
      </div>
      <div style={{ padding: bodyPadding }}>{children}</div>
    </div>
  )
}

// ── Donut SVG ─────────────────────────────────────────────────

function Donut({ pct }: { pct: number }) {
  const r = 24, cx = 30, cy = 30
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ width: 60, height: 60 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="#6EE7A0" strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fontFamily="DM Mono, monospace" fontSize="11" fontWeight="700" fill="white">
        {pct}%
      </text>
    </svg>
  )
}

// ── Session Summary Panel (template .summary-panel) ───────────────────────

interface SessionSummaryProps {
  currentBlocks:  Record<string, number>
  baselineBlocks: Record<string, unknown>
  targetBlocks:   Record<string, unknown>
  /** Canonical baseline total from the cycle (template baseline.total_score). */
  baselineTotal?: number
}

export function SessionSummary({ currentBlocks, baselineBlocks, targetBlocks, baselineTotal }: SessionSummaryProps) {
  const baseComputed = computeTotal(baselineBlocks)
  const base    = baselineTotal ?? baseComputed
  // Delta vs baseline is added on top of the canonical baseline total (template approach).
  const current = base + (computeTotal(currentBlocks) - baseComputed)
  const target  = base + (computeTotal({ ...baselineBlocks, ...targetBlocks }) - baseComputed)
  const delta   = current - base
  const pctDone = Math.round(current)

  return (
    <div style={{ background: 'var(--navy)', borderRadius: 5, padding: '10px 12px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* KPI box */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: 4, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: 3 }}>
            Tổng điểm hiện tại
          </div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {current.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>/ 100</div>
        </div>
        {/* Donut */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: '0 0 70px' }}>
          <Donut pct={pctDone} />
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 3, textAlign: 'center' }}>
            % phát triển
          </div>
        </div>
      </div>
      {/* Chips */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {[
          { label: 'Baseline',           value: base.toFixed(1),  delta: false },
          { label: 'Target cuối chu kỳ', value: target.toFixed(1), delta: false },
          { label: 'Delta từ baseline',  value: (delta >= 0 ? '+' : '') + delta.toFixed(1), delta: true },
        ].map(chip => (
          <div key={chip.label} style={{
            flex: 1, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 4, padding: '6px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.55)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>
              {chip.label}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: chip.delta ? '#6EE7A0' : '#fff' }}>
              {chip.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Layer Progress Table (template "Target Delta Score" .layer-table) ──────

const thLayer: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
  color: 'var(--ink-3)', borderBottom: '2px solid var(--rule)', padding: '5px 8px 6px',
  textAlign: 'left', background: 'var(--rule-2)',
}
const tdLayer: CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'middle',
}
const numCell: CSSProperties = {
  fontFamily: FONT_MONO, fontSize: 11, textAlign: 'right',
}

interface LayerTableProps {
  currentBlocks:  Record<string, number>
  baselineBlocks: Record<string, unknown>
  targetBlocks:   Record<string, unknown>
}

export function LayerTable({ currentBlocks, baselineBlocks, targetBlocks }: LayerTableProps) {
  const merged = { ...baselineBlocks, ...targetBlocks }

  const rows = LAYER_IDS.map(lid => {
    const hasTarget = Object.keys(targetBlocks).some(k => B2L[k] === lid)
    if (!hasTarget) return null

    const cur      = layerScore(currentBlocks, lid)
    const base     = layerScore(baselineBlocks, lid)
    const tgtScore = layerScore(merged, lid)
    const needed   = tgtScore - base
    const achieved = cur - base
    const pct      = needed > 0 ? Math.max(0, Math.min(100, Math.round(achieved / needed * 100))) : 100
    const pc       = pct >= 60 ? '#1A6A3A' : pct >= 30 ? '#C07010' : '#B52020'

    return { lid, cur, tgtScore, pct, pc }
  }).filter(Boolean) as Array<{lid:string;cur:number;tgtScore:number;pct:number;pc:string}>

  if (!rows.length) return null

  return (
    <Card title="Target Delta Score (Mục tiêu của chu kỳ)" bodyPadding="0">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={thLayer}>Layer</th>
            <th style={thLayer}>Hiện tại</th>
            <th style={thLayer}>Target</th>
            <th style={thLayer}>Delta</th>
            <th style={{ ...thLayer, minWidth: 80 }}>% Hoàn thành</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ lid, cur, tgtScore, pct, pc }, i) => (
            <tr key={lid}>
              <td style={{ ...tdLayer, borderBottom: i === rows.length - 1 ? 'none' : tdLayer.borderBottom }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 5, verticalAlign: 'middle', background: LAYER_COLORS[lid] }} />
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{LAYER_NAMES[lid]}</span>
              </td>
              <td style={{ ...numCell, ...tdLayer, borderBottom: i === rows.length - 1 ? 'none' : tdLayer.borderBottom }}>{cur.toFixed(2)}</td>
              <td style={{ ...numCell, ...tdLayer, borderBottom: i === rows.length - 1 ? 'none' : tdLayer.borderBottom }}>{tgtScore.toFixed(2)}</td>
              <td style={{ ...numCell, ...tdLayer, borderBottom: i === rows.length - 1 ? 'none' : tdLayer.borderBottom }}>
                <span style={{ color: '#1A6A3A', fontWeight: 700 }}>+{Math.max(0, tgtScore - cur).toFixed(2)}</span>
              </td>
              <td style={{ ...tdLayer, minWidth: 80, borderBottom: i === rows.length - 1 ? 'none' : tdLayer.borderBottom }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ flex: 1, height: 7, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pc }} />
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, width: 30, textAlign: 'right', color: pc }}>{pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '5px 8px', fontSize: 9, color: 'var(--ink-3)', borderTop: '1px solid var(--rule-2)', fontStyle: 'italic' }}>
        * % hoàn thành tính dựa trên delta đã đạt so với delta cần đạt trong chu kỳ.
      </div>
    </Card>
  )
}

// ── Reference data card (template "Dữ liệu tham chiếu") ────────────────────

interface ReferenceCardProps {
  baselineDate?:  string
  baselineTotal?: number
  baselineStage?: string
  sessions:       Array<{ session_index: number; date: string }>
  currentSessionIndex: number
}

export function ReferenceCard({ baselineDate, baselineTotal, baselineStage, sessions, currentSessionIndex }: ReferenceCardProps) {
  const headSub: CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--navy-2)', letterSpacing: '.04em',
    textTransform: 'uppercase', marginBottom: 5,
  }
  return (
    <Card title="Dữ liệu tham chiếu">
      <div style={{ marginBottom: 8 }}>
        <div style={headSub}>Baseline gần nhất ({baselineDate || '—'})</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div>
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Tổng điểm: </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
              {baselineTotal != null ? baselineTotal.toFixed(1) : '—'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Giai đoạn: </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
              {baselineStage || '—'}
            </span>
          </div>
        </div>
      </div>
      <div style={headSub}>Timeline tóm tắt</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {sessions.map(s => (
          <div key={s.session_index} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--rule-2)' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap', width: 80 }}>{s.date}</span>
            <span style={{ flex: 1, color: 'var(--ink-2)' }}>Session {s.session_index}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>—</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, padding: '3px 0', fontWeight: 600, color: 'var(--navy)' }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap', width: 80 }}>
            {new Date().toLocaleDateString('vi-VN')}
          </span>
          <span style={{ flex: 1 }}>Session {currentSessionIndex} (Hiện tại)</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700 }}>—</span>
        </div>
      </div>
    </Card>
  )
}

// ── Activities table (template "Hoạt động hôm nay" .act-table) ─────────────

const thAct: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
  color: 'var(--ink-3)', borderBottom: '2px solid var(--rule)', padding: '5px 8px 6px',
  textAlign: 'left', background: 'var(--rule-2)',
}
const tdAct: CSSProperties = {
  padding: '6px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'top',
}
const inlineInput: CSSProperties = {
  border: 'none', borderBottom: '1px solid var(--rule)', background: 'transparent',
  fontFamily: 'Source Sans 3, sans-serif', fontSize: 11, color: 'var(--ink-2)',
  outline: 'none', width: '100%', padding: '1px 2px',
}

interface TargetBlocksTableProps {
  activities:     Record<string, { localScore: number | null; note: string }>
  baselineBlocks: Record<string, unknown>
  targetBlocks:   Record<string, unknown>
  currentScores:  Record<string, number>
  onLocalScore:   (block: string, score: LocalScore | null) => void
  onNote:         (block: string, note: string) => void
}

export function TargetBlocksTable({
  activities, baselineBlocks, targetBlocks, currentScores,
  onLocalScore, onNote,
}: TargetBlocksTableProps) {
  const [activityName, setActivityName] = useState<Record<string, string>>({})
  const [activitySub, setActivitySub]   = useState<Record<string, string>>({})
  const [focuses, setFocuses]           = useState<Record<string, string>>({})

  const keys = Object.keys(targetBlocks)
  const filled = Object.values(activities).filter(a => a.localScore !== null).length

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 5, overflow: 'hidden' }}>
      <div
        style={{
          fontFamily: FONT_SANS,
          background: 'var(--navy)', padding: '5px 11px', fontSize: 10, fontWeight: 700,
          letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>Hoạt động hôm nay</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)', letterSpacing: 0, textTransform: 'none' }}>
          {filled} / {keys.length}
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thAct, width: 24 }}>STT</th>
            <th style={thAct}>Hoạt động / Bài tập</th>
            <th style={thAct}>Mục đích (Liên quan đến)</th>
            <th style={{ ...thAct, textAlign: 'center' }}>Target Delta<br />(chu kỳ)</th>
            <th style={{ ...thAct, minWidth: 200 }}>
              Điểm tập trung hôm nay
              <br />
              <span style={{ fontWeight: 400, fontSize: 8.5, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-3)' }}>
                Chọn mức đánh giá so với session trước
              </span>
            </th>
            <th style={thAct}>Ghi chú (Điều chỉnh / Phản ứng của trẻ)</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key, i) => {
            const lid      = B2L[key] ?? 'L0'
            const color    = LAYER_COLORS[lid]
            const lbg      = LAYER_BG[lid] ?? '#FDF8EC'
            const baseline = getScore(baselineBlocks[key] ?? 0)
            const target   = getScore(targetBlocks[key] ?? 0)
            const current  = currentScores[key] ?? baseline
            const td       = target - baseline
            const act      = activities[key]
            const ls       = act?.localScore ?? null
            const newScore = ls !== null
              ? Math.round((current + td * (LOCAL_DELTAS[ls] ?? 0)) * 100) / 100
              : null
            const delta    = ls !== null ? td * (LOCAL_DELTAS[ls] ?? 0) : 0
            const mock     = MOCK_ACT[key] ?? { act: '', focus: '' }
            const last     = i === keys.length - 1

            return (
              <tr key={key}>
                {/* STT */}
                <td style={{ ...tdAct, borderBottom: last ? 'none' : tdAct.borderBottom, fontFamily: FONT_MONO, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', width: 24 }}>
                  {i + 1}
                </td>
                {/* Activity name + sub */}
                <td style={{ ...tdAct, borderBottom: last ? 'none' : tdAct.borderBottom }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 11.5 }}>
                    <input
                      value={activityName[key] ?? mock.act}
                      onChange={e => setActivityName(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="Hoạt động / bài tập hôm nay..."
                      style={{ ...inlineInput, fontWeight: 600, fontSize: 11.5 }}
                    />
                  </div>
                  <input
                    value={activitySub[key] ?? ''}
                    onChange={e => setActivitySub(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="Kỹ thuật / ghi chú thêm..."
                    style={{ ...inlineInput, fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}
                  />
                </td>
                {/* Purpose: layer chip + focus */}
                <td style={{ ...tdAct, borderBottom: last ? 'none' : tdAct.borderBottom }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 3,
                    padding: '2px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                    background: lbg, color, border: `1px solid ${color}40`,
                  }}>
                    {LAYER_NAMES[lid] ?? lid}
                  </span>
                  <input
                    value={focuses[key] ?? mock.focus}
                    onChange={e => setFocuses(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="Điểm tập trung hôm nay..."
                    style={{ ...inlineInput, fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}
                  />
                </td>
                {/* Target delta */}
                <td style={{ ...tdAct, borderBottom: last ? 'none' : tdAct.borderBottom, fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>
                  +{td.toFixed(1)}
                </td>
                {/* Local score buttons + delta preview */}
                <td style={{ ...tdAct, borderBottom: last ? 'none' : tdAct.borderBottom, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {LS.map((o, bi) => {
                      const sel = ls === o.val
                      const ss  = LS_SEL_STYLE[o.cls]
                      return (
                        <button
                          key={o.val}
                          onClick={() => onLocalScore(key, sel ? null : o.val)}
                          style={{
                            flex: 1, height: 32, marginRight: bi === LS.length - 1 ? 0 : -1,
                            border: `1px solid ${sel ? ss.bd : 'var(--rule)'}`,
                            borderRadius: bi === 0 ? '4px 0 0 4px' : bi === LS.length - 1 ? '0 4px 4px 0' : 0,
                            background: sel ? ss.bg : 'var(--paper)', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 1, fontFamily: 'Source Sans 3, sans-serif',
                            position: 'relative', zIndex: sel ? 1 : 0,
                          }}
                        >
                          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, lineHeight: 1, color: sel ? ss.fg : 'var(--ink-3)' }}>{o.num}</span>
                          <span style={{ fontSize: 8, textAlign: 'center', color: sel ? ss.fg : 'var(--ink-3)' }}>{o.lbl}</span>
                        </button>
                      )
                    })}
                  </div>
                  {newScore !== null && (
                    <div style={{ display: 'block', fontSize: 10, color: 'var(--ink-3)', marginTop: 4, padding: '2px 5px', background: 'var(--rule-2)', borderRadius: 3 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--ink-2)' }}>{current.toFixed(1)}</span>
                      <span style={{ margin: '0 4px' }}>→</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--ink-3)' }}>
                        {newScore.toFixed(1)} ({delta >= 0 ? '+' : ''}{delta.toFixed(2)})
                      </span>
                    </div>
                  )}
                </td>
                {/* Note */}
                <td style={{ ...tdAct, borderBottom: last ? 'none' : tdAct.borderBottom }}>
                  <input
                    value={act?.note ?? ''}
                    onChange={e => onNote(key, e.target.value)}
                    placeholder="Phản ứng trẻ, điều chỉnh..."
                    style={{ ...inlineInput, fontSize: 10.5, fontStyle: 'italic' }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Evaluation section (template "Nhận xét cuối ngày & Đánh giá tiến bộ") ──

// 0–6 progress scale legend — template eval-scale-header. --s5/--s6 are not in
// globals.css, so use inline hex matching the template.
const EVAL_SCALE: Array<{ n: number; label: string; color: string }> = [
  { n: 0, label: 'Tệ hơn\nrất nhiều', color: 'var(--s0)' },
  { n: 1, label: 'Tệ hơn',            color: 'var(--s1)' },
  { n: 2, label: 'Không\ntiến bộ',    color: 'var(--s2)' },
  { n: 3, label: 'Cải thiện\nnhẹ',    color: 'var(--s3)' },
  { n: 4, label: 'Tiến bộ\nvừa',      color: 'var(--s4)' },
  { n: 5, label: 'Tiến bộ\nnhiều',    color: '#0F5C30' },
  { n: 6, label: 'Rất tiến\nbộ',      color: '#0A4A28' },
]

const thEval: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
  color: 'var(--ink-3)', borderBottom: '2px solid var(--rule)', padding: '5px 8px 6px',
  textAlign: 'left', background: 'var(--rule-2)',
}
const tdEval: CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--rule-2)', verticalAlign: 'middle',
}

interface EvaluationSectionProps {
  targetBlocks: Record<string, unknown>
  notes:        string
  plan:         string
  onNotes:      (v: string) => void
  onPlan:       (v: string) => void
}

export function EvaluationSection({ targetBlocks, notes, plan, onNotes, onPlan }: EvaluationSectionProps) {
  // Per-layer evaluation score (0–6). Presentation-only; not persisted by the hook.
  const [evalScores, setEvalScores] = useState<Record<string, number>>({})

  const evalRows = LAYER_IDS.map(lid => {
    const targets = Object.keys(targetBlocks).filter(k => B2L[k] === lid)
    if (!targets.length) return null
    return { lid, desc: targets.map(k => BN[k] ?? k).join(', ') }
  }).filter(Boolean) as Array<{ lid: string; desc: string }>

  const hasReg = Object.values(evalScores).some(v => v <= 1)
  const [regClass, setRegClass] = useState<'transitional' | 'pathological' | 'noise'>('transitional')
  const [regNote, setRegNote]   = useState('')

  return (
    <Card title="Nhận xét cuối ngày & Đánh giá tiến bộ">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
        1. Đánh giá tiến bộ theo mục tiêu{' '}
        <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 10 }}>
          (Hệ thống sẽ tự động quy đổi điểm và cập nhật % hoàn thành mục tiêu)
        </span>
      </div>

      {/* 0–6 scale header */}
      <div className="eval-scale-header">
        {EVAL_SCALE.map(s => (
          <div key={s.n} className="esh-item" style={{ color: s.color }}>
            {s.n}
            <span>
              {s.label.split('\n').map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thEval, width: 90 }}>Layer / Mục tiêu</th>
            <th style={thEval}>Mô tả mục tiêu</th>
            <th style={thEval}>Mức đánh giá (0–6)</th>
          </tr>
        </thead>
        <tbody>
          {evalRows.map(({ lid, desc }, i) => {
            const last = i === evalRows.length - 1
            const sel  = evalScores[lid]
            return (
              <tr key={lid}>
                <td style={{ ...tdEval, borderBottom: last ? 'none' : tdEval.borderBottom, fontWeight: 600, color: 'var(--navy-2)', fontSize: 11 }}>
                  {LAYER_NAMES[lid]}
                </td>
                <td style={{ ...tdEval, borderBottom: last ? 'none' : tdEval.borderBottom, fontSize: 10.5, color: 'var(--ink-2)' }}>
                  Cải thiện: {desc}
                </td>
                <td style={{ ...tdEval, borderBottom: last ? 'none' : tdEval.borderBottom }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {[0,1,2,3,4,5,6].map(v => {
                      const on = sel === v
                      return (
                        <div
                          key={v}
                          onClick={() => setEvalScores(p => ({ ...p, [lid]: v }))}
                          style={{
                            flex: 1, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${on ? 'var(--navy)' : 'var(--rule)'}`, marginRight: v === 6 ? 0 : -1,
                            cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
                            color: on ? '#fff' : 'var(--ink-3)', background: on ? 'var(--navy)' : 'transparent',
                            borderRadius: on ? 3 : 0, position: 'relative', zIndex: on ? 1 : 0,
                          }}
                        >
                          {v}
                        </div>
                      )
                    })}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Regression warning — visible when any score ≤ 1 */}
      {hasReg && (
        <div style={{ marginTop: 8, padding: '9px 12px', background: '#FDF8EC', border: '1px solid #E8C880', borderRadius: 4, fontSize: 11, color: '#885500' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ Có mục tiêu đang tệ hơn — Phân loại:</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            {([
              { id: 'transitional' as const, label: 'Tạm thời',     on: '#C07010' },
              { id: 'pathological' as const, label: 'Cần điều tra', on: '#B52020' },
              { id: 'noise' as const,        label: 'Nhiễu đo lường', on: '#C07010' },
            ]).map(b => {
              const active = regClass === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setRegClass(b.id)}
                  style={{
                    padding: '3px 10px', borderRadius: 3,
                    border: `1.5px solid ${b.id === 'pathological' ? '#F0CACA' : '#E8C880'}`,
                    background: active ? b.on : 'transparent',
                    color: active ? '#fff' : (b.id === 'pathological' ? '#B52020' : '#C07010'),
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {b.label}
                </button>
              )
            })}
          </div>
          <input
            value={regNote}
            onChange={e => setRegNote(e.target.value)}
            placeholder="Lý do lâm sàng (candida die-off, ngủ kém tối qua, sensory overload...)"
            style={{ width: '100%', height: 26, border: '1px solid #E8C880', borderRadius: 3, padding: '0 8px', fontSize: 10, color: '#555', background: 'transparent', outline: 'none' }}
          />
        </div>
      )}

      {/* Notes + plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--navy-2)', marginBottom: 5 }}>
            2. Nhận xét tổng quan
          </div>
          <textarea
            value={notes}
            onChange={e => onNotes(e.target.value)}
            placeholder="Nhập nhận xét..."
            style={{ width: '100%', border: '1px solid var(--rule)', borderRadius: 4, padding: '8px 10px', minHeight: 70, fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'Source Sans 3, sans-serif' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--navy-2)', marginBottom: 5 }}>
            3. Kế hoạch điều chỉnh cho buổi tới
          </div>
          <textarea
            value={plan}
            onChange={e => onPlan(e.target.value)}
            placeholder="Nhập kế hoạch..."
            style={{ width: '100%', border: '1px solid var(--rule)', borderRadius: 4, padding: '8px 10px', minHeight: 70, fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'Source Sans 3, sans-serif' }}
          />
        </div>
      </div>
    </Card>
  )
}

// ── Signature row (template .sig-row) ─────────────────────────────────────

export function SignatureRow({ therapistName }: { therapistName?: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1.5px solid var(--rule)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 20 }}>Therapist ký tên:</div>
        <div style={{ borderBottom: '1px solid var(--ink)' }} />
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{therapistName || '—'}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 20 }}>Phụ huynh xác nhận:</div>
        <div style={{ borderBottom: '1px solid var(--ink)' }} />
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>Họ tên + chữ ký</div>
      </div>
      <div style={{ flex: .6 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 20 }}>Ngày / Giờ kết thúc:</div>
        <div style={{ borderBottom: '1px solid var(--ink)' }} />
      </div>
    </div>
  )
}
