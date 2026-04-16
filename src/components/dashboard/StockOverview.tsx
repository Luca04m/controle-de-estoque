import { useState } from 'react'
import { MapPin, Store } from 'lucide-react'
import { GOLD, CATEGORY_BAR, shortLocationName } from './_shared'
import type { CategoryBreakdown, StoreOverviewData } from './_shared'

// ─── CategoryBar ─────────────────────────────────────────────────────────────

function CategoryBar({ cat, maxQty }: { cat: CategoryBreakdown; maxQty: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const cfg = CATEGORY_BAR[cat.category]
  if (!cfg) return null

  const pct = maxQty > 0 ? Math.max(3, (cat.total / maxQty) * 100) : 0

  return (
    <div className="flex items-center gap-2 relative">
      <span className="text-[9px] font-medium w-[72px] text-right shrink-0" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
      <div
        className="flex-1 h-4 rounded overflow-hidden cursor-pointer relative bg-secondary"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className="h-full rounded transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color})`,
          }}
        />

        {showTooltip && cat.variants.length > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 rounded-lg border border-border shadow-xl min-w-[160px] pointer-events-none bg-popover">
            <p className="text-[10px] font-bold mb-1.5" style={{ color: cfg.color }}>
              {cfg.label} — {cat.total} un
            </p>
            {cat.variants.map((v, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                <span className="text-[10px] text-muted-foreground truncate">{v.name}</span>
                <span className="text-[10px] font-bold text-foreground tabular-nums shrink-0">{v.qty}</span>
              </div>
            ))}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-border bg-popover" />
          </div>
        )}
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right shrink-0" style={{ color: cfg.color }}>
        {cat.total}
      </span>
    </div>
  )
}

// ─── StoreOverviewRow ────────────────────────────────────────────────────────

function StoreOverviewRow({
  data,
  maxQty,
  onClick,
}: {
  data: StoreOverviewData
  maxQty: number
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group py-4 px-3 rounded-xl cursor-pointer hover:bg-secondary/30 transition-all border border-transparent hover:border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={12} style={{ color: GOLD }} className="shrink-0" />
          <h3 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
            {shortLocationName(data.location.name)}
          </h3>
          <span className="text-[10px] text-muted-foreground">{data.location.city}</span>
        </div>
        <span className="text-sm font-black tabular-nums text-foreground">
          {data.totalUnits} <span className="text-[9px] text-muted-foreground font-medium">un</span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {data.categories.map(cat => (
          <CategoryBar key={cat.category} cat={cat} maxQty={maxQty} />
        ))}
      </div>
    </div>
  )
}

// ─── StockOverview (public) ──────────────────────────────────────────────────

export function StockOverview({
  data,
  onStoreClick,
}: {
  data: StoreOverviewData[]
  onStoreClick: (locationId: string) => void
}) {
  if (data.length === 0) return null

  const maxQty = Math.max(...data.flatMap(s => s.categories.map(c => c.total)), 1)

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Store size={14} style={{ color: GOLD }} />
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Estoque por Loja
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          {Object.entries(CATEGORY_BAR).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1">
              <span className="w-5 h-2 rounded-sm" style={{ background: cfg.color }} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Passe o mouse sobre as barras para ver o detalhamento por variação
      </p>

      <div className="divide-y divide-border/40">
        {data.map(row => (
          <StoreOverviewRow
            key={row.location.id}
            data={row}
            maxQty={maxQty}
            onClick={() => onStoreClick(row.location.id)}
          />
        ))}
      </div>
    </div>
  )
}
