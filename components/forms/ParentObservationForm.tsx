// components/forms/ParentObservationForm.tsx
'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { ParentObservation } from '@/types/spedumap'
import { createParentObservation } from '@/lib/supabase/migrations'

const BLOCK_OPTIONS = [
  'microbiome', 'breath', 'metabolic', 'proprioception', 'vestibular',
  'taste', 'smell', 'touch', 'sound', 'vision', 'eye_contact', 'motor_planning',
  'attention', 'emotional_regulation', 'social_awareness', 'language',
  'communication', 'life_management', 'academics'
]

const CONTEXTS = [
  'home',
  'school',
  'community',
  'car',
  'meal times',
  'bedtime',
  'playtime',
  'other'
]

interface ParentObservationFormProps {
  childId: string
  supabaseClient: SupabaseClient
  onSuccess?: (observation: ParentObservation) => void
  onError?: (error: Error) => void
}

export default function ParentObservationForm({
  childId,
  supabaseClient,
  onSuccess,
  onError,
}: ParentObservationFormProps) {
  const [observationDate, setObservationDate] = useState(new Date().toISOString().split('T')[0])
  const [observationContext, setObservationContext] = useState('')
  const [blockObserved, setBlockObserved] = useState('')
  const [severity, setSeverity] = useState<number>(3)
  const [childState, setChildState] = useState('')
  const [parentNotes, setParentNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!blockObserved.trim()) {
        throw new Error('Block observed is required')
      }

      const observation = await createParentObservation(
        supabaseClient,
        childId,
        observationDate,
        blockObserved,
        observationContext || undefined,
        severity || undefined,
        childState || undefined,
        parentNotes || undefined
      )

      onSuccess?.(observation)
      
      // Reset form
      setObservationDate(new Date().toISOString().split('T')[0])
      setObservationContext('')
      setBlockObserved('')
      setSeverity(3)
      setChildState('')
      setParentNotes('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create observation'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded border border-neutral-200">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
        Share observations about your child from home. This helps therapist track progress and adjust treatment.
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Observation Date
        </label>
        <input
          type="date"
          value={observationDate}
          onChange={(e) => setObservationDate(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Where did you observe this?
        </label>
        <select
          value={observationContext}
          onChange={(e) => setObservationContext(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
        >
          <option value="">Select context...</option>
          {CONTEXTS.map(ctx => (
            <option key={ctx} value={ctx}>{ctx}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Which block did you observe? *
        </label>
        <select
          value={blockObserved}
          onChange={(e) => setBlockObserved(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
          required
        >
          <option value="">Select a block...</option>
          {BLOCK_OPTIONS.map(block => (
            <option key={block} value={block}>{block}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          How severe was it? (1=very mild, 5=very severe)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="5"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="flex-1"
          />
          <div className="flex-shrink-0 w-20 text-center">
            <span className="text-lg font-bold text-neutral-900">{severity}</span>
            <p className="text-xs text-neutral-500">
              {severity === 1 && 'Mild'}
              {severity === 2 && 'Slight'}
              {severity === 3 && 'Moderate'}
              {severity === 4 && 'Noticeable'}
              {severity === 5 && 'Severe'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          What did you observe? (Describe behavior in detail)
        </label>
        <textarea
          value={childState}
          onChange={(e) => setChildState(e.target.value)}
          rows={2}
          placeholder="e.g., Child had difficulty sitting still during homework, squirmed frequently, complained of stomach ache..."
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Additional Notes (optional)
        </label>
        <textarea
          value={parentNotes}
          onChange={(e) => setParentNotes(e.target.value)}
          rows={2}
          placeholder="Anything else therapist should know?"
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !blockObserved.trim()}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white rounded font-medium transition"
      >
        {loading ? 'Saving...' : 'Save Observation'}
      </button>
    </form>
  )
}
