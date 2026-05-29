'use client'

// app/therapist/close-summary/page.tsx
// Cycle close summary — faithful port of ui_close_summary.html (SPEDUMAX
// palette) rendered from live Supabase data. Three-dimensional comparison:
// Baseline → Target → Retest. "Mở Cycle mới" pre-seeds the retest blocks as
// the next baseline and routes to /therapist/baseline.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { can } from '@/lib/permissions'
import {
  runEngine, getScore,
  computeLayerComparison, computeVerdictBanner, computeSignalShift,
  THRESHOLD,
  type LayerComparison, type VerdictBanner, type SignalShift,
} from '@/lib/engine'
import { LS_KEYS } from '@/types/spedumap'

export const dynamic = 'force-dynamic'

// ── SPEDUMAX palette (per-page design language) ──
const C = {
  navy: '#0D2240', navy2: '#1A3558', green: '#2D5016', green2: '#3A6B1E', greenLight: '#EBF2E4',
  teal: '#1A6A7A', tealBg: '#EAF4F6', red: '#C94545', redBg: '#FDF0F0', redBd: '#E8BABA',
  warmWhite: '#FAFAF8', ink: '#1A1A1A', ink2: '#3A3A3A', ink3: '#7A7A78', paper: '#F5F4F1',
  rule: '#E0DED9', rule2: '#F0EEE9', gold: '#B07820', goldBg: '#FBF5E8', goldBd: '#DECA96',
}

const REASON_PILL: Record<string, { label: string; bg: string; color: string }> = {
  completed:      { label: '✓ Completed',      bg: C.greenLight, color: C.green },
  early_complete: { label: '✓ Early Complete',  bg: C.tealBg,     color: C.teal },
  incident:       { label: '⚠ Incident',        bg: C.redBg,      color: C.red },
  timeout:        { label: '⏱ Timeout',         bg: C.goldBg,     color: C.gold },
}

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function ageString(dob?: string | null): string {
  if (!dob) return ''
  const b = new Date(dob), n = new Date()
  if (isNaN(b.getTime())) return ''
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
  if (n.getDate() < b.getDate()) months--
  if (months < 0) months = 0
  return `${Math.floor(months / 12)} tuổi ${months % 12} tháng`
}
const toNum = (blocks: Record<string, unknown> = {}): Record<string, number> =>
  Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, getScore(v)]))
const signed1 = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(1)
const signed2 = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2)

interface CycleRow {
  id: string
  child_id: string
  status: string
  close_reason: string | null
  close_note: string | null
  close_summary: string | null
  baseline: { blocks?: Record<string, unknown>; total_score?: number; stage?: string } | null
  target: { blocks?: Record<string, unknown> } | null
  retest_baseline: { blocks?: Record<string, unknown> } | null
  started_at: string | null
  ended_at: string | null
}

// useSearchParams() must be read inside a Suspense boundary (Next.js App Router).
export default function CloseSummaryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>}>
      <CloseSummaryInner />
    </Suspense>
  )
}

function CloseSummaryInner() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const searchParams = useSearchParams()
  const cycleId = searchParams.get('cycle_id')   // string | null (resolved synchronously)

  const [cycle, setCycle] = useState<CycleRow | null>(null)
  const [child, setChild] = useState<{ name: string; dob: string | null } | null>(null)
  const [sessionCount, setSessionCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Permission gate: close-summary belongs to the cycle-close flow (Head+).
  const { role, roleLoading } = useRole()
  useEffect(() => {
    if (!roleLoading && !can(role, 'close_cycle')) router.replace('/therapist/baseline')
  }, [roleLoading, role, router])

  useEffect(() => {
    // cycleId from useSearchParams() is resolved synchronously — null/empty means
    // the param is genuinely absent, so fail fast (never infinite-load).
    if (!cycleId) { setLoadError('Thiếu mã chu kỳ (cycle_id) trong URL'); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const { data: cyc, error: cErr } = await supabase
          .from('cycles')
          .select('id, child_id, status, close_reason, close_note, close_summary, baseline, target, retest_baseline, started_at, ended_at')
          .eq('id', cycleId)
          .single()
        if (cErr || !cyc) throw new Error('Không tìm thấy chu kỳ')
        if (!cyc.retest_baseline) throw new Error('Chu kỳ này chưa có dữ liệu retest. Hãy hoàn tất Retest trước.')

        const { data: ch } = await supabase
          .from('children').select('name, dob').eq('id', cyc.child_id).single()
        const { count } = await supabase
          .from('daily_sessions').select('id', { count: 'exact', head: true }).eq('cycle_id', cycleId)

        if (!cancelled) {
          setCycle(cyc as CycleRow)
          setChild(ch ? { name: ch.name ?? '', dob: ch.dob } : { name: '', dob: null })
          setSessionCount(count ?? 0)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) { setLoadError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu'); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [cycleId, supabase])

  function openNewCycle() {
    if (!cycle?.retest_baseline?.blocks || !child) return
    const seed = {
      child_id: cycle.child_id,        // carry the existing child → next cycle reuses it
      child:  { name: child.name, dob: child.dob ?? '' },
      blocks: cycle.retest_baseline.blocks,
    }
    localStorage.setItem(LS_KEYS.RETEST_SEED, JSON.stringify(seed))
    router.push('/therapist/baseline')
  }

  if (loading) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải tổng kết chu kỳ...</div>
  if (loadError || !cycle) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center p-6 max-w-sm">
        <div className="text-[var(--red)] font-semibold mb-2">{loadError || 'Không có dữ liệu'}</div>
        <button onClick={() => router.push('/therapist/report')}
          className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm mt-3">Về Report →</button>
      </div>
    </div>
  )

  // ── Compute (single source of truth: lib/engine) ──
  const baselineBlocks = toNum(cycle.baseline?.blocks)
  const targetBlocks   = toNum(cycle.target?.blocks)
  const retestBlocks   = toNum(cycle.retest_baseline?.blocks)
  const targetMerged   = { ...baselineBlocks, ...targetBlocks }

  const baseEng = runEngine(baselineBlocks)
  const tgtEng  = runEngine(targetMerged)
  const reEng   = runEngine(retestBlocks)
  const baselineTotal = baseEng.total, targetTotal = tgtEng.total, retestTotal = reEng.total

  const verdict: VerdictBanner   = computeVerdictBanner(baselineTotal, retestTotal, targetTotal)
  const layers:  LayerComparison[] = computeLayerComparison(baselineBlocks, retestBlocks, targetBlocks)
  const signals: SignalShift     = computeSignalShift(baselineBlocks, retestBlocks)

  const retestWorse = retestTotal < baselineTotal
  const reason = cycle.close_reason ? REASON_PILL[cycle.close_reason] : null

  // Verdict banner copy
  const vIcon  = verdict.type === 'improved' ? '📈' : verdict.type === 'regressed' ? '📉' : '➡️'
  const vTitle = verdict.type === 'improved'
    ? `Tiến bộ rõ rệt — Đạt ${verdict.pctTargetAchieved}% mục tiêu chu kỳ`
    : verdict.type === 'regressed'
      ? 'Cần xem xét — Điểm số giảm so với baseline'
      : `Ổn định — Đạt ${verdict.pctTargetAchieved}% mục tiêu chu kỳ`
  const vBg = verdict.type === 'improved' ? C.greenLight : verdict.type === 'regressed' ? C.redBg : C.goldBg
  const vBd = verdict.type === 'improved' ? '#B8D4A0' : verdict.type === 'regressed' ? C.redBd : C.goldBd
  const vSub = `Điểm Retest ${signed1(verdict.deltaFromBaseline)} so với Baseline · Stage ${baseEng.stage} → ${reEng.stage} · ${signed1(verdict.deltaFromTarget)} so với Target`

  // Next-steps (data-driven)
  const sigNames: Record<string, string> = { sensorimotor: 'Sensorimotor', regulation: 'Regulation', cognitive: 'Cognitive' }
  const sigChanges = (['sensorimotor', 'regulation', 'cognitive'] as const).map(k => ({ k, change: signals[k].new - signals[k].old }))
  const bestSig = sigChanges.reduce((a, b) => (b.change < a.change ? b : a))
  const belowTarget = layers.filter(l => l.retest < l.target - 0.001)
  const lowestLayer = layers.reduce((a, b) => (b.pctComplete < a.pctComplete ? b : a))

  const sigBarDefs = [
    { k: 'sensorimotor' as const, label: 'Deficit Signal 1', name: 'Sensorimotor', barColor: C.teal },
    { k: 'regulation' as const,   label: 'Deficit Signal 2', name: 'Regulation',   barColor: C.green },
    { k: 'cognitive' as const,    label: 'Deficit Signal 3', name: 'Cognitive',    barColor: C.gold },
  ]
  const sigW = (v: number) => Math.min(100, Math.round((v / THRESHOLD) * 100))

  const eyebrowCss: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.ink3 }
  const therapistNote = cycle.close_summary?.trim() || cycle.close_note?.trim() || ''

  return (
    <div style={{ background: C.warmWhite, color: C.ink, fontFamily: "'Source Sans 3', sans-serif", minHeight: '100vh' }}>

      {/* NAV BAR */}
      <nav style={{ height: 48, background: C.navy, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 40 }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>SPEDUMAP</span>
        <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 16 }}>/</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>Cycle Close Summary</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 12, background: C.green, color: '#fff' }}>Cycle Closed</span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* PAGE HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.teal, marginBottom: 6 }}>Nghiệm thu chu kỳ can thiệp</div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, fontWeight: 700, color: C.navy, lineHeight: 1.2, marginBottom: 6 }}>
              Kết quả Chu kỳ Can thiệp
            </div>
            <div style={{ fontSize: 13, color: C.ink3 }}>So sánh 3 chiều: Baseline ban đầu · Mục tiêu · Retest kết thúc</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, color: C.navy }}>{child?.name || '—'}</div>
            <div style={{ fontSize: 11, color: C.ink3, textAlign: 'right' }}>
              {ageString(child?.dob)} · ID: {cycle.child_id.slice(0, 8)}<br />
              Chu kỳ: {fmtDate(cycle.started_at)} → {fmtDate(cycle.ended_at)} · {sessionCount} sessions<br />
              {reason && (
                <span style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 600, background: reason.bg, color: reason.color }}>
                  {reason.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* VERDICT BANNER */}
        <div style={{ borderRadius: 10, padding: '16px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, background: vBg, border: `1.5px solid ${vBd}` }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>{vIcon}</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: C.ink3, marginBottom: 2 }}>Kết quả tổng thể</div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, fontWeight: 700, color: C.navy }}>{vTitle}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{vSub}</div>
          </div>
        </div>

        {/* THREE-COLUMN SCORE COMPARISON */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', marginBottom: 28, border: `1px solid ${C.rule}`, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          {/* Baseline */}
          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: C.paper }}>
            <div style={eyebrowCss}>Baseline ban đầu</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1, margin: '8px 0 4px', color: C.navy }}>{baselineTotal.toFixed(1)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink2 }}>/ 100 điểm</div>
            <div style={{ fontSize: 10, color: C.ink3 }}>{fmtDate(cycle.started_at)}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: 'rgba(13,34,64,.1)', color: C.navy }}>Stage {baseEng.stage}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, background: '#fff', borderLeft: `1px solid ${C.rule}`, borderRight: `1px solid ${C.rule}` }}><span style={{ fontSize: 18, color: C.ink3 }}>→</span></div>
          {/* Target */}
          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: C.goldBg }}>
            <div style={eyebrowCss}>Mục tiêu đặt ra</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1, margin: '8px 0 4px', color: C.gold }}>{targetTotal.toFixed(1)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink2 }}>/ 100 điểm</div>
            <div style={{ fontSize: 10, color: C.ink3 }}>Delta kỳ vọng {signed1(targetTotal - baselineTotal)}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: 'rgba(176,120,32,.15)', color: C.gold }}>Target Stage {tgtEng.stage}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '4px 12px', borderRadius: 14, fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, background: 'rgba(176,120,32,.12)', color: C.gold }}>{signed1(targetTotal - baselineTotal)} kỳ vọng</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, background: '#fff', borderLeft: `1px solid ${C.rule}`, borderRight: `1px solid ${C.rule}` }}><span style={{ fontSize: 18, color: C.ink3 }}>→</span></div>
          {/* Retest */}
          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: retestWorse ? C.redBg : C.greenLight }}>
            <div style={eyebrowCss}>Retest kết thúc cycle</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1, margin: '8px 0 4px', color: retestWorse ? C.red : C.green }}>{retestTotal.toFixed(1)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink2 }}>/ 100 điểm</div>
            <div style={{ fontSize: 10, color: C.ink3 }}>{fmtDate(cycle.ended_at)} · Blind assessment</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: retestWorse ? C.redBg : 'rgba(45,80,22,.12)', color: retestWorse ? C.red : C.green }}>Stage {reEng.stage}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '4px 12px', borderRadius: 14, fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, background: verdict.deltaFromBaseline >= 0 ? 'rgba(45,80,22,.12)' : C.redBg, color: verdict.deltaFromBaseline >= 0 ? C.green : C.red }}>{signed1(verdict.deltaFromBaseline)} vs Baseline</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '4px 12px', borderRadius: 14, fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, background: 'rgba(176,120,32,.12)', color: C.gold }}>{signed1(verdict.deltaFromTarget)} vs Target</div>
          </div>
        </div>

        {/* LAYER COMPARISON */}
        <SectionHead num={1} title="So sánh theo tầng phát triển" C={C} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#fff', border: `1px solid ${C.rule}`, borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr>
              {['Tầng'].map(h => <th key={h} style={thStyle(C, false)}>{h}</th>)}
              {['Baseline', 'Target', 'Retest', 'Δ vs Baseline', '% Hoàn thành'].map(h => <th key={h} style={thStyle(C, true)}>{h}</th>)}
              <th style={{ ...thStyle(C, false), minWidth: 140 }}>Tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {layers.map(l => {
              const deltaClass = l.delta > 0.01 ? C.green : l.delta < -0.01 ? C.red : C.ink3
              const baselinePct = Math.round((l.baseline / 4) * 100)
              const retestPct   = Math.round((l.retest / 4) * 100)
              const barColor    = l.delta >= 0 ? C.green : C.red
              const pctColor    = l.pctComplete >= 100 ? C.green : l.pctComplete >= 50 ? C.gold : C.red
              const pctLabel    = l.pctComplete >= 100 ? `✓ ${l.pctComplete}%` : `${l.pctComplete}%`
              return (
                <tr key={l.lid}>
                  <td style={tdStyle(C)}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 7, verticalAlign: 'middle', background: l.color }} />
                    <span style={{ fontWeight: 600, color: C.ink }}>{l.name}</span>
                  </td>
                  <td style={monoTd(C)}>{l.baseline.toFixed(2)}</td>
                  <td style={{ ...monoTd(C), color: C.gold }}>{l.target.toFixed(2)}</td>
                  <td style={monoTd(C)}>{l.retest.toFixed(2)}</td>
                  <td style={{ ...monoTd(C), color: deltaClass, fontWeight: 700 }}>{signed2(l.delta)}</td>
                  <td style={{ ...monoTd(C), color: pctColor, fontWeight: 700 }}>{pctLabel}</td>
                  <td style={tdStyle(C)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
                      <div style={{ flex: 1, height: 6, background: C.rule, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 3, background: C.navy, opacity: .25, width: `${baselinePct}%` }} />
                        <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 3, width: `${retestPct}%`, background: barColor }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, width: 32, textAlign: 'right', color: barColor }}>{retestPct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* SIGNAL SHIFT */}
        <SectionHead num={2} title="Thay đổi Deficit Signals" C={C} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {sigBarDefs.map(def => {
            const s = signals[def.k]
            const change = s.new - s.old
            const dir = s.direction
            const dirStyle = dir === 'improved'
              ? { bg: C.greenLight, color: C.green, arrow: '↓', word: 'Cải thiện' }
              : dir === 'worsened'
                ? { bg: C.redBg, color: C.red, arrow: '↑', word: 'Xấu đi' }
                : { bg: C.rule2, color: C.ink3, arrow: '→', word: 'Ổn định' }
            return (
              <div key={def.k} style={{ background: '#fff', border: `1px solid ${C.rule}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: C.ink3, marginBottom: 4 }}>{def.label}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 10 }}>{def.name}</div>
                <div style={sigRow(C)}><span>Baseline</span><span style={sigVal(C)}>{s.old.toFixed(2)}</span></div>
                <div style={sigRow(C)}><span>Retest</span><span style={sigVal(C)}>{s.new.toFixed(2)}</span></div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 5, background: C.rule, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, height: '100%', background: C.navy, opacity: .3, borderRadius: 3, width: `${sigW(s.old)}%` }} />
                    <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 3, width: `${sigW(s.new)}%`, background: def.barColor }} />
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: dirStyle.bg, color: dirStyle.color }}>
                  {dirStyle.arrow} {dirStyle.word} {signed2(change)}
                </div>
              </div>
            )
          })}
        </div>

        {/* NEXT STEPS */}
        <SectionHead num={3} title="Hướng dẫn cho Cycle tiếp theo" C={C} />
        <div style={{ background: C.navy, borderRadius: 10, padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          <NextStep eyebrow="New Baseline" title="Retest → Baseline Cycle mới"
            body={`Điểm Retest ${retestTotal.toFixed(1)}, Stage ${reEng.stage} sẽ được dùng làm Baseline cho cycle tiếp theo.`} />
          <NextStep eyebrow="Ưu tiên can thiệp" title={`Tập trung ${sigNames[bestSig.k]}`}
            body={`${sigNames[bestSig.k]} thay đổi mạnh nhất (${signed2(bestSig.change)}). ${belowTarget.length ? 'Chưa đạt target: ' + belowTarget.map(l => l.lid).join(', ') + '.' : 'Tất cả tầng đạt hoặc vượt target.'}`} />
          <NextStep eyebrow="Lưu ý lâm sàng" title={`${lowestLayer.name} cần theo dõi`}
            body={`Tiến độ thấp nhất (${lowestLayer.pctComplete}% mục tiêu). Therapist cần review hoạt động tầng này trong goal setting mới.`} />
        </div>

        {/* THERAPIST NOTE */}
        {therapistNote && (
          <>
            <div style={{ height: 1, background: C.rule, margin: '24px 0' }} />
            <div style={{ padding: '0 4px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: C.ink3, marginBottom: 6 }}>Nhận xét tổng kết của Therapist</div>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7, fontStyle: 'italic', borderLeft: `3px solid ${C.teal}`, paddingLeft: 12 }}>
                {therapistNote}
              </div>
              <div style={{ fontSize: 10, color: C.ink3, marginTop: 6 }}>— Therapist · {fmtDate(cycle.ended_at)}</div>
            </div>
          </>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.rule}` }} className="no-print">
          <button onClick={() => window.print()} style={btnStyle({ bg: 'transparent', color: C.navy, border: `1.5px solid ${C.rule}` })}>🖨 In báo cáo</button>
          <button onClick={() => window.print()} style={btnStyle({ bg: C.navy, color: '#fff' })}>↓ Xuất PDF</button>
          <button onClick={openNewCycle} style={btnStyle({ bg: C.green, color: '#fff' })}>→ Mở Cycle mới với Baseline này</button>
        </div>

      </div>
    </div>
  )
}

// ── Small presentational helpers ──
function SectionHead({ num, title, C }: { num: number; title: string; C: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 28 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.navy, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{num}</div>
      <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 14, fontWeight: 700, color: C.navy }}>{title}</div>
    </div>
  )
}
function NextStep({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 4 }}>{eyebrow}</div>
      <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.65)', lineHeight: 1.5 }}>{body}</div>
    </div>
  )
}
const thStyle = (C: Record<string, string>, right: boolean): React.CSSProperties => ({
  fontSize: 9, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: C.ink3,
  background: C.rule2, padding: '8px 12px', textAlign: right ? 'right' : 'left', borderBottom: `2px solid ${C.rule}`,
})
const tdStyle = (C: Record<string, string>): React.CSSProperties => ({ padding: '9px 12px', borderBottom: `1px solid ${C.rule2}`, verticalAlign: 'middle' })
const monoTd = (C: Record<string, string>): React.CSSProperties => ({ ...tdStyle(C), fontFamily: "'DM Mono', monospace", fontSize: 11, textAlign: 'right' })
const sigRow = (C: Record<string, string>): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, fontSize: 10, color: C.ink3 })
const sigVal = (C: Record<string, string>): React.CSSProperties => ({ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: C.ink })
const btnStyle = ({ bg, color, border }: { bg: string; color: string; border?: string }): React.CSSProperties => ({
  height: 40, padding: '0 20px', borderRadius: 6, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', border: border ?? 'none', background: bg, color,
})
