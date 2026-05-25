// components/forms/ActivityOutcomeForm.tsx
'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { ActivityOutcome } from '@/types/spedumap'
import { createActivityOutcome } from '@/lib/supabase/migrations'

const OUTCOME_INDICATORS = [
  { value: 'block_move', label: 'Block moved (improved)' },
  { value: 'duration_change', label: 'Duration changed' },
  { value: 'frequency_change', label: 'Frequency changed' },
  { value: 'skill_emergence', label: 'New skill emerged' },
] as const

const BLOCK_OPTIONS = [
  'microbiome', 'breath', 'metabolic', 'proprioception', 'vestibular',
  'taste', 'smell', 'touch', 'sound', 'vision', 'eye_contact', 'motor_planning',
  'attention', 'emotional_regulation', 'social_awareness', 'language',
  'communication', 'life_management', 'academics'
]

interface ActivityOutcomeFormProps {
  sessionId: string
  activityName: string
  activityIndex: number
  supabaseClient: SupabaseClient
  onSuccess?: (outcome: ActivityOutcome) => void
  onError?: (error: Error) => void
}

export default function ActivityOutcomeForm({
  sessionId,
  activityName,
  activityIndex,
  supabaseClient,
  onSuccess,
  onError,
}: ActivityOutcomeFormProps) {
  const [outcomeIndicator, setOutcomeIndicator] = useState<'block_move' | 'duration_change' | 'frequency_change' | 'skill_emergence'>('block_move')
  const [blockName, setBlockName] = useState('')
  const [outcomeValue, setOutcomeValue] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const outcome = await createActivityOutcome(
        supabaseClient,
        sessionId,
        activityName,
        activityIndex,
        outcomeIndicator,
        blockName || undefined,
        outcomeValue ? Number(outcomeValue) : undefined,
        notes || undefined
      )

      onSuccess?.(outcome)
      
      // Reset form
      setOutcomeIndicator('block_move')
      setBlockName('')
      setOutcomeValue('')
      setNotes('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create activity outcome'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded border border-neutral-200">
      <div className="pb-3 border-b border-neutral-200">
        <p className="text-xs text-neutral-500">Activity</p>
        <p className="text-sm font-medium text-neutral-900">{activityName}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Outcome Indicator *
        </label>
        <div className="space-y-2">
          {OUTCOME_INDICATORS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="outcomeIndicator"
                value={value}
                checked={outcomeIndicator === value}
                onChange={(e) => setOutcomeIndicator(e.target.value as typeof outcomeIndicator)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {(outcomeIndicator === 'block_move' || outcomeIndicator === 'skill_emergence') && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Block Affected
          </label>
          <select
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
          >
            <option value="">Select a block...</option>
            {BLOCK_OPTIONS.map(block => (
              <option key={block} value={block}>{block}</option>
            ))}
          </select>
        </div>
      )}

      {(outcomeIndicator === 'duration_change' || outcomeIndicator === 'frequency_change') && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Change Magnitude (number or %)
          </label>
          <input
            type="text"
            value={outcomeValue}
            onChange={(e) => setOutcomeValue(e.target.value)}
            placeholder="e.g., 2, 50%, +10 min"
            className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Details about the outcome..."
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
        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-300 text-white rounded text-sm font-medium transition"
      >
        {loading ? 'Saving...' : 'Save Outcome'}
      </button>
    </form>
  )
}
