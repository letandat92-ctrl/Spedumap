'use client'

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { EngineResult } from '@/hooks/useBaseline'

interface BaselineChartsProps {
  engine: EngineResult
}

const LAYER_COLORS: Record<string, string> = {
  L0:'#8B1A1A', L1:'#A02020', L2:'#B83030', L3:'#C55030',
  L4:'#C87020', L5:'#4A8A60', L6:'#2A6A9A', L7:'#3A5AAA',
}

const LAYER_LABELS: Record<string, string> = {
  L0:'Sinh học', L1:'Thần kinh', L2:'Giác quan', L3:'Vận động',
  L4:'Xử lý', L5:'Giao tiếp', L6:'QL Cuộc sống', L7:'Học thuật',
}

const LAYER_W: Record<string, number> = {
  L0:18, L1:16, L2:14, L3:12, L4:12, L5:10, L6:10, L7:8,
}

export function BaselineCharts({ engine }: BaselineChartsProps) {
  const layerIds = ['L0','L1','L2','L3','L4','L5','L6','L7']

  // Radar: L7 ở top — đỉnh pyramid
  const radarData = [...layerIds].reverse().map(l => ({
    layer: LAYER_LABELS[l],
    score: parseFloat((engine.adj[l] ?? 0).toFixed(2)),
    fullMark: 4,
  }))

  // Bar: L7 ở top → L0 ở dưới — đúng với pyramid
  const barData = [...layerIds].reverse().map(l => ({
    layer: l,
    label: LAYER_LABELS[l],
    earned: parseFloat(((engine.adj[l] ?? 0) / 4 * LAYER_W[l]).toFixed(1)),
    max: LAYER_W[l],
    color: LAYER_COLORS[l],
  }))

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Radar */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
        <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-2">
          Layer Scores — Radar
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis
              dataKey="layer"
              tick={{ fontSize: 10, fill: '#6B7280' }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#B52020"
              fill="#B52020"
              fillOpacity={0.25}
              dot={{ r: 3, fill: '#B52020' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar */}
      <div className="bg-white border border-[var(--rule)] rounded-xl p-4">
        <div className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-2">
          Points Contribution
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 4, right: 32, bottom: 4, left: 56 }}
          >
            <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 9, fill: '#6B7280' }}
              width={52}
            />
            <Tooltip
              formatter={(value, _, props) => [
                `${value} / ${props.payload?.max} pts`,
                props.payload?.layer,
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            {/* Max bar (ghost) */}
            <Bar dataKey="max" fill="#F3F4F6" radius={[0, 2, 2, 0]} barSize={8} />
            {/* Earned bar */}
            <Bar dataKey="earned" radius={[0, 2, 2, 0]} barSize={8}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
