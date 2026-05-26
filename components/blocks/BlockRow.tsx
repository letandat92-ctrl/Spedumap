'use client'

import { useState, useEffect, useRef } from 'react'
import type { BlockState, FlagValue } from '@/hooks/useBaseline'
import type { Directionality } from '@/types/spedumap'
import { AnchorPopover } from './AnchorPopover'
import { ANCHOR } from '@/lib/anchor-data'

interface BlockRowProps {
  blockKey:    string
  label:       string
  weight:      number
  state:       BlockState
  showDir:     boolean
  isL0:        boolean
  isClinic:    boolean
  rowIndex:    number
  totalRows:   number
  onScore:     (val: number | null) => void
  onDir:       (dir: Directionality) => void
  onFlag:      (flag: FlagValue) => void
  onNote:      (note: string) => void
  onFocusNext: (currentIndex: number, direction: 1 | -1) => void
}

const SCORE_COLORS: Record<string, string> = {
  '0': 'text-red-800',
  '1': 'text-orange-700',
  '2': 'text-yellow-700',
  '3': 'text-green-700',
  '4': 'text-green-900',
}

export function BlockRow({
  blockKey, label, weight, state, showDir,
  isL0, isClinic,
  rowIndex, totalRows,
  onScore, onDir, onFlag, onNote, onFocusNext,
}: BlockRowProps) {
  const score = state.score
  const [inputVal, setInputVal]     = useState(score !== null ? String(score) : '')
  const [isFocused, setIsFocused]   = useState(false)
  const [showNote, setShowNote]     = useState(false)
  const [showAnchor, setShowAnchor] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLButtonElement>(null!)
  const hasAnchor = !!ANCHOR[blockKey]

  // Sync from parent when not focused
  useEffect(() => {
    if (!isFocused) setInputVal(score !== null ? String(score) : '')
  }, [score, isFocused])

  // Auto-show note when flag requires it
  useEffect(() => {
    if (state.flag === 'retest' || state.flag === 'assumed') setShowNote(true)
  }, [state.flag])

  function commitValue(raw: string) {
    if (raw === '') { onScore(null); return }
    let val = parseFloat(raw.replace(',', '.'))
    if (isNaN(val)) { setInputVal(score !== null ? String(score) : ''); return }
    val = Math.min(4, Math.max(0, Math.round(val * 2) / 2))
    onScore(val)
    setInputVal(String(val))
    // Auto-set flag to confirmed when score entered
    if (state.flag === 'none') onFlag('confirmed')
  }

  // Expose focus method for arrow navigation
  ;(inputRef as unknown as { focusInput?: () => void }).focusInput = () => inputRef.current?.focus()

  const scoreColor = score !== null
    ? SCORE_COLORS[String(Math.round(score))] ?? 'text-[var(--ink)]'
    : 'text-[var(--ink-3)]'

  const needsNote = state.flag === 'retest' || state.flag === 'assumed'
  const hasNoteError = needsNote && !state.note.trim()

  return (
    <div className="px-3 py-2 bg-white" data-row-index={rowIndex}>
      {/* Main row: label | score | flag | note-btn | anchor-btn */}
      <div className="grid items-center gap-1.5" style={{ gridTemplateColumns: `1fr 48px 56px 24px ${hasAnchor ? '20px' : ''}` }}>

        {/* Label only — weight hidden */}
        <div className="min-w-0">
          <div className="text-xs font-medium text-[var(--ink)] truncate">{label}</div>
        </div>

        {/* Score input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          maxLength={3}
          value={inputVal}
          onFocus={() => {
            setIsFocused(true)
            // Resync from the committed score so a later blur can never commit a
            // stale empty value (which would wipe a real score → onScore(null)).
            setInputVal(score !== null ? String(score) : '')
            // Select synchronously within the focus event — a deferred select()
            // (setTimeout) races fast input: a keystroke landing before it fires
            // appends to the old value (e.g. "2"→"22"→clamp 4) or the commit is
            // dropped during rapid arrow-key navigation.
            inputRef.current?.select()
          }}
          onBlur={() => { setIsFocused(false); commitValue(inputVal) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { commitValue(inputVal); inputRef.current?.blur() }
            if (e.key === 'ArrowDown') { e.preventDefault(); onFocusNext(rowIndex, 1) }
            if (e.key === 'ArrowUp')   { e.preventDefault(); onFocusNext(rowIndex, -1) }
          }}
          onChange={e => {
            let v = e.target.value.replace(/[^0-9.]/g, '')
            if (v.startsWith('0') && v.length > 1 && !v.startsWith('0.')) v = v.replace(/^0+/, '')
            setInputVal(v)
          }}
          placeholder="—"
          className={`w-full h-7 text-center text-sm font-mono font-bold border rounded focus:outline-none focus:border-[var(--navy)] ${scoreColor} ${
            score !== null ? 'border-[var(--rule)]' : 'border-dashed border-gray-300'
          }`}
        />

        {/* Flag dropdown */}
        <select
          value={state.flag}
          onChange={e => onFlag(e.target.value as FlagValue)}
          className={`w-full h-7 text-xs border rounded focus:outline-none focus:border-[var(--navy)] ${
            hasNoteError ? 'border-[var(--red)] text-[var(--red)]' : 'border-[var(--rule)] text-[var(--ink-3)]'
          }`}
        >
          <option value="none">—</option>
          <option value="confirmed">✓ OK</option>
          <option value="retest">↺ Retest</option>
          <option value="assumed">~ Assumed</option>
        </select>

        {/* Note toggle */}
        <button
          onClick={() => setShowNote(n => !n)}
          className={`w-6 h-6 text-xs rounded transition-colors ${
            showNote || state.note
              ? 'bg-[var(--navy)] text-white'
              : 'text-[var(--ink-3)] hover:bg-[var(--rule-2)]'
          } ${hasNoteError ? 'ring-1 ring-[var(--red)]' : ''}`}
          title="Ghi chú"
        >
          ✎
        </button>

        {/* Anchor button */}
        {hasAnchor && (
          <button
            ref={anchorRef}
            onClick={() => setShowAnchor(a => !a)}
            className={`w-5 h-5 text-[10px] font-bold rounded-full border transition-colors ${
              showAnchor
                ? 'bg-[var(--navy)] text-white border-[var(--navy)]'
                : 'border-[var(--rule)] text-[var(--ink-3)] hover:border-[var(--navy)] hover:text-[var(--navy)]'
            }`}
            title="Xem anchor behavior"
          >
            ?
          </button>
        )}
      </div>

      {/* Directionality — L2 only, below label, required when score entered */}
      {showDir && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--ink-3)] w-16">
            Direction{score !== null ? <span className="text-[var(--red)]">*</span> : ''}:
          </span>
          <select
            value={state.directionality ?? 'unknown'}
            onChange={e => onDir(e.target.value as Directionality)}
            className={`h-6 text-xs border rounded focus:outline-none focus:border-[var(--navy)] flex-1 ${
              score !== null && (!state.directionality || state.directionality === 'unknown')
                ? 'border-[var(--red)] text-[var(--red)] bg-[var(--red-bg)]'
                : 'border-[var(--rule)] text-[var(--ink-3)]'
            }`}
          >
            <option value="unknown">— chọn —</option>
            <option value="normal">Normal</option>
            <option value="hyper">Hyper</option>
            <option value="hypo">Hypo</option>
            <option value="mixed">Mixed</option>
            <option value="fluctuating">Fluctuating</option>
          </select>
        </div>
      )}

      {/* Note area */}
      {(showNote || state.note || hasNoteError) && (
        <input
          type="text"
          value={state.note}
          onChange={e => onNote(e.target.value)}
          placeholder={hasNoteError ? 'Bắt buộc nhập lý do...' : 'Ghi chú...'}
          className={`mt-1.5 w-full h-7 px-2 text-xs border rounded focus:outline-none focus:border-[var(--navy)] ${
            hasNoteError ? 'border-[var(--red)] bg-[var(--red-bg)]' : 'border-[var(--rule)]'
          }`}
        />
      )}

      {/* Anchor Popover */}
      {showAnchor && hasAnchor && (
        <AnchorPopover
          blockKey={blockKey}
          currentScore={score}
          isClinic={isClinic}
          isL0={isL0}
          anchorRef={anchorRef as React.RefObject<HTMLButtonElement>}
          onSelect={val => { onScore(val); if (state.flag === 'none') onFlag('confirmed') }}
          onClose={() => setShowAnchor(false)}
        />
      )}
    </div>
  )
}
