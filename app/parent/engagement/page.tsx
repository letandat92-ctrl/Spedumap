'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ParentEngagementForm from '@/components/forms/ParentEngagementForm'
import { ParentEngagement } from '@/types/spedumap'
import { getParentEngagementByChild } from '@/lib/supabase/migrations'

export const dynamic = 'force-dynamic'

export default function ParentEngagementPage() {
  const supabase = createClient()
  const [childId, setChildId] = useState<string | null>(null)
  const [engagements, setEngagements] = useState<ParentEngagement[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'assign' | 'complete'>('assign')
  const [selectedEngagement, setSelectedEngagement] = useState<ParentEngagement | null>(null)

  useEffect(() => {
    // Get current user + their child
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        setChildId(user.id)
        // TODO: fetch child_id from user_profiles or children table
      }
    })
  }, [])

  useEffect(() => {
    if (childId) {
      loadEngagements()
    }
  }, [childId])

  async function loadEngagements() {
    try {
      setLoading(true)
      if (childId) {
        const data = await getParentEngagementByChild(supabase, childId)
        setEngagements(data)
      }
    } catch (err) {
      console.error('Failed to load engagements:', err)
    } finally {
      setLoading(false)
    }
  }

  const pendingHomework = engagements.filter(e => !e.homework_completed)
  const completedHomework = engagements.filter(e => e.homework_completed)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>
  }

  if (!childId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <p className="text-neutral-600">Vui lòng đăng nhập để xem bài tập về nhà.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Bài Tập Về Nhà</h1>
          <p className="text-neutral-600">Theo dõi và hoàn thành các bài tập được giao bởi therapist</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form section */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('assign')}
                  className={`flex-1 px-4 py-2 rounded font-medium transition ${
                    mode === 'assign'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-neutral-700 border border-neutral-300'
                  }`}
                >
                  Nhập Bài
                </button>
                <button
                  onClick={() => setMode('complete')}
                  className={`flex-1 px-4 py-2 rounded font-medium transition ${
                    mode === 'complete'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-neutral-700 border border-neutral-300'
                  }`}
                >
                  Hoàn Thành
                </button>
              </div>

              {mode === 'assign' ? (
                <ParentEngagementForm
                  childId={childId}
                  supabaseClient={supabase}
                  mode="assign"
                  onSuccess={() => loadEngagements()}
                />
              ) : selectedEngagement ? (
                <ParentEngagementForm
                  childId={childId}
                  supabaseClient={supabase}
                  mode="complete"
                  engagement={selectedEngagement}
                  onSuccess={() => {
                    loadEngagements()
                    setSelectedEngagement(null)
                  }}
                />
              ) : (
                <div className="bg-white p-4 rounded border border-neutral-200 text-center text-sm text-neutral-500">
                  Chọn bài tập chưa hoàn thành để báo cáo
                </div>
              )}
            </div>
          </div>

          {/* List section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending homework */}
            {pendingHomework.length > 0 && (
              <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
                  <h2 className="font-semibold text-blue-900">
                    Bài Tập Chưa Hoàn Thành ({pendingHomework.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {pendingHomework.map(hw => (
                    <div
                      key={hw.id}
                      onClick={() => {
                        setMode('complete')
                        setSelectedEngagement(hw)
                      }}
                      className="p-4 hover:bg-blue-50 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900 mb-1">
                            {hw.homework_description}
                          </p>
                          <p className="text-xs text-neutral-500">
                            Được giao: {hw.homework_assigned_date}
                          </p>
                        </div>
                        <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition whitespace-nowrap">
                          Báo Cáo →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed homework */}
            {completedHomework.length > 0 && (
              <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                <div className="bg-green-50 px-6 py-3 border-b border-green-200">
                  <h2 className="font-semibold text-green-900">
                    Bài Tập Đã Hoàn Thành ({completedHomework.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {completedHomework.map(hw => (
                    <div key={hw.id} className="p-4 bg-green-50/50">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-sm font-medium text-neutral-900">{hw.homework_description}</p>
                        <span className="text-xs font-semibold text-green-600">✓ Đã hoàn thành</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-neutral-600">
                        <div>
                          <p className="text-neutral-500">Ngày hoàn thành</p>
                          <p className="font-medium text-neutral-900">{hw.completion_date}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">Chất lượng</p>
                          <p className="font-medium text-neutral-900">{hw.quality_score}%</p>
                        </div>
                      </div>
                      {hw.therapist_notes && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-xs text-neutral-600">
                            <span className="font-semibold">Nhận xét:</span> {hw.therapist_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {engagements.length === 0 && (
              <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
                <p className="text-neutral-600">Chưa có bài tập nào được giao.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
