import type { EngineResult } from '@/hooks/useBaseline'

interface BaselineKPIProps {
  engine:       EngineResult
  enteredCount: number
  totalCount:   number
}

const OSWALD = { fontFamily: "'Oswald', sans-serif" } as const

// Derive dominant deficit from engine signals (mirrors template dominant())
function dominant(sig: EngineResult['sig']): { name: string; desc: string } {
  const entries = Object.entries(sig).sort((a, b) => b[1] - a[1])
  const [topKey, topVal] = entries[0]
  if (topVal === 0) return { name: 'No Deficit', desc: 'Tất cả tầng nền hoạt động tốt.' }
  const map: Record<string, { name: string; desc: string }> = {
    sensorimotor: { name: 'Sensorimotor Deficit', desc: `Signal: ${topVal.toFixed(2)} — Cảm giác/vận động cần ưu tiên can thiệp.` },
    regulation:   { name: 'Regulation Deficit',   desc: `Signal: ${topVal.toFixed(2)} — Điều tiết thần kinh là bottleneck chính.` },
    cognitive:    { name: 'Cognitive Deficit',    desc: `Signal: ${topVal.toFixed(2)} — Tầng xử lý/giao tiếp cần hỗ trợ.` },
  }
  return map[topKey] ?? { name: 'No Deficit', desc: 'Tất cả tầng nền hoạt động tốt.' }
}

export function BaselineKPI({ engine, enteredCount, totalCount }: BaselineKPIProps) {
  const tot   = engine?.tot   ?? 0
  const stage = engine?.stage ?? '—'
  const fc    = engine?.functional_ceiling ?? '—'
  const gap   = engine?.foundation_gap     ?? 0
  const lock  = engine?.lock ?? false
  const sig   = engine?.sig ?? { sensorimotor: 0, regulation: 0, cognitive: 0 }

  const t = Math.round(tot * 10) / 10
  const scoreColor = t >= 70 ? 'var(--good)' : t >= 45 ? 'var(--warn)' : 'var(--bad)'

  const dom = dominant(sig)
  const hasEntered = enteredCount > 0

  return (
    <div className="flex flex-wrap items-stretch gap-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">

      {/* Total Score */}
      <div className="flex flex-col items-center justify-center bg-[var(--warm-bg)] border border-[var(--border)] rounded-md px-3 py-1.5 min-w-[72px]">
        <div className="text-[8px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)] mb-0.5" style={OSWALD}>Total Score</div>
        <div className="text-[22px] font-bold leading-none" style={{ ...OSWALD, color: scoreColor }}>
          {hasEntered ? t.toFixed(1) : '—'}
        </div>
      </div>

      {/* Stage */}
      <div className="flex flex-col items-center justify-center bg-[var(--warm-bg)] border border-[var(--border)] rounded-md px-3 py-1.5 min-w-[72px]">
        <div className="text-[8px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)] mb-0.5" style={OSWALD}>Stage</div>
        <div className="text-[22px] font-bold leading-none" style={{ ...OSWALD, color: scoreColor }}>{hasEntered ? stage : '—'}</div>
      </div>

      {/* Functional Ceiling */}
      <div
        className="flex flex-col items-center justify-center bg-[var(--warm-bg)] border border-[var(--border)] rounded-md px-3 py-1.5 min-w-[72px]"
        title={gap > 0 ? `Gap ${gap} tầng so với Stage — nền cần được củng cố` : 'Stage và Functional Ceiling nhất quán'}
      >
        <div className="text-[8px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)] mb-0.5" style={OSWALD}>Functional Ceiling</div>
        <div className="text-[22px] font-bold leading-none" style={{ ...OSWALD, color: hasEntered ? (gap > 0 ? 'var(--warn)' : 'var(--good)') : 'var(--sub)' }}>
          {hasEntered ? fc : '—'}
        </div>
      </div>

      {/* Dominant Deficit badge */}
      <div className="flex-1 bg-[var(--warm-bg)] border border-[var(--border)] rounded-md px-3 py-1.5 min-w-[140px]">
        <div className="text-[8px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)] mb-0.5" style={OSWALD}>Dominant Deficit</div>
        <div className="text-[13px] font-bold tracking-[0.03em] text-[var(--red)]" style={OSWALD}>
          {hasEntered ? dom.name : '—'}
        </div>
        <div className="text-[10px] text-[var(--sub-2)] mt-0.5 leading-snug">
          {hasEntered ? dom.desc : 'Nhập điểm để bắt đầu phân tích.'}
        </div>
      </div>

      {/* Progress */}
      <div className="flex flex-col items-center justify-center bg-[var(--warm-bg)] border border-[var(--border)] rounded-md px-3 py-1.5 min-w-[80px]">
        <div className="text-[8px] font-semibold tracking-[0.1em] uppercase text-[var(--sub)] mb-0.5" style={OSWALD}>Đã chấm</div>
        <div className="text-[16px] font-bold leading-none text-[var(--sub-2)]" style={OSWALD}>{enteredCount}/{totalCount}</div>
      </div>

      {/* Lock warning — foundation layers too weak */}
      {hasEntered && lock && (
        <div className="bg-[var(--warn-bg)] border border-[var(--warn-bd)] rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed text-[var(--warn)] max-w-[200px]">
          <strong className="block text-[9px] tracking-[0.07em] uppercase mb-0.5" style={OSWALD}>⚠ Layer Lock</strong>
          Tầng nền yếu đang kéo điểm tầng trên xuống.
        </div>
      )}
    </div>
  )
}
