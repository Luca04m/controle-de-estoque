import type { StockMovement, MovementAction } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<MovementAction, { label: string; color: string; bg: string }> = {
  in:         { label: 'Entrada', color: '#22c55e', bg: 'hsl(142 65% 40% / 0.12)' },
  out:        { label: 'Saída',   color: '#ef4444', bg: 'hsl(0 70% 55% / 0.12)'   },
  adjustment: { label: 'Ajuste', color: '#f59e0b', bg: 'hsl(42 60% 55% / 0.12)'  },
  loss:       { label: 'Perda',  color: '#f97316', bg: 'hsl(25 90% 50% / 0.12)'   },
}

// ─── MovementCard ─────────────────────────────────────────────────────────────

interface MovementCardProps {
  movement: StockMovement
}

export function MovementCard({ movement: m }: MovementCardProps) {
  const cfg = ACTION_CONFIG[m.action] ?? { label: m.action, color: '#94a3b8', bg: 'transparent' }

  const productName = (m.product as { name: string } | undefined)?.name ?? '—'
  const productSku  = (m.product as { sku: string } | undefined)?.sku ?? ''
  const operator    = (m.profile as { full_name: string } | undefined)?.full_name ?? '—'

  const dateStr = new Date(m.created_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className="rounded-xl border border-border bg-card p-3.5 space-y-2.5"
      style={{ borderLeftWidth: '3px', borderLeftColor: cfg.color }}
    >
      {/* Row 1: date + type badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">{dateStr}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Row 2: product name + quantity */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{productName}</p>
          {productSku && (
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{productSku}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-lg font-black tabular-nums"
            style={{ color: cfg.color }}
          >
            {m.quantity > 0 ? '+' : ''}{m.quantity}
          </span>
          <p className="text-[10px] text-muted-foreground">un</p>
        </div>
      </div>

      {/* Row 3: operator + notes */}
      {(operator !== '—' || m.notes) && (
        <div className="flex items-start justify-between gap-2 pt-1.5 border-t border-border/60">
          <span className="text-[11px] text-muted-foreground">{operator}</span>
          {m.notes && (
            <span className="text-[11px] text-muted-foreground text-right truncate max-w-[140px]" title={m.notes}>
              {m.notes}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
