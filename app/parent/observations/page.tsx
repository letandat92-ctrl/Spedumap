'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ParentObservationForm from '@/components/forms/ParentObservationForm'
import { ParentObservation } from '@/types/spedumap'
import { getParentObservationsByChild } from '@/lib/supabase/migrations'

export const dynamic = 'force-dynamic'

export default function ParentObservationsPage() {
  const supabase = createClient()
  const [childId, setChildId] = useState<string | null>(null)
  const [observations, setObservations] = useState<ParentObservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user + their child
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        setChildId(user.id)
        // TODO: fetch actual child_id from user_profiles
      }
    })
  }, [])

  useEffect(() => {
    if (childId) {
      loadObservations()
    }
  }, [childId])

  async function loadObservations() {
    try {
      setLoading(true)
      if (childId) {
        const data = await getParentObservationsByChild(supabase, childId)
        setObservations(data)
      }
    } catch (err) {
      console.error('Failed to load observations:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: number | undefined) => {
    if (!severity) return 'bg-gray-100 text-gray-700'
    if (severity === 1) return 'bg-green-100 text-green-700'
    if (severity === 2) return 'bg-blue-100 text-blue-700'
    if (severity === 3) return 'bg-yellow-100 text-yellow-700'
    if (severity === 4) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const getSeverityLabel = (severity: number | undefined) => {
    if (!severity) return 'Unknown'
    const labels = ['', 'Mild', 'Slight', 'Moderate', 'Noticeable', 'Severe']
    return labels[severity] || 'Unknown'
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>
  }

  if (!childId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <p className="text-neutral-600">Vui lòng đăng nhập để gửi nhận xét.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Nhận Xét Từ Nhà</h1>
          <p className="text-neutral-600">
            Chia sẻ quan sát về con em của bạn. Những nhận xét này giúp therapist điều chỉnh phương pháp can thiệp.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form section */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ParentObservationForm
                childId={childId}
                supabaseClient={supabase}
                onSuccess={() => loadObservations()}
              />
            </div>
          </div>

          {/* Observations list */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {observations.length > 0 ? (
                observations.map(obs => (
                  <div
                    key={obs.id}
                    className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition"
                  >
                    {/* Header: date + block + severity */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-neutral-500">
                            {obs.observation_date}
                          </span>
                          {obs.observation_context && (
                            <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded">
                              {obs.observation_context}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-900">
                          {obs.block_observed}
                        </h3>
                      </div>

                      {obs.severity && (
                        <div className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ${getSeverityColor(obs.severity)}`}>
                          {getSeverityLabel(obs.severity)}
                        </div>
                      )}
                    </div>

                    {/* Child state description */}
                    {obs.child_state && (
                      <div className="mb-3 p-3 bg-neutral-50 rounded border border-neutral-200">
                        <p className="text-sm text-neutral-700">{obs.child_state}</p>
                      </div>
                    )}

                    {/* Parent notes */}
                    {obs.parent_notes && (
                      <div className="text-xs text-neutral-600 italic">
                        <span className="font-semibold">Ghi chú thêm:</span> {obs.parent_notes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
                  <p className="text-neutral-600">Chưa có nhận xét nào được gửi.</p>
                  <p className="text-xs text-neutral-500 mt-2">Sử dụng form bên trái để gửi nhận xét đầu tiên.</p>
                </div>
              )}
            </div>

            {/* Summary stats */}
            {observations.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{observations.length}</p>
                  <p className="text-xs text-neutral-600 mt-1">Tổng nhận xét</p>
                </div>

                <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {new Set(observations.map(o => o.block_observed)).size}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">Blocks được quan sát</p>
                </div>

                <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {observations.reduce((sum, o) => sum + (o.severity || 0), 0) / observations.length > 3 ? '⚠️' : '✓'}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">Mức độ trung bình</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
