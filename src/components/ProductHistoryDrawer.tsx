import { useState } from 'react'
import { X, AlertTriangle, Package } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useProductMovements } from '@/hooks/useStockMovements'
import type { Product, StockMovement, MovementAction } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = 'hsl(42, 60%, 55%)'

const ACTION_CONFIG: Record<MovementAction, { label: string; color: string }> = {
  in:         { label: 'Entrada', color: '#22c55e' },
  out:        { label: 'Saída',   color: '#ef4444' },
  adjustment: { label: 'Ajuste', color: '#f59e0b' },
  loss:       { label: 'Perda',  color: '#f97316' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reconstruct historical stock levels from movements (most-recent-first order) */
function calculateStockHistory(
  currentStock: number,
  movements: StockMovement[]
): { date: string; stock: number }[] {
  let stock = currentStock
  const history: { date: string; stock: number }[] = [
    { date: movements[0]?.created_at ?? new Date().toISOString(), stock },
  ]

  for (const m of movements) {
    const delta = m.action === 'in'
      ? -m.quantity
      : m.action === 'adjustment'
      ? -m.quantity
      : m.quantity // reversal: going back in time
    stock += delta
    history.push({ date: m.created_at, stock: Math.max(0, stock) })
  }

  return history.reverse().map((h) => ({
    date: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    stock: h.stock,
  }))
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

function StockTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold" style={{ color: GOLD }}>
        {payload[0].value} un
      </p>
    </div>
  )
}

// ─── ProductHistoryDrawer ─────────────────────────────────────────────────────

interface ProductHistoryDrawerProps {
  product: Product | null
  onClose: () => void
}

const PAGE_SIZE = 50

export function ProductHistoryDrawer({ product, onClose }: ProductHistoryDrawerProps) {
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useProductMovements(product?.id ?? null, PAGE_SIZE, offset)

  if (!product) return null

  const movements = data?.data ?? []
  const totalCount = data?.count ?? 0
  const hasMore = offset + PAGE_SIZE < totalCount
  const isCritical = product.current_stock <= product.min_stock

  const stockHistory = movements.length > 0
    ? calculateStockHistory(product.current_stock, movements)
    : []

  return (
    <>
      {/* Backdrop — z-[60] to sit above sidebar (z-40) and mobile nav (z-40) */}
      <div
        className="fixed inset-0 z-[60] bg-black/70"
        onClick={onClose}
      />

      {/* Drawer — z-[61] above backdrop */}
      <div
        className="fixed z-[61] bg-card border-border shadow-2xl flex flex-col
          inset-x-0 bottom-0 h-[85vh] rounded-t-2xl border
          sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px] sm:h-full sm:rounded-none sm:rounded-l-2xl sm:border-l"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'hsl(240 18% 8%)' }}
          >
            <Package size={18} style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-[11px] text-muted-foreground">{product.sku}</span>
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  isCritical ? 'text-red-400' : 'text-foreground'
                }`}
              >
                {product.current_stock} un
                {isCritical && <AlertTriangle size={10} className="inline ml-1" />}
              </span>
              <span className="text-[11px] text-muted-foreground">
                (mín {product.min_stock})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Mini area chart */}
          {stockHistory.length > 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
                Evolução do Estoque
              </p>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stockHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={GOLD} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                    />
                    <Tooltip content={<StockTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                    <Area
                      type="monotone"
                      dataKey="stock"
                      stroke={GOLD}
                      strokeWidth={2}
                      fill="url(#stockGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Movement list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Movimentações
              </p>
              {totalCount > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {Math.min(offset + PAGE_SIZE, totalCount)} de {totalCount}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full bg-secondary rounded-xl" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Package size={28} className="text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movements.map((mv) => {
                  const cfg = ACTION_CONFIG[mv.action] ?? { label: mv.action, color: '#94a3b8' }
                  const operator = (mv.profile as { full_name?: string } | undefined)?.full_name ?? '—'
                  const dateStr = new Date(mv.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={mv.id}
                      className="rounded-xl border border-border p-3 space-y-1.5"
                      style={{ borderLeftWidth: '3px', borderLeftColor: cfg.color }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{dateStr}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ color: cfg.color, background: `${cfg.color}18` }}
                          >
                            {cfg.label}
                          </span>
                          <span
                            className="text-sm font-black tabular-nums"
                            style={{ color: cfg.color }}
                          >
                            {mv.action === 'in' ? '+' : mv.action === 'out' || mv.action === 'loss' ? '−' : ''}
                            {Math.abs(mv.quantity)} un
                          </span>
                        </div>
                      </div>
                      {(mv.notes || operator !== '—') && (
                        <div className="flex items-start justify-between gap-2">
                          {mv.notes && (
                            <span className="text-[11px] text-muted-foreground truncate flex-1">{mv.notes}</span>
                          )}
                          <span className="text-[11px] text-muted-foreground/60 shrink-0 ml-auto">{operator}</span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {hasMore && (
                  <button
                    onClick={() => setOffset(o => o + PAGE_SIZE)}
                    className="w-full mt-2 h-9 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all"
                  >
                    Carregar mais ({totalCount - (offset + PAGE_SIZE)} restantes)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
