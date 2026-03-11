import { useState, useMemo } from 'react'
import {
  ShoppingBag, AlertTriangle,
  ArrowRight,
  MapPin, Store, Package, BarChart3, TrendingDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import { useStockMovements, useMovementTrend } from '@/hooks/useStockMovements'
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders'
import { MovementTrendChart } from '@/components/MovementTrendChart'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { useLocations } from '@/hooks/useLocations'
import { getMockLocationStock } from '@/hooks/useLocationStock'
import { Skeleton } from '@/components/ui/skeleton'
import type { Location } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = 'hsl(42, 60%, 55%)'

const ACTION_MAP: Record<string, { label: string; color: string; symbol: string }> = {
  in:         { label: 'Entrada',  color: 'text-emerald-400', symbol: '+' },
  out:        { label: 'Saída',    color: 'text-red-400',     symbol: '−' },
  adjustment: { label: 'Ajuste',   color: 'text-amber-400',   symbol: '~' },
  loss:       { label: 'Perda',    color: 'text-orange-400',  symbol: '−' },
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)


// ─── Subcomponents ───────────────────────────────────────────────────────────

function RealtimeIndicator() {
  const { connected, lastSyncAt, pendingCount } = useRealtimeStore()
  const syncLabel = lastSyncAt
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(lastSyncAt)
    : null

  return (
    <div className="flex items-center gap-2 text-xs bg-card border border-border rounded-full px-3 py-1.5 shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
      <span className={connected ? 'text-emerald-400' : 'text-white/30'}>
        {connected ? (syncLabel ? `Atualizado ${syncLabel}` : 'Tempo real') : 'Demonstração'}
      </span>
      {pendingCount > 0 && (
        <span className="text-gold">· {pendingCount} pend.</span>
      )}
    </div>
  )
}

// ─── Store Card ──────────────────────────────────────────────────────────────

interface StoreCardData {
  location: Location
  totalUnits: number
  productCount: number
  criticalCount: number
  healthPercent: number
}

function StoreCard({ data, onClick }: { data: StoreCardData; onClick: () => void }) {
  const { location, totalUnits, productCount, criticalCount, healthPercent } = data
  const hasCritical = criticalCount > 0

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
          <span className={`text-[10px] font-bold tabular-nums ${healthPercent >= 70 ? 'text-emerald-400' : healthPercent >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {healthPercent}%
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${healthPercent}%`,
              backgroundColor: healthPercent >= 70
                ? 'hsl(142, 65%, 45%)'
                : healthPercent >= 40
                  ? 'hsl(42, 60%, 55%)'
                  : 'hsl(0, 70%, 55%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Quick Stat Pill ─────────────────────────────────────────────────────────

function QuickStat({
  label,
  value,
  icon: Icon,
  accent = 'default',
  onClick,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  accent?: 'default' | 'gold' | 'red' | 'green'
  onClick?: () => void
}) {
  const accentColor = {
    default: 'text-foreground',
    gold: 'text-gold',
    red: 'text-red-400',
    green: 'text-emerald-400',
  }[accent]

  return (
    <div
      className={`bg-card border border-border rounded-xl p-3 flex items-center gap-3 ${onClick ? 'cursor-pointer hover:bg-secondary/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(240 18% 10%)' }}>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-black tabular-nums leading-none ${accentColor}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

// ─── Category Config (for bar colors) ────────────────────────────────────────

const CATEGORY_BAR: Record<string, { label: string; color: string; bg: string }> = {
  honey:      { label: 'Honey',      color: '#D4A843', bg: 'hsl(42 60% 55% / 0.15)' },
  cappuccino: { label: 'Cappuccino', color: '#8B6542', bg: 'hsl(25 35% 40% / 0.15)' },
  blended:    { label: 'Blended',    color: '#C4A882', bg: 'hsl(30 30% 55% / 0.15)' },
}

// ─── Stock Overview — Stores with category bars ──────────────────────────────

interface CategoryBreakdown {
  category: string
  total: number
  variants: { name: string; qty: number }[]
}

interface StoreOverviewData {
  location: Location
  categories: CategoryBreakdown[]
  totalUnits: number
}

function CategoryBar({
  cat,
  maxQty,
}: {
  cat: CategoryBreakdown
  maxQty: number
}) {
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
        className="flex-1 h-4 rounded overflow-hidden cursor-pointer relative"
        style={{ background: 'hsl(232 20% 12%)' }}
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

        {/* Tooltip on hover */}
        {showTooltip && cat.variants.length > 0 && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 rounded-lg border border-border shadow-xl min-w-[160px] pointer-events-none"
            style={{ background: 'hsl(232 25% 10%)' }}
          >
            <p className="text-[10px] font-bold mb-1.5" style={{ color: cfg.color }}>{cfg.label} — {cat.total} un</p>
            {cat.variants.map((v, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                <span className="text-[10px] text-muted-foreground truncate">{v.name}</span>
                <span className="text-[10px] font-bold text-foreground tabular-nums shrink-0">{v.qty}</span>
              </div>
            ))}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-border" style={{ background: 'hsl(232 25% 10%)' }} />
          </div>
        )}
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right shrink-0" style={{ color: cfg.color }}>
        {cat.total}
      </span>
    </div>
  )
}

function StoreOverviewRow({
  data,
  maxQty,
  onClick,
}: {
  data: StoreOverviewData
  maxQty: number
  onClick: () => void
}) {
  const shortName = (name: string) => name.replace('Degusto Club ', 'Degusto ')

  return (
    <div
      onClick={onClick}
      className="group py-4 px-3 rounded-xl cursor-pointer hover:bg-secondary/30 transition-all border border-transparent hover:border-border"
    >
      {/* Store header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={12} style={{ color: GOLD }} className="shrink-0" />
          <h3 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
            {shortName(data.location.name)}
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {data.location.city}
          </span>
        </div>
        <span className="text-sm font-black tabular-nums text-foreground">
          {data.totalUnits} <span className="text-[9px] text-muted-foreground font-medium">un</span>
        </span>
      </div>

      {/* Category bars */}
      <div className="flex flex-col gap-2">
        {data.categories.map(cat => (
          <CategoryBar key={cat.category} cat={cat} maxQty={maxQty} />
        ))}
      </div>
    </div>
  )
}

function StockOverview({
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
      <p className="text-[10px] text-muted-foreground mb-3">Passe o mouse sobre as barras para ver o detalhamento por variação</p>

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

// ─── DashboardPage ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: products, isLoading: loadingProducts } = useProducts()
  const { data: movements, isLoading: loadingMovements } = useStockMovements({ limit: 30 })
  const { data: orders, isLoading: loadingOrders } = useDeliveryOrders()
  const { data: trendData } = useMovementTrend(30)
  const { data: locations, isLoading: loadingLocations } = useLocations()

  // ── Derived stats ─────────────────────────────────────────────────────────
  const allLocationStock = getMockLocationStock()

  // Managed stores = everything except deposito (Casa Mr. Lion)
  const managedStores = (locations ?? []).filter(loc => loc.type !== 'deposito')

  // Per-store card data
  const storeCardsData: StoreCardData[] = managedStores.map(loc => {
    const stockEntries = allLocationStock.filter(ls => ls.location_id === loc.id && ls.quantity > 0)
    const totalUnits = stockEntries.reduce((sum, e) => sum + e.quantity, 0)
    const productCount = stockEntries.length

    const criticalCount = stockEntries.filter(ls => {
      const product = (products ?? []).find(p => p.id === ls.product_id)
      if (!product) return false
      return ls.quantity <= product.min_stock
    }).length

    const healthPercent = productCount > 0
      ? Math.round(((productCount - criticalCount) / productCount) * 100)
      : 100

    return { location: loc, totalUnits, productCount, criticalCount, healthPercent }
  })

  const criticalProducts = products?.filter(p => p.current_stock <= p.min_stock) ?? []
  const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed') ?? []
  const totalUnits = products?.reduce((acc, p) => acc + p.current_stock, 0) ?? 0

  // Store overview: per-store, grouped by category (honey/cappuccino/blended)
  const storeOverviewData: StoreOverviewData[] = (() => {
    if (!products || managedStores.length === 0) return []

    const categoryOrder = ['honey', 'cappuccino', 'blended']

    return managedStores.map(loc => {
      const categories: CategoryBreakdown[] = categoryOrder.map(cat => {
        const catProducts = products.filter(p => p.active && p.category === cat)
        const variants = catProducts.map(p => {
          const entry = allLocationStock.find(
            ls => ls.product_id === p.id && ls.location_id === loc.id
          )
          return { name: p.name, qty: entry?.quantity ?? 0 }
        })
        return {
          category: cat,
          total: variants.reduce((s, v) => s + v.qty, 0),
          variants,
        }
      })

      const totalUnits = categories.reduce((s, c) => s + c.total, 0)
      return { location: loc, categories, totalUnits }
    })
  })()


  // Today's outgoing
  const todayOut = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (movements ?? [])
      .filter(m => (m.action === 'out' || m.action === 'loss') && m.created_at.startsWith(today))
      .reduce((s, m) => s + m.quantity, 0)
  }, [movements])

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const loading = loadingProducts || loadingMovements || loadingOrders || loadingLocations

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Skeleton className="h-7 w-48 bg-secondary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 bg-secondary rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 bg-secondary rounded-xl" />)}
        </div>
        <Skeleton className="h-64 bg-secondary rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Painel de Controle
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-wide capitalize">{todayFormatted}</p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          label="Garrafas em estoque"
          value={totalUnits}
          icon={BarChart3}
          accent="gold"
        />
        <QuickStat
          label="Saídas hoje"
          value={todayOut}
          icon={TrendingDown}
          accent={todayOut > 0 ? 'red' : 'default'}
          onClick={() => navigate('/entrada')}
        />
        <QuickStat
          label="Alertas críticos"
          value={criticalProducts.length}
          icon={AlertTriangle}
          accent={criticalProducts.length > 0 ? 'red' : 'green'}
          onClick={() => navigate('/produtos', { state: { criticalOnly: true } })}
        />
        <QuickStat
          label="Pedidos pendentes"
          value={pendingOrders.length}
          icon={ShoppingBag}
          accent={pendingOrders.length > 0 ? 'gold' : 'default'}
          onClick={() => navigate('/pedidos')}
        />
      </div>

      {/* ── Store Cards — HERO section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Store size={14} style={{ color: GOLD }} />
          <h2 className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Pontos de Venda
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {storeCardsData.map(data => (
            <StoreCard
              key={data.location.id}
              data={data}
              onClick={() => navigate('/entrada', { state: { locationFilter: data.location.id } })}
            />
          ))}
        </div>
      </div>

      {/* ── Stock Overview + Recent Movements — side by side ── */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Left: Stock by store */}
        <StockOverview
          data={storeOverviewData}
          onStoreClick={(locId) => navigate('/entrada', { state: { locationFilter: locId } })}
        />

        {/* Right: Recent movements */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
              Movimentações Recentes
            </p>
            <button
              onClick={() => navigate('/entrada')}
              className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Ver todas <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-0.5">
            {movements?.slice(0, 10).map(m => {
              const action = ACTION_MAP[m.action] ?? { label: m.action, color: 'text-muted-foreground', symbol: '·' }
              const when = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              const locName = (m.location as { name: string } | undefined)?.name
              const shortLoc = locName?.replace('Degusto Club ', 'Degusto ').replace(' Delivery', '') ?? null
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className={`text-sm font-black w-4 text-center shrink-0 ${action.color}`}>
                    {action.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(m.product as { name: string } | undefined)?.name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {shortLoc && (
                        <>
                          <MapPin size={9} className="shrink-0" />
                          <span className="truncate">{shortLoc}</span>
                          <span className="text-border">·</span>
                        </>
                      )}
                      {when} · {(m.profile as { full_name: string } | undefined)?.full_name ?? 'operador'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${action.color}`}>{action.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{m.quantity} un</p>
                  </div>
                </div>
              )
            })}
            {movements?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Sem movimentações</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Trend Chart + Delivery Orders ── */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Trend chart */}
        {trendData && trendData.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
                Entradas x Saídas — 30 dias
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
                  Entradas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
                  Saídas
                </span>
              </div>
            </div>
            <div className="h-[220px] md:h-[260px]">
              <MovementTrendChart data={trendData} height={-1} />
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sem dados de tendência</p>
          </div>
        )}

        {/* Delivery Orders summary */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
              Pedidos Delivery
            </p>
            <button
              onClick={() => navigate('/pedidos')}
              className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight size={11} />
            </button>
          </div>
          {orders && orders.length > 0 ? (
            <div className="space-y-0.5">
              {orders.slice(0, 8).map(o => {
                const statusCfg: Record<string, { label: string; color: string }> = {
                  pending:   { label: 'Pendente',   color: 'text-amber-400' },
                  confirmed: { label: 'Confirmado', color: 'text-gold' },
                  delivered: { label: 'Entregue',   color: 'text-emerald-400' },
                  cancelled: { label: 'Cancelado',  color: 'text-red-400' },
                }
                const st = statusCfg[o.status] ?? { label: o.status, color: 'text-muted-foreground' }
                const locName = (o.location as { name: string } | undefined)?.name
                const shortLoc = locName?.replace('Degusto Club ', 'Degusto ').replace(' Delivery', '') ?? null
                const when = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                const itemCount = o.items.reduce((s, i) => s + i.quantity, 0)
                return (
                  <div key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {o.reference ?? o.address ?? `Pedido #${o.id.slice(-4)}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {shortLoc && (
                          <>
                            <MapPin size={9} className="shrink-0" />
                            <span className="truncate">{shortLoc}</span>
                            <span className="text-border">·</span>
                          </>
                        )}
                        {when} · {itemCount} un
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${st.color}`}>{st.label}</p>
                      {o.total_value != null && (
                        <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(o.total_value)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sem pedidos</p>
          )}
        </div>
      </div>
    </div>
  )
}
