import { AlertTriangle, ArrowRight, MapPin, Package } from 'lucide-react'
import { GOLD } from './_shared'
import type { StoreCardData } from './_shared'

interface StoreCardProps {
  data: StoreCardData
  onClick: () => void
}

export function StoreCard({ data, onClick }: StoreCardProps) {
  const { location, totalUnits, productCount, criticalCount, healthPercent } = data
  const hasCritical = criticalCount > 0

  const healthColor =
    healthPercent >= 70 ? 'text-emerald-400'
    : healthPercent >= 40 ? 'text-amber-400'
    : 'text-red-400'

  const healthBar =
    healthPercent >= 70 ? 'hsl(var(--success))'
    : healthPercent >= 40 ? 'hsl(var(--gold))'
    : 'hsl(var(--destructive))'

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border border-l-4 rounded-xl p-4 cursor-pointer hover:bg-secondary/50 transition-all duration-200 hover:scale-[1.01] group"
      style={{ borderLeftColor: GOLD }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground truncate group-hover:text-gold transition-colors">
            {location.name}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin size={9} className="shrink-0" />
            {location.city}{location.state ? `, ${location.state}` : ''}
          </p>
        </div>
        <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-gold/70 transition-colors shrink-0 mt-1" />
      </div>

      <div className="mb-3">
        <p className="text-3xl font-black tabular-nums text-foreground leading-none">{totalUnits}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">garrafas em estoque</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Package size={10} />
          {productCount} produto{productCount !== 1 ? 's' : ''}
        </span>
        {hasCritical ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
            <AlertTriangle size={10} />
            {criticalCount} crít.
          </span>
        ) : (
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
            OK
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Saúde</span>
          <span className={`text-[10px] font-bold tabular-nums ${healthColor}`}>
            {healthPercent}%
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${healthPercent}%`, backgroundColor: healthBar }}
          />
        </div>
      </div>
    </div>
  )
}
