'use client'

// app/confirm/page.tsx — PUBLIC parent-confirmation page (no auth).
// Talks ONLY to the confirm-session Edge Function via a capability token
// (?token=...); never queries Supabase tables directly. UI ported 1:1 from
// ui_parent_confirm_v3.html. Trendline + block progress are computed locally
// with the shared engine (lib/engine) so totals match the rest of the app.

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { runEngineFromBlocks } from '@/lib/engine'

export const dynamic = 'force-dynamic'

// ── Parent-friendly Vietnamese block names ────────────────────────────────
const BN_VI: Record<string, string> = {
  sleep: 'Giấc ngủ', microbiome: 'Hệ vi sinh đường ruột', nutrition: 'Dinh dưỡng', immune: 'Miễn dịch', metabolic: 'Chuyển hoá',
  arousal: 'Mức độ tỉnh táo', reflex_survival: 'Phản xạ sinh tồn', reflex_postural: 'Phản xạ tư thế', reflex_cortical: 'Phản xạ vỏ não', tone: 'Trương lực cơ', ns_stability: 'Ổn định thần kinh',
  vestibular: 'Tiền đình (Thăng bằng)', proprioception: 'Cảm nhận cơ thể', auditory: 'Thính giác', visual: 'Thị giác', tactile: 'Xúc giác', interoception: 'Cảm nhận nội tại', taste_smell: 'Vị giác / Khứu giác',
  motor_planning: 'Lập kế hoạch vận động', gross_motor: 'Vận động thô', fine_motor: 'Vận động tinh', postural_control: 'Kiểm soát tư thế', bilateral_coord: 'Phối hợp hai bên',
  attention: 'Tập trung chú ý', auditory_processing: 'Xử lý thính giác', visual_processing: 'Xử lý thị giác', wm_link: 'Trí nhớ làm việc',
  oral_language: 'Ngôn ngữ nói', word_finding: 'Tìm từ', phonemic_awareness: 'Nhận thức âm vị', auditory_memory: 'Trí nhớ thính giác', visual_memory: 'Trí nhớ thị giác',
  self_control: 'Tự kiểm soát', behavior: 'Hành vi', social_skills: 'Kỹ năng xã hội', daily_living: 'Kỹ năng sống hàng ngày',
  math: 'Toán', writing: 'Viết', reading: 'Đọc',
}
const B2L: Record<string, string> = {
  sleep: 'L0', microbiome: 'L0', nutrition: 'L0', immune: 'L0', metabolic: 'L0',
  arousal: 'L1', reflex_survival: 'L1', reflex_postural: 'L1', reflex_cortical: 'L1', tone: 'L1', ns_stability: 'L1',
  vestibular: 'L2', proprioception: 'L2', auditory: 'L2', visual: 'L2', tactile: 'L2', interoception: 'L2', taste_smell: 'L2',
  motor_planning: 'L3', gross_motor: 'L3', fine_motor: 'L3', postural_control: 'L3', bilateral_coord: 'L3',
  attention: 'L4', auditory_processing: 'L4', visual_processing: 'L4', wm_link: 'L4',
  oral_language: 'L5', word_finding: 'L5', phonemic_awareness: 'L5', auditory_memory: 'L5', visual_memory: 'L5',
  self_control: 'L6', behavior: 'L6', social_skills: 'L6', daily_living: 'L6',
  math: 'L7', writing: 'L7', reading: 'L7',
}
const LC: Record<string, string> = {
  L0: '#8B1A1A', L1: '#A02020', L2: '#B83030', L3: '#C55030', L4: '#C87020', L5: '#4A8A60', L6: '#2A6A9A', L7: '#3A5AAA',
}
const blockColor = (b: string) => LC[B2L[b]] ?? '#6B7280'
const blockName  = (b: string) => BN_VI[b] ?? b

// ── Types (mirror the Edge Function response) ─────────────────────────────
interface Act { block: string; solution_title?: string | null; delta: number; current_after?: unknown }
interface Obs { block: string; note?: string | null; delta?: number | null }
interface LoadResp {
  ok: boolean
  already?: boolean
  error?: string
  child: { name: string; dob: string | null }
  planned_sessions: number
  baseline: { blocks: Record<string, unknown>; total_score: number }
  target: { blocks: Record<string, unknown> }
  this_session: {
    session_index: number; date: string; cooperation_stars: number | null
    notes: string | null; plan_note: string | null
    activities: Act[]; observed_activities: Obs[]
  }
  sessions: Array<{ session_index: number; date: string; activities: Act[]; layer_eval: unknown }>
}

function score(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as { score: number }).score)
  return 0
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
function fmtDM(d: string) { const [y, m, day] = (d || '').split('-'); return day && m ? `${day}/${m}` : (d || '—') }
function ageLabel(dob: string | null): string {
  if (!dob) return ''
  const b = new Date(dob); if (isNaN(b.getTime())) return ''
  const months = Math.max(0, Math.floor((Date.now() - b.getTime()) / 2628000000))
  return `${Math.floor(months / 12)} tuổi`
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase() || '?'
}

const CSS = `
.cf-root{font-family:'Source Sans 3',sans-serif;background:#F4F6F9;color:#111827;min-height:100vh}
.cf-root *,.cf-root *::before,.cf-root *::after{box-sizing:border-box}
.cf-header{background:#0D2240;padding:0 20px;height:52px;display:flex;align-items:center;gap:10px}
.cf-hlogo{font-family:'Libre Baskerville',serif;font-size:14px;font-weight:700;color:#fff}
.cf-hlogo span{color:rgba(255,255,255,.45);font-weight:400;font-size:12px;margin-left:6px}
.cf-hbadge{margin-left:auto;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.5);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:3px 8px;border-radius:3px}
.cf-page{max-width:520px;margin:0 auto;padding:24px 16px 64px}
.cf-child-strip{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.cf-avi{width:44px;height:44px;border-radius:50%;background:#FDF2F0;border:2px solid #F0CACA;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:#B52020;flex-shrink:0}
.cf-child-name{font-family:'Libre Baskerville',serif;font-size:17px;font-weight:700;color:#111827}
.cf-child-meta{font-size:11.5px;color:#6B7280;margin-top:2px}
.cf-card{background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.cf-card-head{background:#0D2240;padding:7px 16px;font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;display:flex;align-items:center;gap:8px}
.cf-card-head-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4)}
.cf-card-body{padding:14px 16px}
.cf-session-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.cf-sm-item{background:#F3F4F6;border:1px solid #E5E7EB;border-radius:6px;padding:6px 12px;display:flex;flex-direction:column;align-items:center;min-width:72px}
.cf-sm-label{font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:2px}
.cf-sm-val{font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:#374151}
.cf-sec-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #E5E7EB}
.cf-block-list{display:flex;flex-direction:column;gap:5px}
.cf-block-row{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#F3F4F6;border-radius:6px;border:1px solid #E5E7EB}
.cf-blk-color{width:3px;height:20px;border-radius:2px;flex-shrink:0}
.cf-blk-name{font-size:12px;font-weight:600;color:#111827}
.cf-blk-solution{font-size:10px;color:#6B7280;margin-top:1px}
.cf-blk-delta{font-size:11px;font-weight:700;font-family:'DM Mono',monospace;white-space:nowrap;margin-left:auto}
.cf-blk-obs-tag{font-size:8.5px;color:#0A6060;background:#EEF8F8;padding:1px 5px;border-radius:2px;margin-left:4px;font-weight:600}
.cf-notes-box{background:#F3F4F6;border:1px solid #E5E7EB;border-radius:6px;padding:10px 12px;font-size:12px;color:#374151;line-height:1.65;font-style:italic}
.cf-progress-card{background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.cf-progress-head{background:linear-gradient(135deg,#0D2240 0%,#1A4A7A 100%);padding:12px 16px}
.cf-progress-head-title{font-family:'Libre Baskerville',serif;font-size:13px;font-weight:700;color:#fff;margin-bottom:2px}
.cf-progress-head-sub{font-size:11px;color:rgba(255,255,255,.55)}
.cf-progress-kpi{display:flex;border-bottom:1px solid #E5E7EB}
.cf-kpi-item{flex:1;padding:12px 14px;text-align:center;border-right:1px solid #E5E7EB}
.cf-kpi-item:last-child{border-right:none}
.cf-kpi-val{font-family:'DM Mono',monospace;font-size:20px;font-weight:700;line-height:1;margin-bottom:3px}
.cf-kpi-label{font-size:10px;color:#6B7280;line-height:1.3}
.cf-chart-wrap{padding:16px 16px 8px;position:relative}
.cf-chart-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin-bottom:10px}
.cf-chart-svg-wrap{position:relative;width:100%;height:120px}
.cf-chart-y-labels{position:absolute;left:0;top:0;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:4px 0}
.cf-chart-y-label{font-family:'DM Mono',monospace;font-size:9px;color:#6B7280;width:20px;text-align:right}
.cf-chart-area{position:absolute;left:26px;right:0;top:0;bottom:0}
.cf-chart-x-labels{display:flex;justify-content:space-between;padding:0 0 0 26px;margin-top:4px}
.cf-chart-x-label{font-size:9px;color:#6B7280;font-family:'DM Mono',monospace}
.cf-block-progress-list{padding:0 16px 16px;display:flex;flex-direction:column;gap:10px}
.cf-bp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.cf-bp-name{font-size:11.5px;font-weight:600;color:#111827;display:flex;align-items:center;gap:6px}
.cf-bp-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.cf-bp-pct{font-size:10px;font-weight:700;font-family:'DM Mono',monospace}
.cf-bp-bar-track{height:6px;background:#E5E7EB;border-radius:3px;position:relative}
.cf-bp-bar-fill{height:100%;border-radius:3px;transition:width .6s ease}
.cf-sparkline-svg{display:block;width:100%;height:24px;margin-top:4px}
.cf-confirm-wrap{background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:20px 18px;box-shadow:0 1px 4px rgba(0,0,0,.04);text-align:center}
.cf-confirm-icon{font-size:32px;margin-bottom:10px}
.cf-confirm-title{font-family:'Libre Baskerville',serif;font-size:18px;font-weight:700;color:#111827;margin-bottom:6px}
.cf-confirm-sub{font-size:12.5px;color:#6B7280;margin-bottom:18px;line-height:1.65;max-width:360px;margin-left:auto;margin-right:auto}
.cf-btn-confirm{display:block;width:100%;max-width:320px;margin:0 auto;height:48px;border:none;border-radius:8px;background:#0D2240;color:#fff;font-family:'Source Sans 3',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s}
.cf-btn-confirm:hover{background:#1A3A6A}
.cf-btn-confirm:disabled{opacity:.5;cursor:not-allowed}
.cf-confirm-legal{font-size:10px;color:#6B7280;margin-top:10px;line-height:1.5}
.cf-state{text-align:center;padding:40px 20px}
.cf-state-icon{font-size:52px;margin-bottom:14px}
.cf-state-title{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;margin-bottom:8px}
.cf-state-sub{font-size:13px;color:#6B7280;line-height:1.6;max-width:320px;margin:0 auto}
`

const FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirm-session`
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

type View = 'loading' | 'main' | 'already' | 'success' | 'error'

function ConfirmInner() {
  const token = useSearchParams().get('token')
  const [view, setView] = useState<View>('loading')
  const [data, setData] = useState<LoadResp | null>(null)
  const [confirming, setConfirming] = useState(false)

  const callFn = useCallback(async (action: 'load' | 'confirm'): Promise<LoadResp | null> => {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ token, action }),
    })
    try { return await res.json() } catch { return null }
  }, [token])

  useEffect(() => {
    if (!token) { setView('error'); return }
    let active = true
    ;(async () => {
      const resp = await callFn('load')
      if (!active) return
      if (!resp || !resp.ok) { setView('error'); return }
      setData(resp)
      setView(resp.already ? 'already' : 'main')
    })()
    return () => { active = false }
  }, [token, callFn])

  async function handleConfirm() {
    setConfirming(true)
    const resp = await callFn('confirm')
    setConfirming(false)
    if (!resp || !resp.ok) { setView('error'); return }
    setView(resp.already ? 'already' : 'success')
  }

  return (
    <div className="cf-root">
      <style>{CSS}</style>
      <header className="cf-header">
        <div className="cf-hlogo">SPEDUMAP <span>/ Xác nhận buổi trị liệu</span></div>
        <div className="cf-hbadge">Phụ huynh</div>
      </header>

      <div className="cf-page">
        {view === 'loading' && (
          <div className="cf-state"><div className="cf-state-sub">Đang tải...</div></div>
        )}

        {view === 'main' && data && <MainView data={data} confirming={confirming} onConfirm={handleConfirm} />}

        {view === 'already' && (
          <div className="cf-state">
            <div className="cf-state-icon">✅</div>
            <div className="cf-state-title">Đã xác nhận trước đó</div>
            <div className="cf-state-sub">Buổi trị liệu này đã được xác nhận. Cảm ơn bạn!</div>
          </div>
        )}

        {view === 'success' && (
          <div className="cf-state">
            <div className="cf-state-icon">🎉</div>
            <div className="cf-state-title" style={{ color: '#1A6A3A' }}>Xác nhận thành công!</div>
            <div className="cf-state-sub">Cảm ơn bạn đã xác nhận buổi trị liệu.<br /><br />Thông tin đã được ghi nhận và sẽ hỗ trợ theo dõi tiến triển của con.</div>
          </div>
        )}

        {view === 'error' && (
          <div className="cf-state">
            <div className="cf-state-icon">⚠️</div>
            <div className="cf-state-title" style={{ color: '#B52020' }}>Link không hợp lệ</div>
            <div className="cf-state-sub">Vui lòng liên hệ therapist để được hỗ trợ.</div>
          </div>
        )}
      </div>
    </div>
  )
}

function MainView({ data, confirming, onConfirm }: { data: LoadResp; confirming: boolean; onConfirm: () => void }) {
  const s = data.this_session
  const baselineBlocks = data.baseline.blocks || {}
  const targetBlocks   = data.target.blocks || {}
  const hasBlocks = Object.keys(baselineBlocks).length > 0

  const baseTotal   = hasBlocks ? runEngineFromBlocks(baselineBlocks).total : data.baseline.total_score
  const targetTotal = Object.keys(targetBlocks).length
    ? runEngineFromBlocks({ ...baselineBlocks, ...targetBlocks }).total
    : baseTotal

  // Cumulative engine total per session → trendline
  const sorted = [...data.sessions].sort((a, b) => a.session_index - b.session_index)
  const cumulative: Record<string, number> = {}
  for (const [k, v] of Object.entries(baselineBlocks)) cumulative[k] = score(v)
  const trend = sorted.map(sess => {
    for (const a of sess.activities) if (a.block) cumulative[a.block] = score(a.current_after)
    return { s: sess.session_index, total: runEngineFromBlocks(cumulative).total }
  })
  const currentTotal = trend.length ? trend[trend.length - 1].total : baseTotal
  const pointsGained = currentTotal - baseTotal
  const pctTarget = targetTotal > baseTotal ? clamp(Math.round((currentTotal - baseTotal) / (targetTotal - baseTotal) * 100), 0, 100) : 100

  // Per-target-block progress + history
  const blockProg = Object.keys(targetBlocks).map(block => {
    const base = score(baselineBlocks[block])
    const tgt  = score(targetBlocks[block])
    let cur = base
    const history: number[] = []
    for (const sess of sorted) {
      const act = sess.activities.find(a => a.block === block)
      if (act) cur = score(act.current_after)
      history.push(cur)
    }
    if (!history.length) history.push(base)
    const current = history[history.length - 1]
    const range = tgt - base
    const pct = range > 0 ? clamp(Math.round((current - base) / range * 100), 0, 100) : 100
    return { block, base, tgt, current, history, pct }
  })

  const stars = s.cooperation_stars && s.cooperation_stars > 0 ? '★'.repeat(s.cooperation_stars) : '—'

  return (
    <>
      {/* Child strip */}
      <div className="cf-child-strip">
        <div className="cf-avi">{initials(data.child.name)}</div>
        <div>
          <div className="cf-child-name">{data.child.name || 'Học viên'}</div>
          <div className="cf-child-meta">
            {[ageLabel(data.child.dob), `Buổi số #${s.session_index}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      {/* Session info */}
      <div className="cf-card">
        <div className="cf-card-head"><div className="cf-card-head-dot" />Thông tin buổi hôm nay</div>
        <div className="cf-card-body">
          <div className="cf-session-meta">
            <div className="cf-sm-item"><div className="cf-sm-label">Ngày</div><div className="cf-sm-val">{fmtDM(s.date)}</div></div>
            <div className="cf-sm-item"><div className="cf-sm-label">Buổi số</div><div className="cf-sm-val">#{s.session_index}</div></div>
            <div className="cf-sm-item"><div className="cf-sm-label">Hoạt động</div><div className="cf-sm-val">{s.activities.length} blocks</div></div>
            <div className="cf-sm-item"><div className="cf-sm-label">Hợp tác</div><div className="cf-sm-val">{stars}</div></div>
          </div>

          <div className="cf-sec-label">Các bài tập trong buổi</div>
          <div className="cf-block-list">
            {s.activities.map((a, i) => (
              <div className="cf-block-row" key={`a${i}`}>
                <div className="cf-blk-color" style={{ background: blockColor(a.block) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cf-blk-name">{blockName(a.block)}</div>
                  {a.solution_title && <div className="cf-blk-solution">{a.solution_title}</div>}
                </div>
                <DeltaTag delta={a.delta} />
              </div>
            ))}
            {s.observed_activities.map((o, i) => (
              <div className="cf-block-row" key={`o${i}`}>
                <div className="cf-blk-color" style={{ background: blockColor(o.block) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="cf-blk-name">{blockName(o.block)}</div>
                    <span className="cf-blk-obs-tag">Quan sát</span>
                  </div>
                  {o.note && <div className="cf-blk-solution">{o.note}</div>}
                </div>
                {typeof o.delta === 'number' && <DeltaTag delta={o.delta} />}
              </div>
            ))}
          </div>

          {(s.notes || s.plan_note) && (
            <>
              <div className="cf-sec-label" style={{ marginTop: 14 }}>Nhận xét của chuyên viên</div>
              <div className="cf-notes-box">
                {s.notes}
                {s.plan_note && (
                  <><br /><br /><strong style={{ fontStyle: 'normal', fontSize: 11, color: '#374151' }}>Kế hoạch buổi tới:</strong> {s.plan_note}</>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div className="cf-progress-card">
        <div className="cf-progress-head">
          <div className="cf-progress-head-title">Hành trình tiến bộ của con</div>
          <div className="cf-progress-head-sub">Theo dõi qua {sorted.length} buổi trị liệu</div>
        </div>

        <div className="cf-progress-kpi">
          <div className="cf-kpi-item">
            <div className="cf-kpi-val" style={{ color: '#1A6A3A' }}>{pointsGained >= 0 ? '+' : ''}{pointsGained.toFixed(1)}</div>
            <div className="cf-kpi-label">Điểm tăng<br />từ đầu chu kỳ</div>
          </div>
          <div className="cf-kpi-item">
            <div className="cf-kpi-val" style={{ color: '#0D2240' }}>{sorted.length}</div>
            <div className="cf-kpi-label">Buổi đã<br />hoàn thành</div>
          </div>
          <div className="cf-kpi-item">
            <div className="cf-kpi-val" style={{ color: '#8A6200' }}>{pctTarget}%</div>
            <div className="cf-kpi-label">Đạt mục tiêu<br />chu kỳ</div>
          </div>
        </div>

        <Trendline trend={trend} baseTotal={baseTotal} targetTotal={targetTotal} />

        {blockProg.length > 0 && (
          <div className="cf-block-progress-list">
            {blockProg.map(bp => {
              const color = bp.pct >= 80 ? '#1A6A3A' : bp.pct >= 50 ? '#8A6200' : '#A02020'
              return (
                <div key={bp.block}>
                  <div className="cf-bp-header">
                    <div className="cf-bp-name"><div className="cf-bp-dot" style={{ background: blockColor(bp.block) }} />{blockName(bp.block)}</div>
                    <div className="cf-bp-pct" style={{ color }}>{bp.pct}% mục tiêu</div>
                  </div>
                  <div className="cf-bp-bar-track"><div className="cf-bp-bar-fill" style={{ width: `${bp.pct}%`, background: color }} /></div>
                  <Sparkline history={bp.history} baseline={bp.base} target={bp.tgt} color={blockColor(bp.block)} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm */}
      <div className="cf-confirm-wrap">
        <div className="cf-confirm-icon">📋</div>
        <div className="cf-confirm-title">Xác nhận thông tin</div>
        <div className="cf-confirm-sub">Bằng cách bấm xác nhận, bạn xác nhận rằng con đã tham gia buổi trị liệu này và thông tin trên là chính xác.</div>
        <button className="cf-btn-confirm" onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Đang xác nhận...' : '✓ Xác nhận buổi trị liệu'}
        </button>
        <div className="cf-confirm-legal">Thông tin xác nhận sẽ được lưu trữ bảo mật và hỗ trợ theo dõi tiến triển của con.</div>
      </div>
    </>
  )
}

function DeltaTag({ delta }: { delta: number }) {
  if (delta > 0) return <div className="cf-blk-delta" style={{ color: '#1A6A3A' }}>+{delta.toFixed(2)} ↑</div>
  if (delta < 0) return <div className="cf-blk-delta" style={{ color: '#B52020' }}>{delta.toFixed(2)} ↓</div>
  return <div className="cf-blk-delta" style={{ color: '#6B7280' }}>→ Giữ nguyên</div>
}

function Trendline({ trend, baseTotal, targetTotal }: { trend: Array<{ s: number; total: number }>; baseTotal: number; targetTotal: number }) {
  const W = 400, H = 112
  const totals = trend.map(t => t.total)
  const lo = Math.min(baseTotal, targetTotal, ...(totals.length ? totals : [baseTotal]))
  const hi = Math.max(baseTotal, targetTotal, ...(totals.length ? totals : [targetTotal]))
  const minV = Math.floor(lo) - 1
  let maxV = Math.ceil(hi) + 1
  if (maxV <= minV) maxV = minV + 1
  const range = maxV - minV
  const denom = Math.max(1, trend.length - 1)
  const pts = trend.map((t, i) => ({ x: (i / denom) * W, y: H - ((t.total - minV) / range) * H }))
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ')
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z` : ''
  const targetY = H - ((targetTotal - minV) / range) * H
  const yLabels = [maxV, maxV - range / 3, maxV - 2 * range / 3, minV].map(v => Math.round(v))

  return (
    <div className="cf-chart-wrap">
      <div className="cf-chart-title">Tổng điểm qua các buổi</div>
      <div className="cf-chart-svg-wrap">
        <div className="cf-chart-y-labels">
          {yLabels.map((v, i) => <span className="cf-chart-y-label" key={i}>{v}</span>)}
        </div>
        <div className="cf-chart-area">
          <svg width="100%" height="100%" viewBox="0 0 400 112" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="cfAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A6A3A" stopOpacity=".15" />
                <stop offset="100%" stopColor="#1A6A3A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="0" x2="400" y2="0" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="37" x2="400" y2="37" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="75" x2="400" y2="75" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="112" x2="400" y2="112" stroke="#E5E7EB" strokeWidth="1" />
            {targetY >= 0 && targetY <= H && (
              <>
                <line x1="0" y1={targetY} x2="400" y2={targetY} stroke="#8A6200" strokeWidth="1" strokeDasharray="4,3" opacity=".6" />
                <text x="402" y={targetY + 3} fontSize="9" fill="#8A6200" fontFamily="DM Mono">Mục tiêu</text>
              </>
            )}
            {area && <path d={area} fill="url(#cfAreaGrad)" />}
            {line && <path d={line} fill="none" stroke="#1A6A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3}
                fill={i === pts.length - 1 ? '#1A6A3A' : '#fff'} stroke="#1A6A3A" strokeWidth={i === pts.length - 1 ? 2.5 : 1.5} />
            ))}
          </svg>
        </div>
      </div>
      <div className="cf-chart-x-labels">
        {trend.map((t, i) => (
          <span className="cf-chart-x-label" key={i}>
            {(i === 0 || i === trend.length - 1 || (i + 1) % 3 === 0) ? `B${t.s}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function Sparkline({ history, baseline, target, color }: { history: number[]; baseline: number; target: number; color: string }) {
  const W = 200, H = 24
  const minV = Math.min(baseline, ...history) - 0.1
  const maxV = Math.max(target, ...history) + 0.1
  const range = maxV - minV || 1
  const denom = Math.max(1, history.length - 1)
  const pts = history.map((v, i) => ({ x: (i / denom) * W, y: H - ((v - minV) / range) * H }))
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ')
  const ty = H - ((target - minV) / range) * H
  const last = pts[pts.length - 1]
  return (
    <svg className="cf-sparkline-svg" viewBox="0 0 200 24" preserveAspectRatio="none">
      <line x1="0" y1={ty} x2={W} y2={ty} stroke="#8A6200" strokeWidth="1" strokeDasharray="3,2" opacity=".5" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
      {last && <circle cx={last.x} cy={last.y} r="2.5" fill={color} stroke="#fff" strokeWidth="1" />}
    </svg>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="cf-root"><div className="cf-page"><div className="cf-state"><div className="cf-state-sub">Đang tải...</div></div></div></div>}>
      <ConfirmInner />
    </Suspense>
  )
}
