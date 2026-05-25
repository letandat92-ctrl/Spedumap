// components/forms/HypothesisForm.tsx
'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { CycleHypothesis } from '@/types/spedumap'
import { createCycleHypothesis } from '@/lib/supabase/migrations'

interface HypothesisFormProps {
  cycleId: string
  supabaseClient: SupabaseClient
  onSuccess?: (hypothesis: CycleHypothesis) => void
  onError?: (error: Error) => void
}

export default function HypothesisForm({
  cycleId,
  supabaseClient,
  onSuccess,
  onError,
}: HypothesisFormProps) {
  const [hypothesisStatement, setHypothesisStatement] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [interventionStrategy, setInterventionStrategy] = useState('')
  const [successCriterion, setSuccessCriterion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!hypothesisStatement.trim()) {
        throw new Error('Hypothesis statement is required')
      }

      const hypothesis = await createCycleHypothesis(
        supabaseClient,
        cycleId,
        hypothesisStatement,
        rootCause || undefined,
        interventionStrategy || undefined,
        successCriterion || undefined
      )

      onSuccess?.(hypothesis)
      
      // Reset form
      setHypothesisStatement('')
      setRootCause('')
      setInterventionStrategy('')
      setSuccessCriterion('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create hypothesis'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded border border-neutral-200">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Hypothesis Statement *
        </label>
        <textarea
          value={hypothesisStatement}
          onChange={(e) => setHypothesisStatement(e.target.value)}
          placeholder="e.g., I think the bottleneck is microbiome dysfunction (caused by dysbiosis) because observations show gut symptoms correlate with attention issues..."
          rows={3}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
          required
        />
        <p className="text-xs text-neutral-500 mt-1">Explicit reasoning: what is the block and why?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Root Cause Assumption
        </label>
        <textarea
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          placeholder="e.g., Dysbiosis from antibiotics or dietary sensitivities reduces GABA-producing bacteria..."
          rows={2}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
        />
        <p className="text-xs text-neutral-500 mt-1">Why do we think this problem exists?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Intervention Strategy
        </label>
        <textarea
          value={interventionStrategy}
          onChange={(e) => setInterventionStrategy(e.target.value)}
          placeholder="e.g., Implement probiotic supplementation + eliminate processed foods + increase fermented foods over 2 weeks..."
          rows={2}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
        />
        <p className="text-xs text-neutral-500 mt-1">How will we address the root cause?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Success Criterion
        </label>
        <textarea
          value={successCriterion}
          onChange={(e) => setSuccessCriterion(e.target.value)}
          placeholder="e.g., Child reports improvement in bowel regularity by day 10, parent observes increased attention span in homework by week 2, therapist observes reduced fidgeting in sessions..."
          rows={2}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900 text-sm"
        />
        <p className="text-xs text-neutral-500 mt-1">How will we know if hypothesis is correct? (quantifiable if possible)</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !hypothesisStatement.trim()}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white rounded font-medium transition"
      >
        {loading ? 'Saving...' : 'Save Hypothesis'}
      </button>
    </form>
  )
}
