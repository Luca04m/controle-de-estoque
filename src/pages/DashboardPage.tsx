import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  AlertTriangle,
  Store,
  BarChart3,
  TrendingDown,
} from 'lucide-react'

import { useProducts } from '@/hooks/useProducts'
import { useStockMovements, useMovementTrend } from '@/hooks/useStockMovements'
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders'
import { useLocations } from '@/hooks/useLocations'
import { getMockLocationStock } from '@/hooks/useLocationStock'
import { Skeleton } from '@/components/ui/skeleton'

import { RealtimeIndicator } from '@/components/dashboard/RealtimeIndicator'
import { QuickStat } from '@/components/dashboard/QuickStat'
import { StoreCard } from '@/components/dashboard/StoreCard'
import { StockOverview } from '@/components/dashboard/StockOverview'
import { RecentMovements } from '@/components/dashboard/RecentMovements'
import { TrendChartCard } from '@/components/dashboard/TrendChartCard'
import { DeliveryOrdersSummary } from '@/components/dashboard/DeliveryOrdersSummary'
import { GOLD } from '@/components/dashboard/_shared'
import type {
  StoreCardData,
  StoreOverviewData,
  CategoryBreakdown,
} from '@/components/dashboard/_shared'

const CATEGORY_ORDER: string[] = ['honey', 'cappuccino', 'blended']

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: products, isLoading: loadingProducts } = useProducts()
  const { data: movements, isLoading: loadingMovements } = useStockMovements({ limit: 30 })
  const { data: orders, isLoading: loadingOrders } = useDeliveryOrders()
  const { data: trendData } = useMovementTrend(30)
  const { data: locations, isLoading: loadingLocations } = useLocations()

  const loading = loadingProducts || loadingMovements || loadingOrders || loadingLocations

  // ── Derived: store cards + overview ───────────────────────────────────────
  const { storeCardsData, storeOverviewData } = useMemo(() => {
    const allLocationStock = getMockLocationStock()
    const managedStores = (locations ?? []).filter(loc => loc.type !== 'deposito')

    const cards: StoreCardData[] = managedStores.map(loc => {
      const stockEntries = allLocationStock.filter(ls => ls.location_id === loc.id && ls.quantity > 0)
      const totalUnits = stockEntries.reduce((sum, e) => sum + e.quantity, 0)
      const productCount = stockEntries.length

      const criticalCount = stockEntries.filter(ls => {
        const product = (products ?? []).find(p => p.id === ls.product_id)
        return product ? ls.quantity <= product.min_stock : false
      }).length

      const healthPercent = productCount > 0
        ? Math.round(((productCount - criticalCount) / productCount) * 100)
        : 100

      return { location: loc, totalUnits, productCount, criticalCount, healthPercent }
    })

    const overview: StoreOverviewData[] = !products || managedStores.length === 0 ? [] :
      managedStores.map(loc => {
        const categories: CategoryBreakdown[] = CATEGORY_ORDER.map(cat => {
          const catProducts = products.filter(p => p.active && p.category === cat)
          const variants = catProducts.map(p => {
            const entry = allLocationStock.find(ls => ls.product_id === p.id && ls.location_id === loc.id)
            return { name: p.name, qty: entry?.quantity ?? 0 }
          })
          return {
            category: cat,
            total: variants.reduce((s, v) => s + v.qty, 0),
            variants,
          }
        })
        return {
          location: loc,
          categories,
          totalUnits: categories.reduce((s, c) => s + c.total, 0),
        }
      })

    return { storeCardsData: cards, storeOverviewData: overview }
  }, [locations, products])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const criticalProducts = useMemo(
    () => products?.filter(p => p.current_stock <= p.min_stock) ?? [],
    [products],
  )
  const pendingOrders = useMemo(
    () => orders?.filter(o => o.status === 'pending' || o.status === 'confirmed') ?? [],
    [orders],
  )
  const totalUnits = useMemo(
    () => products?.reduce((acc, p) => acc + p.current_stock, 0) ?? 0,
    [products],
  )

  const todayOut = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (movements ?? [])
      .filter(m => (m.action === 'out' || m.action === 'loss') && m.created_at.startsWith(today))
      .reduce((s, m) => s + m.quantity, 0)
  }, [movements])

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

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
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Painel de Controle
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-wide capitalize">{todayFormatted}</p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat label="Garrafas em estoque" value={totalUnits} icon={BarChart3} accent="gold" />
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

      {/* Store cards — HERO */}
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

      {/* Row: Stock overview + Recent movements */}
      <div className="grid md:grid-cols-2 gap-5">
        <StockOverview
          data={storeOverviewData}
          onStoreClick={(locId) => navigate('/entrada', { state: { locationFilter: locId } })}
        />
        <RecentMovements movements={movements} />
      </div>

      {/* Row: Trend + Delivery orders */}
      <div className="grid md:grid-cols-2 gap-5">
        <TrendChartCard data={trendData} />
        <DeliveryOrdersSummary orders={orders} />
      </div>
    </div>
  )
}
