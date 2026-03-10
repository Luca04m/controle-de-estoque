import { useState } from 'react'
import {
  TrendingUp, TrendingDown, ShoppingBag, AlertTriangle, PackagePlus,
  Activity, DollarSign, ArrowRight, Clock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import { useStockMovements, useMovementTrend } from '@/hooks/useStockMovements'
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders'
import { MovementTrendChart } from '@/components/MovementTrendChart'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { Skeleton } from '@/components/ui/skeleton'
import { getProductImage } from '@/lib/productImages'
import type { ProductCategory } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = 'hsl(42, 60%, 55%)'

const ACTION_MAP: Record<string, { label: string; color: string; symbol: string }> = {
  in:         { label: 'Entrada',  color: 'text-emerald-400', symbol: '+' },
  out:        { label: 'Saída',    color: 'text-red-400',     symbol: '−' },
  adjustment: { label: 'Ajuste',  color: 'text-amber-400',   symbol: '~' },
  loss:       { label: 'Perda',   color: 'text-orange-400',  symbol: '−' },
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  honey:      { label: 'Honey',      color: '#D4A843', bg: 'hsl(42 60% 55% / 0.12)' },
  cappuccino: { label: 'Cappuccino', color: '#fb923c', bg: 'hsl(25 90% 55% / 0.12)' },
  blended:    { label: 'Blended',    color: '#a78bfa', bg: 'hsl(270 60% 55% / 0.12)' },
  acessorio:  { label: 'Acessório',  color: '#94a3b8', bg: 'hsl(220 15% 55% / 0.12)' },
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

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  accent = 'none',
  trend,
  onClick,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: 'gold' | 'red' | 'green' | 'none'
  trend?: { value: number; label: string }
  onClick?: () => void
}) {
  const accentBorder = {
    gold:  'border-l-[hsl(42,60%,55%)]',
    red:   'border-l-red-500',
    green: 'border-l-emerald-500',
    none:  'border-l-border',
  }[accent]

  const accentValue = {
    gold:  'text-gold',
    red:   'text-red-400',
    green: 'text-emerald-400',
    none:  'text-foreground',
  }[accent]

  return (
    <div
      className={`relative bg-card border border-border border-l-4 ${accentBorder} rounded-xl p-4 overflow-hidden ${onClick ? 'cursor-pointer hover:bg-secondary/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <Icon size={36} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.06] text-foreground" aria-hidden />
      <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">{title}</p>
      <p className={`text-2xl font-black leading-none tabular-nums ${accentValue}`}>{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ml-auto ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.value >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.label}
          </span>
        )}
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
  const [showFinancial, setShowFinancial] = useState(false)

  // ── Derived stats ─────────────────────────────────────────────────────────
  const criticalProducts = products?.filter(p => p.current_stock <= p.min_stock) ?? []

  const today = new Date().toISOString().slice(0, 10)
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().slice(0, 10)

  const todayMovements     = movements?.filter(m => m.created_at.startsWith(today)) ?? []
  const yesterdayMovements = movements?.filter(m => m.created_at.startsWith(yesterday)) ?? []

  const todayIns      = todayMovements.filter(m => m.action === 'in').reduce((s, m) => s + m.quantity, 0)
  const yesterdayIns  = yesterdayMovements.filter(m => m.action === 'in').reduce((s, m) => s + m.quantity, 0)

  const pendingOrders   = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed') ?? []
  const deliveredToday  = orders?.filter(o => o.status === 'delivered' && o.delivered_at?.startsWith(today)) ?? []
  const deliveredYesterday = orders?.filter(o => o.status === 'delivered' && o.delivered_at?.startsWith(yesterday)) ?? []

  function calcVariation(current: number, previous: number): { value: number; label: string } | undefined {
    if (previous === 0 && current === 0) return undefined
    if (previous === 0) return { value: 100, label: '+100% vs ontem' }
    const pct = Math.round(((current - previous) / previous) * 100)
    const sign = pct >= 0 ? '+' : ''
    return { value: pct, label: `${sign}${pct}% vs ontem` }
  }

  const stockValue = products?.reduce((acc, p) => acc + p.current_stock * (p.price_sale ?? 0), 0) ?? 0
  const costValue  = products?.reduce((acc, p) => acc + p.current_stock * (p.price_cost ?? 0), 0) ?? 0
  const margin     = stockValue > 0 ? Math.round(((stockValue - costValue) / stockValue) * 100) : 0
  const totalUnits = products?.reduce((acc, p) => acc + p.current_stock, 0) ?? 0

  // Low-stock products (sorted by criticality then stock %)
  const sortedProducts = [...(products ?? [])].sort((a, b) => {
    const aCrit = a.current_stock <= a.min_stock ? 0 : 1
    const bCrit = b.current_stock <= b.min_stock ? 0 : 1
    if (aCrit !== bCrit) return aCrit - bCrit
    const aPct = a.min_stock > 0 ? a.current_stock / a.min_stock : 1
    const bPct = b.min_stock > 0 ? b.current_stock / b.min_stock : 1
    return aPct - bPct
  })

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const loading = loadingProducts || loadingMovements || loadingOrders

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Skeleton className="h-7 w-48 bg-secondary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-secondary rounded-xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <Skeleton className="h-64 bg-secondary rounded-xl" />
          <Skeleton className="h-64 bg-secondary rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Visão Geral
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-wide capitalize">{todayFormatted}</p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* ── Critical alert (only when there are critical products) ── */}
      {criticalProducts.length > 0 && (
        <button
          onClick={() => navigate('/produtos', { state: { criticalOnly: true } })}
          className="w-full rounded-xl p-3 flex items-center gap-3 transition-colors hover:opacity-90"
          style={{ background: 'hsl(0 60% 10% / 0.7)', border: '1px solid hsl(0 70% 28% / 0.5)' }}
        >
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span className="text-sm font-semibold text-red-400 flex-1 text-left">
            {criticalProducts.length} produto{criticalProducts.length > 1 ? 's' : ''} em estoque crítico
          </span>
          <ArrowRight size={14} className="text-red-400/60 shrink-0" />
        </button>
      )}

      {/* ── KPI Row: 4 cards operacionais ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Estoque Crítico"
          value={criticalProducts.length}
          sub={criticalProducts.length > 0 ? 'precisam reposição' : 'tudo ok'}
          accent={criticalProducts.length > 0 ? 'red' : 'green'}
          icon={AlertTriangle}
          onClick={() => navigate('/produtos', { state: { criticalOnly: true } })}
        />
        <KpiCard
          title="Pedidos Pendentes"
          value={pendingOrders.length}
          sub="aguardando entrega"
          accent={pendingOrders.length > 0 ? 'gold' : 'none'}
          icon={ShoppingBag}
          onClick={() => navigate('/pedidos')}
        />
        <KpiCard
          title="Entregas Hoje"
          value={deliveredToday.length}
          sub="pedidos entregues"
          accent="green"
          icon={Activity}
          trend={calcVariation(deliveredToday.length, deliveredYesterday.length)}
        />
        <KpiCard
          title="Entradas Hoje"
          value={todayIns}
          sub="unidades adicionadas"
          accent="green"
          icon={PackagePlus}
          trend={calcVariation(todayIns, yesterdayIns)}
        />
      </div>

      {/* ── Financial strip (collapsible — secondary info) ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowFinancial(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DollarSign size={14} className="text-gold" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financeiro</span>
            <span className="text-sm font-bold text-gold tabular-nums">{formatCurrency(stockValue)}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · Custo {formatCurrency(costValue)} · Margem {margin}%
            </span>
          </div>
          {showFinancial ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>
        {showFinancial && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pt-1 border-t border-border">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor de Venda</p>
              <p className="text-lg font-black text-gold tabular-nums mt-0.5">{formatCurrency(stockValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor de Custo</p>
              <p className="text-lg font-black text-foreground tabular-nums mt-0.5">{formatCurrency(costValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Margem Bruta</p>
              <p className={`text-lg font-black tabular-nums mt-0.5 ${margin > 30 ? 'text-emerald-400' : margin > 15 ? 'text-gold' : 'text-red-400'}`}>{margin}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total em Estoque</p>
              <p className="text-lg font-black text-foreground tabular-nums mt-0.5">{totalUnits} un</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Stock Health + Trend ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Stock health list */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">Nível de Estoque</p>
            <button
              onClick={() => navigate('/produtos')}
              className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-3">
            {sortedProducts.slice(0, 8).map(p => {
              const pct = p.min_stock > 0 ? Math.min(100, (p.current_stock / (p.min_stock * 3)) * 100) : 100
              const isCrit = p.current_stock <= p.min_stock
              const img = getProductImage(p.sku)
              const catCfg = CATEGORY_CONFIG[p.category as ProductCategory]

              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {isCrit && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse z-10 ring-2 ring-background" />
                    )}
                    <div
                      className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ background: 'hsl(240 18% 8%)' }}
                    >
                      {img ? (
                        <img src={img} alt={p.name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: catCfg?.color }}>
                          {p.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-foreground truncate max-w-[140px]">{p.name}</span>
                      <span className={`text-xs font-bold tabular-nums shrink-0 ml-2 ${isCrit ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {p.current_stock} un
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isCrit ? 'hsl(0, 70%, 55%)' : GOLD,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {!products?.length && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto cadastrado</p>
            )}
          </div>
        </div>

        {/* Trend chart */}
        {trendData && trendData.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
                Tendência — 30 dias
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

      </div>

      {/* ── Recent Movements + Pending Orders ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Recent movements */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
              Movimentações Recentes
            </p>
            <button
              onClick={() => navigate('/relatorios')}
              className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Ver todas <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-0.5">
            {movements?.slice(0, 6).map(m => {
              const action = ACTION_MAP[m.action] ?? { label: m.action, color: 'text-muted-foreground', symbol: '·' }
              const when = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <span className={`text-sm font-black w-4 text-center shrink-0 ${action.color}`}>
                    {action.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(m.product as { name: string } | undefined)?.name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
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

        {/* Pending orders */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
              Pedidos em Aberto
            </p>
            <button
              onClick={() => navigate('/pedidos')}
              className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight size={11} />
            </button>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingBag size={28} className="text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum pedido em aberto</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingOrders.slice(0, 6).map(o => {
                const isPending = o.status === 'pending'
                const itemCount = Array.isArray(o.items) ? o.items.length : 0
                const when = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                return (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: 'hsl(240 18% 6%)', borderColor: 'hsl(240 15% 12%)' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: isPending ? 'hsl(42 60% 55%)' : 'hsl(142 65% 45%)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(o.profile as { full_name: string } | undefined)?.full_name ?? `Pedido #${o.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {itemCount} item{itemCount !== 1 ? 's' : ''} · {when}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold tabular-nums text-gold">
                        {o.total_value ? formatCurrency(o.total_value) : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {isPending ? 'Pendente' : 'Confirmado'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
