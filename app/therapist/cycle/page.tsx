'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCycle } from '@/hooks/useCycle'
import { createClient } from '@/lib/supabase/client'
import { LS_KEYS } from '@/types/spedumap'
import { SignalStrip, BaselineReadonly, TargetReadonly } from '@/components/charts/CycleComponents'
import { LogoSVG } from '@/components/LogoSVG'
import LayerProgressionChart from '@/components/charts/LayerProgressionChart'
import { getLayerProgressionByCycle, getLatestAssessment } from '@/lib/supabase/migrations'

export const dynamic = 'force-dynamic'

const SERIF = "'Libre Baskerville', serif"
const BODY  = "'Source Sans 3', sans-serif"
const MONO  = "'DM Mono', monospace"

export default function CyclePage() {
  const router   = useRouter()
  const supabase = createClient()
  const {
    data, form, loadError, isOpened, saving, saveError,
    setFormField, buildActiveCycle,
    setSaving, setSaveError, setIsOpened,
  } = useCycle()

  const [layerProgressions, setLayerProgressions] = useState<unknown[]>([])
  const [currentLayer, setCurrentLayer] = useState<number>(2)
  const [targetLayer] = useState<number>(4)

  // Load layer progressions + assessment layer when cycle opens
  useEffect(() => {
    if (isOpened && data?.supabase_cycle_id && data?.child?.id) {
      getLayerProgressionByCycle(supabase, data.supabase_cycle_id)
        .then(setLayerProgressions)
        .catch(err => console.error('Failed to load progressions:', err))

      getLatestAssessment(supabase, data.child.id)
        .then(assessment => {
          if (assessment) setCurrentLayer(assessment.assigned_layer)
        })
        .catch(err => console.error('Failed to load assessment:', err))
    }
  }, [isOpened, data?.supabase_cycle_id, data?.child?.id, supabase])

  async function handleOpen() {
    if (!data) return
    setSaving(true)
    setSaveError(null)
    try {
      const activeCycle = buildActiveCycle()
      if (!activeCycle) throw new Error('Không có data')

      // Supabase sync TRƯỚC lsSet — tránh race condition
      const cycleId = data.supabase_cycle_id
      if (cycleId) {
        try {
          const { error } = await supabase.from('cycles').update({
            status:     'active',
            started_at: form.startDate,
            governance_meta: activeCycle.governance_meta,
          }).eq('id', cycleId)
          if (error) throw error
          activeCycle.supabase_cycle_id = cycleId
        } catch (err) {
          console.warn('Supabase update failed (offline mode):', err)
          activeCycle.supabase_cycle_id = cycleId
        }
      }

      // lsSet sau khi supabase_cycle_id đã set
      localStorage.setItem(LS_KEYS.ACTIVE_CYCLE, JSON.stringify(activeCycle))
      const updated = { ...data, cycle_name: form.cycleName, cycle_id: activeCycle.cycle_id }
      localStorage.setItem(LS_KEYS.CYCLE, JSON.stringify(updated))

      setIsOpened(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setSaving(false)
    }
  }

  // ── Slim navy header with logo + step wizard ──────────────────
  const Header = (
    <header
      className="no-print"
      style={{
        background: 'var(--navy)', padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoSVG size={24} />
        <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: '#fff' }}>
          SPEDUMAP{' '}
          <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 400, fontSize: 13 }}>/ Mở Cycle</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={stepStyle('done')}>Baseline ✓</span>
        <span style={sepStyle} />
        <span style={stepStyle('done')}>Goals ✓</span>
        <span style={sepStyle} />
        <span style={stepStyle('active')}>Open Cycle</span>
        <span style={sepStyle} />
        <span style={stepStyle()}>Daily</span>
      </div>
    </header>
  )

  if (loadError) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: BODY }}>
        {Header}
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 52px)' }}>
          <div className="max-w-sm text-center p-6">
            <div className="text-[var(--red)] font-semibold mb-2">Chưa có Goal Setting</div>
            <p className="text-sm text-[var(--ink-3)] mb-4">{loadError}</p>
            <button onClick={() => router.push('/therapist/goal')}
              className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm">
              Đến Goal Setting →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: BODY }}>
        {Header}
        <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>
      </div>
    )
  }

  // Child strip data
  const childName = data.child.name
  const initials = childName.split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()
  const age = data.child.dob
    ? Math.floor((new Date().getTime() - new Date(data.child.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null
  const baselineTotal = data.engine_snapshot?.total ?? data.baseline?.total_score ?? 0
  const baselineStage = data.engine_snapshot?.stage ?? data.baseline?.stage ?? '—'
  const source = data.baseline_source || 'behavioral'
  const isClinical = source === 'clinical'

  const ready = form.cycleName.trim().length > 0 && form.startDate.length > 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: BODY, color: 'var(--ink)' }}>
      {Header}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Child strip (cycle-local, with badges) ── */}
        <div
          className="flex items-center gap-3"
          style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--red-bg)', border: '1px solid var(--red-bd)',
              fontFamily: MONO, fontSize: 11, fontWeight: 700, color: 'var(--red)',
            }}
          >
            {initials || '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{childName}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
              {age !== null ? `${age} tuổi` : ''}{data.eval_date ? ` · Baseline ${data.eval_date}` : ''}
            </div>
          </div>

          {/* Source pill */}
          <span
            style={{
              marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 3,
              background: isClinical ? 'var(--green-bg)' : 'var(--gold-bg)',
              color: isClinical ? 'var(--green)' : 'var(--gold)',
              border: `1px solid ${isClinical ? 'var(--green-bd)' : 'var(--gold-bd)'}`,
            }}
          >
            {isClinical ? '📋 L0: Clinical' : '👁 L0: Behavioral'}
          </span>

          {/* Baseline badge */}
          <div
            className="flex flex-col items-center"
            style={{ background: 'var(--green-bg)', border: '1px solid var(--green-bd)', borderRadius: 4, padding: '4px 10px', marginLeft: 8 }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--green)' }}>Baseline</div>
            <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{baselineTotal.toFixed(1)}</div>
          </div>

          {/* Stage badge */}
          <div
            className="flex flex-col items-center"
            style={{ background: 'var(--navy)', borderRadius: 4, padding: '4px 10px', marginLeft: 8 }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>Stage</div>
            <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{baselineStage}</div>
          </div>
        </div>

        {/* Signal strip */}
        <SignalStrip blocks={data.baseline_blocks} />

        {isOpened ? (
          /* Locked banner + Hypothesis + Layer Progression */
          <div className="space-y-4">
            <div
              style={{ background: 'var(--green-bg)', border: '1px solid var(--green-bd)', borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}
            >
              <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
                ✓ {form.isSandbox ? '🧪 Sandbox Cycle' : 'Cycle'} đã bắt đầu — {form.cycleName || 'Chu kỳ mới'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {childName} · Bắt đầu {form.startDate} · {form.plannedSessions} sessions kế hoạch
              </div>
              <div className="flex gap-2 justify-center" style={{ marginTop: 12 }}>
                <button
                  onClick={() => router.push('/therapist/session')}
                  style={{ height: 34, padding: '0 18px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: BODY, background: 'var(--navy)', color: '#fff' }}
                >
                  → Vào Daily Session
                </button>
                <button
                  onClick={() => router.push('/therapist/goal')}
                  style={{ height: 34, padding: '0 18px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: BODY, background: 'var(--rule-2)', color: 'var(--ink-2)', border: '1px solid var(--rule)' }}
                >
                  ← Quay lại Goals
                </button>
              </div>
            </div>

            {/* Hypothesis library — placeholder (free-text hypothesis removed; not in
                ui_cycle_open.html spec; library data not available yet) */}
            <Card title="Giả thuyết can thiệp">
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '4px 0' }}>
                Hypothesis library — sẽ được cập nhật sau
              </div>
            </Card>

            {/* Layer Progression Chart */}
            <Card title="Tiến độ lớp (Layer Progression)">
              <LayerProgressionChart
                progressions={layerProgressions as never[]}
                currentLayer={currentLayer}
                targetLayer={targetLayer}
              />
            </Card>
          </div>
        ) : (
          <>
            {/* Two col: cycle info + readonly data */}
            <div className="grid grid-cols-2 gap-3.5" style={{ marginBottom: 14 }}>

              {/* Left: cycle settings */}
              <div>
                <Card title="Thông tin Cycle">
                  <Field label="Tên Cycle">
                    <input
                      value={form.cycleName}
                      onChange={e => setFormField('cycleName', e.target.value)}
                      placeholder="Ví dụ: Cycle 01 — Điều hòa cảm giác"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Ngày bắt đầu">
                    <input type="date" value={form.startDate}
                      onChange={e => setFormField('startDate', e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Dự kiến kết thúc">
                    <input type="date" value={form.endDate}
                      onChange={e => setFormField('endDate', e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Số sessions kế hoạch">
                    <input type="number" min={1} max={100} value={form.plannedSessions}
                      onChange={e => setFormField('plannedSessions', parseInt(e.target.value) || 24)}
                      style={inputStyle}
                    />
                  </Field>
                </Card>

                {/* Sandbox toggle */}
                <div
                  onClick={() => setFormField('isSandbox', !form.isSandbox)}
                  className="flex items-start gap-2.5 cursor-pointer"
                  style={{
                    padding: '12px 14px', background: '#1A1040',
                    border: `1px solid ${form.isSandbox ? '#8A6ADA' : '#4A3A8A'}`,
                    borderRadius: 6, marginBottom: 14,
                    opacity: form.isSandbox ? 1 : 0.7, transition: 'all .15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isSandbox}
                    onChange={() => setFormField('isSandbox', !form.isSandbox)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 16, height: 16, accentColor: '#8A6ADA', cursor: 'pointer', marginTop: 1, flexShrink: 0 }}
                  />
                  <div className="flex-1">
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#C0A0FF', marginBottom: 2 }}>
                      🧪 Sandbox Cycle
                      <span style={{ display: 'inline-block', background: '#4A3A8A', color: '#C0A0FF', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, letterSpacing: '.06em', marginLeft: 6 }}>LAB</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
                      Tick nếu cycle này là thử nghiệm giao thức mới, hypothesis chưa được xác nhận, hoặc dùng để training therapist mới.
                      Data vẫn được thu thập đầy đủ nhưng được tách riêng khỏi main pool — không ảnh hưởng đến governance decisions.
                    </div>
                    {form.isSandbox && (
                      <input
                        value={form.sandboxHypothesis}
                        onChange={e => setFormField('sandboxHypothesis', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="Hypothesis: thử protocol X sẽ cải thiện Y..."
                        style={{ ...inputStyle, marginTop: 8, background: '#0E0828', borderColor: '#4A3A8A', color: '#C0A0FF' }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right: baseline + target readonly */}
              <div className="space-y-3.5">
                <BaselineReadonly blocks={data.baseline_blocks} />
                <TargetReadonly
                  baselineBlocks={data.baseline_blocks}
                  targetBlocks={data.target_blocks || {}}
                  goalDetail={data.goal_detail || {}}
                />
              </div>
            </div>

            {saveError && (
              <div className="p-3 mb-3.5 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded-lg text-xs text-[var(--red)]">
                {saveError}
              </div>
            )}

            {/* Confirm section */}
            <div
              className="no-print flex items-center justify-between gap-4 flex-wrap"
              style={{ background: 'var(--navy)', borderRadius: 8, padding: '16px 20px' }}
            >
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>
                <strong style={{ color: '#fff', display: 'block', fontSize: 14, marginBottom: 2 }}>
                  Xác nhận và bắt đầu Cycle
                </strong>
                <span>
                  {ready ? 'Sẵn sàng kích hoạt cycle.' : 'Nhập tên cycle và ngày bắt đầu để kích hoạt.'}
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => window.print()}
                  style={{
                    height: 40, padding: '0 16px', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: 5, background: 'transparent', color: 'rgba(255,255,255,.8)',
                    fontFamily: BODY, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  🖨 In / PDF
                </button>
                <button
                  onClick={handleOpen}
                  disabled={!ready || saving}
                  style={{
                    height: 40, padding: '0 24px', border: 'none', borderRadius: 5,
                    background: '#fff', color: 'var(--navy)',
                    fontFamily: BODY, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all .15s',
                    opacity: ready && !saving ? 1 : 0.4,
                    cursor: ready && !saving ? 'pointer' : 'not-allowed',
                    pointerEvents: ready && !saving ? 'auto' : 'none',
                  }}
                >
                  {saving ? 'Đang mở chu kỳ...' : 'Bắt đầu Cycle →'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function stepStyle(state?: 'active' | 'done'): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
    color: state === 'active' ? '#fff' : state === 'done' ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.4)',
  }
}

const sepStyle: React.CSSProperties = { width: 18, height: 1, background: 'rgba(255,255,255,.2)' }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, border: '1px solid var(--rule)', borderRadius: 5,
  padding: '0 10px', fontFamily: BODY, fontSize: 13, color: 'var(--ink)',
  background: 'var(--bg)', outline: 'none',
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ background: 'var(--navy)', padding: '6px 14px', fontFamily: BODY, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff' }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
