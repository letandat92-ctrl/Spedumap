// components/charts/LayerProgressionChart.tsx
'use client'

import { LayerProgression } from '@/types/spedumap'

const LAYER_NAMES = [
  'L0: Metabolic',
  'L1: Reflex',
  'L2: Sensory',
  'L3: Integration',
  'L4: Processing',
  'L5: Communication',
  'L6: Life Mgmt',
  'L7: Academics',
]

interface LayerProgressionChartProps {
  progressions: LayerProgression[]
  currentLayer: number
  targetLayer?: number
}

export default function LayerProgressionChart({
  progressions,
  currentLayer,
  targetLayer,
}: LayerProgressionChartProps) {
  if (progressions.length === 0) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded p-6 text-center text-neutral-500 text-sm">
        No layer progression recorded yet
      </div>
    )
  }

  // Sort by date
  const sorted = [...progressions].sort((a, b) => 
    new Date(a.transition_date).getTime() - new Date(b.transition_date).getTime()
  )

  return (
    <div className="space-y-6 bg-white p-6 rounded border border-neutral-200">
      {/* Timeline visualization */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900">Layer Progression Timeline</h3>
        
        <div className="space-y-3">
          {sorted.map((prog, idx) => (
            <div key={prog.id} className="flex gap-4">
              {/* Left: date + transition */}
              <div className="flex-shrink-0 w-32">
                <p className="text-xs text-neutral-500">{prog.transition_date}</p>
                <p className="text-sm font-medium text-neutral-900 mt-1">
                  L{prog.layer_from} → L{prog.layer_to}
                </p>
              </div>

              {/* Middle: visual layer bars */}
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-2">
                  {LAYER_NAMES.map((_, layerIdx) => (
                    <div
                      key={layerIdx}
                      className={`h-2 flex-1 rounded-sm transition ${
                        layerIdx <= prog.layer_to
                          ? 'bg-green-500'
                          : layerIdx <= prog.layer_from
                          ? 'bg-yellow-400'
                          : 'bg-neutral-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Right: evidence trigger (expandable) */}
              <div className="flex-shrink-0 w-40 text-xs">
                <details className="cursor-pointer group">
                  <summary className="text-neutral-600 hover:text-neutral-900 font-medium">
                    Evidence ▼
                  </summary>
                  <p className="mt-2 text-neutral-600 text-xs leading-relaxed whitespace-normal break-words">
                    {prog.evidence_trigger}
                  </p>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current + target status */}
      <div className="border-t border-neutral-200 pt-4 grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded p-4 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">CURRENT LAYER</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">L{currentLayer}</p>
          <p className="text-xs text-blue-700 mt-1">{LAYER_NAMES[currentLayer]}</p>
        </div>

        {targetLayer !== undefined && (
          <div className="bg-green-50 rounded p-4 border border-green-200">
            <p className="text-xs text-green-600 font-medium">TARGET LAYER</p>
            <p className="text-2xl font-bold text-green-900 mt-1">L{targetLayer}</p>
            <p className="text-xs text-green-700 mt-1">{LAYER_NAMES[targetLayer]}</p>
            {currentLayer < targetLayer && (
              <p className="text-xs text-green-600 font-medium mt-2">
                {targetLayer - currentLayer} layer(s) to go
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary stats */}
      {progressions.length > 0 && (
        <div className="border-t border-neutral-200 pt-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-neutral-500 font-medium">TOTAL TRANSITIONS</p>
              <p className="text-lg font-bold text-neutral-900 mt-1">{progressions.length}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium">UPWARD MOVES</p>
              <p className="text-lg font-bold text-green-700 mt-1">
                {progressions.filter(p => p.layer_to > p.layer_from).length}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium">TOTAL LAYER GAIN</p>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                +{progressions.reduce((sum, p) => sum + Math.max(0, p.layer_to - p.layer_from), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
