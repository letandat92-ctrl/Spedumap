'use client'

import { useEffect, useRef } from 'react'
import { ANCHOR, SCORE_COLORS } from '@/lib/anchor-data'

interface AnchorPopoverProps {
  blockKey:    string
  currentScore:number | null
  isClinic:    boolean
  isL0:        boolean
  anchorRef:   React.RefObject<HTMLButtonElement>
  onSelect:    (score: number) => void
  onClose:     () => void
}

export function AnchorPopover({
  blockKey, currentScore, isClinic, isL0, anchorRef, onSelect, onClose,
}: AnchorPopoverProps) {
  const popRef  = useRef<HTMLDivElement>(null)
  const data    = ANCHOR[blockKey]
  if (!data) return null

  const useClinicRubric = isL0 && isClinic
  const rubric = isL0
    ? (useClinicRubric ? (data.clinical || data.rows || []) : (data.behavioral || data.rows || []))
    : (data.rows || data.behavioral || [])

  // Position near anchor button
  useEffect(() => {
    const pop = popRef.current
    const btn = anchorRef.current
    if (!pop || !btn) return

    const rect   = btn.getBoundingClientRect()
    const popW   = 340
    const popH   = pop.offsetHeight || 280
    let left = rect.right + 8
    let top  = rect.top

    if (left + popW > window.innerWidth)  left = rect.left - popW - 8
    if (top  + popH > window.innerHeight) top  = window.innerHeight - popH - 8
    if (top < 8) top = 8

    pop.style.left = left + 'px'
    pop.style.top  = top  + 'px'
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handleClick, true)
    return () => document.removeEventListener('mousedown', handleClick, true)
  }, [onClose])

  return (
    <div
      ref={popRef}
      className="fixed z-[200] bg-white border border-[var(--rule)] rounded-lg shadow-xl overflow-hidden"
      style={{ width: 340 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--navy)]">
        <span className="text-xs font-semibold text-white">{data.name}</span>
        <button onClick={onClose} className="text-white/60 hover:text-white text-sm">✕</button>
      </div>

      {/* Source tag (L0 only) */}
      {isL0 && (
        <div className={`px-4 pt-2 pb-0`}>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            useClinicRubric
              ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green-bd)]'
              : 'bg-[var(--gold-bg)] text-[var(--gold)] border-[var(--gold-bd)]'
          }`}>
            {useClinicRubric ? '📋 Clinical Indicator' : '👁 Behavioral Proxy'}
          </span>
        </div>
      )}

      {/* Rows */}
      <div className="py-1 max-h-72 overflow-y-auto">
        {rubric.map((desc, i) => (
          <div
            key={i}
            onClick={() => { onSelect(i); onClose() }}
            className={`grid gap-2 px-4 py-2 border-b border-[var(--rule-2)] cursor-pointer hover:bg-[var(--rule-2)] transition-colors last:border-0 ${
              currentScore === i ? 'bg-[var(--red-bg)]' : ''
            }`}
            style={{ gridTemplateColumns: '26px 1fr' }}
          >
            <div
              className="w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: SCORE_COLORS[i] }}
            >
              {i}
            </div>
            <div className="text-xs text-[var(--ink-2)] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
