import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { TrendDataPoint } from '@/hooks/useStockMovements'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name === 'in' ? 'Entradas' : 'Saídas'}: {p.value} un
        </p>
      ))}
    </div>
  )
}

// ─── MovementTrendChart ───────────────────────────────────────────────────────

interface MovementTrendChartProps {
  data: TrendDataPoint[]
  /**
   * Height in px. Pass -1 to fill parent container (parent must have explicit height).
   * Defaults to 240.
   */
  height?: number
}

export function MovementTrendChart({ data, height = 240 }: MovementTrendChartProps) {
  const resolvedHeight = height === -1 ? '100%' : height
  // Show every Nth label to avoid clutter (max ~8 ticks visible)
  const step = Math.max(1, Math.floor(data.length / 8))
  const filteredData = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <ResponsiveContainer width="100%" height={resolvedHeight}>
      <LineChart
        data={filteredData}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(240 15% 14%)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <Line
          type="monotone"
          dataKey="in"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#22c55e' }}
        />
        <Line
          type="monotone"
          dataKey="out"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#ef4444' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
