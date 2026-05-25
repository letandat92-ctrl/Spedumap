// components/forms/ParentEngagementForm.tsx
'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { ParentEngagement } from '@/types/spedumap'
import { createParentEngagement, updateParentEngagementCompletion } from '@/lib/supabase/migrations'

interface ParentEngagementFormProps {
  childId: string
  supabaseClient: SupabaseClient
  onSuccess?: (engagement: ParentEngagement) => void
  onError?: (error: Error) => void
  mode?: 'assign' | 'complete'
  engagement?: ParentEngagement
}

export default function ParentEngagementForm({
  childId,
  supabaseClient,
  onSuccess,
  onError,
  mode = 'assign',
  engagement,
}: ParentEngagementFormProps) {
  const [homeworkDescription, setHomeworkDescription] = useState(engagement?.homework_description || '')
  const [completionDate, setCompletionDate] = useState(engagement?.completion_date || new Date().toISOString().split('T')[0])
  const [qualityScore, setQualityScore] = useState(engagement?.quality_score || 75)
  const [therapistNotes, setTherapistNotes] = useState(engagement?.therapist_notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'assign') {
        if (!homeworkDescription.trim()) {
          throw new Error('Homework description is required')
        }

        const newEngagement = await createParentEngagement(
          supabaseClient,
          childId,
          new Date().toISOString().split('T')[0],
          homeworkDescription
        )

        onSuccess?.(newEngagement)
        setHomeworkDescription('')
      } else if (mode === 'complete' && engagement) {
        const updatedEngagement = await updateParentEngagementCompletion(
          supabaseClient,
          engagement.id,
          completionDate,
          qualityScore || undefined,
          therapistNotes || undefined
        )

        onSuccess?.(updatedEngagement)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save engagement'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'assign') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded border border-neutral-200">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Homework Description *
          </label>
          <textarea
            value={homeworkDescription}
            onChange={(e) => setHomeworkDescription(e.target.value)}
            rows={3}
            placeholder="Describe the homework to assign to parent. Include frequency, duration, and expected activities."
            className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
            required
          />
          <p className="text-xs text-neutral-500 mt-1">Be specific: what, when, how often?</p>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !homeworkDescription.trim()}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white rounded text-sm font-medium transition"
        >
          {loading ? 'Assigning...' : 'Assign Homework'}
        </button>
      </form>
    )
  }

  // Complete mode
  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded border border-neutral-200">
      <div className="pb-3 border-b border-neutral-200">
        <p className="text-xs text-neutral-500">ASSIGNED HOMEWORK</p>
        <p className="text-sm text-neutral-900 mt-1">{engagement?.homework_description}</p>
        <p className="text-xs text-neutral-500 mt-2">Assigned: {engagement?.homework_assigned_date}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Completion Date
        </label>
        <input
          type="date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Quality of Completion
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={qualityScore}
            onChange={(e) => setQualityScore(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium text-neutral-600 w-12">{qualityScore}%</span>
        </div>
        <p className="text-xs text-neutral-500 mt-1">How well was homework executed?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Therapist Notes
        </label>
        <textarea
          value={therapistNotes}
          onChange={(e) => setTherapistNotes(e.target.value)}
          rows={2}
          placeholder="Feedback on completion, observations, next steps..."
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
        />
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-300 text-white rounded text-sm font-medium transition"
      >
        {loading ? 'Saving...' : 'Mark Complete & Save Notes'}
      </button>
    </form>
  )
}
