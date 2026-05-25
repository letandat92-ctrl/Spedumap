'use client'

import { useRef, useState } from 'react'
import { BlockRow } from './BlockRow'
import type { BlockState, FlagValue } from '@/hooks/useBaseline'
import type { Directionality } from '@/types/spedumap'

interface LayerSectionProps {
  layerId:      string
  label:        string
  color:        string
  blocks:       Record<string, string>
  blockStates:  Record<string, BlockState>
  blockWeights: Record<string, number>
  l2Blocks:     string[]
  globalRowOffset: number
  isClinic:     boolean
  onScore:      (key: string, val: number | null) => void
  onDir:        (key: string, dir: Directionality) => void
  onFlag:       (key: string, flag: FlagValue) => void
  onNote:       (key: string, note: string) => void
  onFocusRow:   (globalIndex: number, direction: 1 | -1) => void
}

export function LayerSection({
  layerId, label, color, blocks, blockStates, blockWeights,
  l2Blocks, globalRowOffset, isClinic,
  onScore, onDir, onFlag, onNote, onFocusRow,
}: LayerSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  const blockKeys = Object.keys(blocks)
  const entered = blockKeys.filter(k => blockStates[k]?.score !== null)
  const layerScore = entered.length > 0
    ? entered.reduce((sum, k) => sum + (blockStates[k].score! * (blockWeights[k] ?? 0)), 0)
    : null

  const pillColor = layerScore === null ? 'text-[var(--ink-3)]'
    : layerScore >= 3 ? 'text-[var(--green)]'
    : layerScore >= 2 ? 'text-[var(--gold)]'
    : 'text-[var(--red)]'

  return (
    <div className="mb-1 rounded-lg overflow-hidden border border-[var(--rule)]">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        style={{ background: color + '18' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-xs font-semibold text-[var(--ink)]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold ${pillColor}`}>
            {layerScore !== null ? layerScore.toFixed(2) : '—'}
          </span>
          <span className="text-[var(--ink-3)] text-xs">{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y divide-[var(--rule-2)]">
          {blockKeys.map((key, i) => (
            <BlockRow
              key={key}
              blockKey={key}
              label={blocks[key]}
              weight={blockWeights[key] ?? 0}
              state={blockStates[key]}
              showDir={l2Blocks.includes(key)}
              isL0={layerId === 'L0'}
              isClinic={isClinic}
              rowIndex={globalRowOffset + i}
              totalRows={39}
              onScore={val => onScore(key, val)}
              onDir={dir => onDir(key, dir)}
              onFlag={flag => onFlag(key, flag)}
              onNote={note => onNote(key, note)}
              onFocusNext={onFocusRow}
            />
          ))}
        </div>
      )}
    </div>
  )
}
