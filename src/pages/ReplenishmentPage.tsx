import { useMemo } from 'react'
import { Package, MapPin, AlertCircle, Download, ShoppingCart } from 'lucide-react'
import { useReplenishmentSuggestions } from '@/hooks/useReplenishmentSuggestions'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReplenishmentItem } from '@/lib/mockDemoData'

const PRIORITY_CFG: Record<ReplenishmentItem['priority'], { label: string; color: string; bg: string }> = {
  high:   { label: 'Urgente',  color: 'text-destructive', bg: 'bg-destructive/10' },
  medium: { label: 'Moderado', color: 'text-warning',     bg: 'bg-warning/10' },
  low:    { label: 'Baixo',    color: 'text-info',        bg: 'bg-info/10' },
}

function ItemCard({ item }: { item: ReplenishmentItem }) {
  const p = PRIORITY_CFG[item.priority]
  const deficit = item.minStock - item.currentStock

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{item.productName}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{item.sku}</p>
        </div>
        <span className={`text-[11px] font-semibold ${p.color} ${p.bg} px-2 py-0.5 rounded-full shrink-0`}>
          {p.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <MapPin size={11} className="text-gold" />
        <span className="text-xs text-muted-foreground">{item.locationName}</span>
      </div>

      {/* Stock bar */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Atual / Mínimo</span>
          <span className="tabular-nums">
            <span className={item.currentStock === 0 ? 'text-destructive font-bold' : 'text-foreground font-semibold'}>
              {item.currentStock}
            </span>
            <span className="text-muted-foreground"> / {item.minStock}</span>
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              item.priority === 'high' ? 'bg-destructive' : item.priority === 'medium' ? 'bg-warning' : 'bg-info'
            }`}
            style={{
              width: `${Math.max(4, Math.min(100, (item.currentStock / item.minStock) * 100))}%`,
            }}
          />
        </div>
        {deficit > 0 && (
          <p className="text-[10px] text-destructive flex items-center gap-1">
            <AlertCircle size={10} /> Faltam {deficit} un para atingir o mínimo
          </p>
        )}
      </div>

      {/* Suggested */}
      <div className="pt-3 border-t border-border/50 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sugestão de compra</p>
          <p className="text-2xl font-black tabular-nums text-gold leading-none mt-1">
            +{item.suggestedQuantity}
            <span className="text-[10px] text-muted-foreground font-normal ml-1">un</span>
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-xs bg-gold/10 text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/20 transition">
          <ShoppingCart size={12} />
          Adicionar
        </button>
      </div>
    </div>
  )
}

export function ReplenishmentPage() {
  const { data: items, isLoading } = useReplenishmentSuggestions()

  const byLocation = useMemo(() => {
    const map = new Map<string, ReplenishmentItem[]>()
    items?.forEach(it => {
      const list = map.get(it.locationName) ?? []
      list.push(it)
      map.set(it.locationName, list)
    })
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [items])

  const kpis = useMemo(() => {
    const high = items?.filter(i => i.priority === 'high').length ?? 0
    const totalSuggested = items?.reduce((s, i) => s + i.suggestedQuantity, 0) ?? 0
    const locations = new Set(items?.map(i => i.locationName)).size
    return { high, totalSuggested, locations, total: items?.length ?? 0 }
  }, [items])

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48 bg-secondary" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 bg-secondary rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Reposição Sugerida
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Produtos com estoque abaixo do mínimo — sugestões por loja
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-sm bg-gold text-primary-foreground font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition">
          <Download size={14} />
          Gerar ordem de compra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-destructive/30 rounded-xl p-3">
          <p className="text-2xl font-black tabular-nums text-destructive">{kpis.high}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Urgentes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-2xl font-black tabular-nums text-foreground">{kpis.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Produtos totais</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-2xl font-black tabular-nums text-gold">+{kpis.totalSuggested}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Unidades sugeridas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-2xl font-black tabular-nums text-foreground">{kpis.locations}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Lojas afetadas</p>
        </div>
      </div>

      {/* Grouped by location */}
      {byLocation.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Package size={28} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-foreground">Tudo em dia</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum produto precisa de reposição agora</p>
        </div>
      ) : (
        byLocation.map(([location, locItems]) => (
          <div key={location}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-gold" />
              <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
                {location}
              </h2>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{locItems.length} item{locItems.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {locItems.map(i => <ItemCard key={`${i.productId}-${i.locationName}`} item={i} />)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
