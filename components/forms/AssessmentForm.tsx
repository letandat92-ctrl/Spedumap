// components/forms/AssessmentForm.tsx
'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Assessment, IdentifiedBlock } from '@/types/spedumap'
import { createAssessment } from '@/lib/supabase/migrations'

const BLOCK_OPTIONS = [
  'microbiome', 'breath', 'metabolic', 'proprioception', 'vestibular',
  'taste', 'smell', 'touch', 'sound', 'vision', 'eye_contact', 'motor_planning',
  'attention', 'emotional_regulation', 'social_awareness', 'language',
  'communication', 'life_management', 'academics'
]

interface AssessmentFormProps {
  childId: string
  therapistId: string
  supabaseClient: SupabaseClient
  onSuccess?: (assessment: Assessment) => void
  onError?: (error: Error) => void
}

export default function AssessmentForm({
  childId,
  therapistId,
  supabaseClient,
  onSuccess,
  onError,
}: AssessmentFormProps) {
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0])
  const [assignedLayer, setAssignedLayer] = useState<number>(2)
  const [confidenceScore, setConfidenceScore] = useState<number>(75)
  const [source, setSource] = useState<'workshop' | 'observation' | 'parent_report' | 'standardized_tool'>('workshop')
  const [notes, setNotes] = useState('')
  const [identifiedBlocks, setIdentifiedBlocks] = useState<IdentifiedBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addBlock = (blockName: string) => {
    if (!identifiedBlocks.find(b => b.name === blockName)) {
      setIdentifiedBlocks([...identifiedBlocks, { name: blockName, severity: 3 }])
    }
  }

  const updateBlockSeverity = (blockName: string, severity: number) => {
    setIdentifiedBlocks(
      identifiedBlocks.map(b => 
        b.name === blockName ? { ...b, severity } : b
      )
    )
  }

  const removeBlock = (blockName: string) => {
    setIdentifiedBlocks(identifiedBlocks.filter(b => b.name !== blockName))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (identifiedBlocks.length === 0) {
        throw new Error('Must identify at least one block')
      }

      const assessment = await createAssessment(
        supabaseClient,
        childId,
        therapistId,
        assessmentDate,
        identifiedBlocks,
        assignedLayer,
        confidenceScore,
        source,
        notes || undefined
      )

      onSuccess?.(assessment)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create assessment'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded border border-neutral-200">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Assessment Date
        </label>
        <input
          type="date"
          value={assessmentDate}
          onChange={(e) => setAssessmentDate(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Assigned Layer (0–7)
          </label>
          <input
            type="number"
            min="0"
            max="7"
            value={assignedLayer}
            onChange={(e) => setAssignedLayer(Number(e.target.value))}
            className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Confidence Score (0–100)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceScore}
              onChange={(e) => setConfidenceScore(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-neutral-600 w-12">{confidenceScore}%</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Assessment Source
        </label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
          required
        >
          <option value="workshop">Workshop</option>
          <option value="observation">Observation</option>
          <option value="parent_report">Parent Report</option>
          <option value="standardized_tool">Standardized Tool</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Identified Blocks
        </label>
        <div className="space-y-2 mb-4">
          {identifiedBlocks.map(block => (
            <div key={block.name} className="flex items-center gap-3 p-2 bg-neutral-50 rounded border border-neutral-200">
              <span className="text-sm font-medium text-neutral-700 flex-1">{block.name}</span>
              <select
                value={block.severity}
                onChange={(e) => updateBlockSeverity(block.name, Number(e.target.value))}
                className="px-2 py-1 text-sm border border-neutral-300 rounded text-neutral-900"
              >
                <option value="1">1 (Mild)</option>
                <option value="2">2</option>
                <option value="3">3 (Moderate)</option>
                <option value="4">4</option>
                <option value="5">5 (Severe)</option>
              </select>
              <button
                type="button"
                onClick={() => removeBlock(block.name)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {BLOCK_OPTIONS.filter(b => !identifiedBlocks.find(ib => ib.name === b)).map(blockName => (
            <button
              key={blockName}
              type="button"
              onClick={() => addBlock(blockName)}
              className="text-xs px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded border border-neutral-200"
            >
              + {blockName}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-neutral-300 rounded text-neutral-900"
          placeholder="Additional observations..."
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || identifiedBlocks.length === 0}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white rounded font-medium transition"
      >
        {loading ? 'Saving...' : 'Save Assessment'}
      </button>
    </form>
  )
}
