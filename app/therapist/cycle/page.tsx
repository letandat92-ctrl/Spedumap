'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCycle } from '@/hooks/useCycle'
import { createClient } from '@/lib/supabase/client'
import { LS_KEYS } from '@/types/spedumap'
import { ChildStrip } from '@/components/charts/ReportComponents'
import { SignalStrip, BaselineReadonly, TargetReadonly } from '@/components/charts/CycleComponents'
import HypothesisForm from '@/components/forms/HypothesisForm'
import LayerProgressionChart from '@/components/charts/LayerProgressionChart'
import { getLayerProgressionByCycle, getLatestAssessment } from '@/lib/supabase/migrations'

export const dynamic = 'force-dynamic'


const LAYER_COLORS: Record<string, string> = {
  L0:'#8B1A1A',L1:'#A02020',L2:'#B83030',L3:'#C55030',
  L4:'#C87020',L5:'#4A8A60',L6:'#2A6A9A',L7:'#3A5AAA',
}

function getBlockScore(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'score' in v) return Number((v as {score:number}).score)
  return 0
}

export default function CyclePage() {
  const router   = useRouter()
  const supabase = createClient()
  const {
    data, form, loadError, isOpened, saving, saveError,
    setFormField, buildActiveCycle,
    setSaving, setSaveError, setIsOpened,
  } = useCycle()
  
  const [layerProgressions, setLayerProgressions] = useState<any[]>([])
  const [currentLayer, setCurrentLayer] = useState<number>(2)
  const [targetLayer, setTargetLayer] = useState<number>(4)
  
  // Load layer progressions + assessment layer when cycle opens
  useEffect(() => {
    if (isOpened && data?.supabase_cycle_id && data?.child?.id) {
      // Load progressions
      getLayerProgressionByCycle(supabase, data.supabase_cycle_id)
        .then(setLayerProgressions)
        .catch(err => console.error('Failed to load progressions:', err))
      
      // Load latest assessment to get current layer
      getLatestAssessment(supabase, data.child.id)
        .then(assessment => {
          if (assessment) setCurrentLayer(assessment.assigned_layer)
        })
        .catch(err => console.error('Failed to load assessment:', err))
      
      // TODO: Load target layer from goals when available
      // For now: use hardcoded or compute from goal_detail
      if (data.goal_detail) {
        // Assuming goal_detail has target_layer or similar
        // setTargetLayer(data.goal_detail.target_layer || 4)
      }
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

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm text-center p-6">
          <div className="text-[var(--red)] font-semibold mb-2">Chưa có Goal Setting</div>
          <p className="text-sm text-[var(--ink-3)] mb-4">{loadError}</p>
          <button onClick={() => router.push('/therapist/goal')}
            className="px-4 py-2 bg-[var(--navy)] text-white rounded-lg text-sm">
            Đến Goal Setting →
          </button>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-sm text-[var(--ink-3)]">Đang tải...</div>

  const goalBlocks = Object.entries(data.target_blocks || {})

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 max-w-4xl mx-auto">

      {/* Child strip */}
      <ChildStrip
        name={data.child.name}
        dob={data.child.dob ?? undefined}
        status="active"
      />

      {/* Signal strip */}
      <SignalStrip blocks={data.baseline_blocks} />

      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-[var(--ink-3)] mb-1">
          <span className="cursor-pointer hover:text-[var(--navy)]" onClick={() => router.push('/therapist/baseline')}>Baseline</span>
          {' → '}
          <span className="cursor-pointer hover:text-[var(--navy)]" onClick={() => router.push('/therapist/goal')}>Goal Setting</span>
          {' → '}
          <span className="font-semibold text-[var(--navy)]">Cycle Open</span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-[var(--navy)]">Mở Chu Kỳ Can Thiệp</h1>
      </div>

      {isOpened ? (
        /* Locked banner + Hypothesis + Layer Progression */
        <div className="space-y-6">
          <div className="bg-[var(--green-bg)] border border-[var(--green-bd)] rounded-xl p-6 text-center">
            <div className="text-2xl mb-2">✓</div>
            <div className="font-semibold text-[var(--green)] text-lg mb-1">Chu kỳ đã được mở</div>
            <p className="text-sm text-[var(--ink-3)] mb-4">
              {form.cycleName || 'Chu kỳ mới'} · {form.plannedSessions} sessions · Bắt đầu {form.startDate}
            </p>
            <button
              onClick={() => router.push('/therapist/session')}
              className="px-6 py-2.5 bg-[var(--navy)] text-white rounded-lg text-sm font-bold hover:bg-[var(--navy-mid)]"
            >
              Vào Daily Session →
            </button>
          </div>

          {/* Hypothesis Form */}
          <div className="bg-white border border-[var(--rule)] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Giả Thuyết Can Thiệp</h3>
            {data && data.supabase_cycle_id && (
              <HypothesisForm
                cycleId={data.supabase_cycle_id}
                supabaseClient={supabase}
                onSuccess={() => {
                  console.log('Hypothesis saved')
                }}
              />
            )}
          </div>

          {/* Layer Progression Chart */}
          <div className="bg-white border border-[var(--rule)] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Tiến Độ Lớp (Layer Progression)</h3>
            <LayerProgressionChart
              progressions={layerProgressions}
              currentLayer={currentLayer}
              targetLayer={targetLayer}
            />
          </div>
        </div>
      ) : (
        /* Cycle form — before open */
        <div className="grid grid-cols-2 gap-6">

          {/* Left: Form */}
          <div className="space-y-5">
            <div className="bg-white border border-[var(--rule)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Cài đặt chu kỳ</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--ink-3)] mb-1">Tên chu kỳ</label>
                  <input
                    value={form.cycleName}
                    onChange={e => setFormField('cycleName', e.target.value)}
                    placeholder="VD: Chu kỳ 1 — L0/L1 Foundation"
                    className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày bắt đầu</label>
                    <input type="date" value={form.startDate}
                      onChange={e => setFormField('startDate', e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--ink-3)] mb-1">Ngày kết thúc dự kiến</label>
                    <input type="date" value={form.endDate}
                      onChange={e => setFormField('endDate', e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--ink-3)] mb-1">Sessions dự kiến</label>
                  <input type="number" min="1" max="200" value={form.plannedSessions}
                    onChange={e => setFormField('plannedSessions', parseInt(e.target.value) || 24)}
                    className="w-full h-9 px-3 text-sm border border-[var(--rule)] rounded-lg focus:outline-none focus:border-[var(--navy)]"
                  />
                </div>

                {/* Sandbox toggle */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setFormField('isSandbox', !form.isSandbox)}
                      className={`w-9 h-5 rounded-full transition-colors ${form.isSandbox ? 'bg-[var(--gold)]' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${form.isSandbox ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs text-[var(--ink-2)]">Sandbox cycle (thử nghiệm protocol)</span>
                  </label>
                  {form.isSandbox && (
                    <input
                      value={form.sandboxHypothesis}
                      onChange={e => setFormField('sandboxHypothesis', e.target.value)}
                      placeholder="Hypothesis: thử protocol X sẽ cải thiện Y..."
                      className="mt-2 w-full h-9 px-3 text-sm border border-[var(--gold-bd)] bg-[var(--gold-bg)] rounded-lg focus:outline-none focus:border-[var(--gold)]"
                    />
                  )}
                </div>
              </div>
            </div>

            {saveError && (
              <div className="p-3 bg-[var(--red-bg)] border border-[var(--red-bd)] rounded-lg text-xs text-[var(--red)]">
                {saveError}
              </div>
            )}

            <button
              onClick={handleOpen}
              disabled={saving}
              className="w-full h-11 bg-[var(--navy)] text-white rounded-xl text-sm font-bold hover:bg-[var(--navy-mid)] transition-colors disabled:opacity-40"
            >
              {saving ? 'Đang mở chu kỳ...' : 'Mở Chu Kỳ →'}
            </button>
          </div>

          {/* Right: Readonly displays */}
          <div className="space-y-4">
            <BaselineReadonly blocks={data.baseline_blocks} />
            <TargetReadonly
              baselineBlocks={data.baseline_blocks}
              targetBlocks={data.target_blocks || {}}
              goalDetail={data.goal_detail || {}}
            />
          </div>
        </div>
      )}
    </div>
  )
}
