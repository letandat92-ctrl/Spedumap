import type { EngineResult } from '@/hooks/useBaseline'

interface BaselineKPIProps {
  engine: EngineResult
}

export function BaselineKPI({ engine }: BaselineKPIProps) {
  const tot   = engine?.tot   ?? 0
  const stage = engine?.stage ?? '—'
  const fc    = engine?.functional_ceiling ?? '—'
  const gap   = engine?.foundation_gap     ?? 0

  const scoreColor = tot >= 70 ? 'text-[var(--green)]'
    : tot >= 45 ? 'text-[var(--gold)]'
    : 'text-[var(--red)]'

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Total Score */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4 text-center">
        <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Total Score</div>
        <div className={`text-3xl font-mono font-bold ${scoreColor}`}>
          {engine ? tot.toFixed(1) : '—'}
        </div>
        <div className="text-xs text-[var(--ink-3)] mt-1">/ 100</div>
      </div>

      {/* Stage */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4 text-center">
        <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Stage</div>
        <div className="text-3xl font-mono font-bold text-[var(--navy)]">{stage}</div>
        <div className="text-xs text-[var(--ink-3)] mt-1">Foundation</div>
      </div>

      {/* Functional Ceiling */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4 text-center">
        <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-1">Functional Ceiling</div>
        <div className={`text-3xl font-mono font-bold ${gap > 2 ? 'text-[var(--gold)]' : 'text-[var(--navy)]'}`}>
          {fc}
        </div>
        {gap > 0 && (
          <div className="text-xs text-[var(--gold)] mt-1">Gap {gap} tầng</div>
        )}
      </div>
    </div>
  )
}
