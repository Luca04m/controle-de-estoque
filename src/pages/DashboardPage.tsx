import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Package, ShoppingBag, AlertTriangle, PackagePlus, Activity } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useStockMovements } from '@/hooks/useStockMovements'
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ──────────────────────────────────────────────────────────────────

type AccentColor = 'gold' | 'red' | 'green' | 'none'

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  accent?: AccentColor
  icon: React.ElementType
  trend?: { value: number; label: string }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_MAP: Record<string, { label: string; color: string; symbol: string }> = {
  in:         { label: 'Entrada',  color: 'text-emerald-400', symbol: '↑' },
  out:        { label: 'Saída',    color: 'text-red-400',     symbol: '↓' },
  adjustment: { label: 'Ajuste',  color: 'text-amber-400',   symbol: '~' },
  loss:       { label: 'Perda',   color: 'text-orange-400',  symbol: '↓' },
}

const CATEGORY_LABELS: Record<string, string> = {
  honey:      'Honey',
  cappuccino: 'Cappuccino',
  blended:    'Blended',
  acessorio:  'Acessório',
}

const GOLD_COLOR = 'hsl(42, 60%, 55%)'

// ─── RealtimeIndicator ───────────────────────────────────────────────────────

function RealtimeIndicator() {
  const { connected, lastSyncAt, pendingCount } = useRealtimeStore()
  return (
    <div className="flex items-center gap-2 text-xs bg-card border border-border rounded-full px-3 py-1.5">
      <Activity size={12} className={connected ? 'text-emerald-400' : 'text-red-400'} />
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
        {connected ? 'Tempo real' : 'Offline · 30s'}
      </span>
      {pendingCount > 0 && (
        <span className="text-gold">· {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
      )}
      {lastSyncAt && (
        <span className="text-muted-foreground">
          · {lastSyncAt.toLocaleTimeString('pt-BR')}
        </span>
      )}
    </div>
  )
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, accent = 'none', icon: Icon, trend }: StatCardProps) {
  const accentMap: Record<AccentColor, { value: string; border: string; border_color: string }> = {
    red:  { value: 'text-red-400',     border: 'border-l-red-500',     border_color: 'border-red-500' },
    green:{ value: 'text-emerald-400', border: 'border-l-emerald-500', border_color: 'border-emerald-500' },
    gold: { value: 'text-gold',        border: 'border-l-gold',        border_color: 'border-[hsl(42,60%,55%)]' },
    none: { value: 'text-foreground',  border: 'border-l-border',      border_color: 'border-border' },
  }

  const colors = accentMap[accent]

  return (
    <div
      className={`animate-slide-up relative bg-card border border-border border-l-4 ${colors.border_color} rounded-xl p-5 overflow-hidden`}
    >
      {/* Background icon */}
      <Icon
        size={40}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.12] text-foreground"
        aria-hidden
      />

      <p className="text-xs tracking-wider uppercase text-muted-foreground mb-2">{title}</p>

      <p className={`text-3xl font-black leading-none tabular-nums ${colors.value}`}>
        {value}
      </p>

      <div className="mt-2 flex items-center gap-2">
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ml-auto ${
              trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend.value >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Custom Tooltip for BarChart ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-gold">{payload[0].value} produtos</p>
    </div>
  )
}

// ─── DashboardPage ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: products, isLoading: loadingProducts } = useProducts()
  const { data: movements, isLoading: loadingMovements } = useStockMovements({ limit: 20 })
  const { data: orders, isLoading: loadingOrders } = useDeliveryOrders()

  const criticalProducts = products?.filter((p) => p.current_stock <= p.min_stock) ?? []

  const today = new Date().toISOString().slice(0, 10)
  const todayMovements = movements?.filter((m) => m.created_at.startsWith(today)) ?? []
  const todayIns = todayMovements.filter((m) => m.action === 'in').length
  const todayOrders = orders?.filter((o) => o.created_at.startsWith(today)) ?? []

  // Category distribution for bar chart
  const categoryData = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    name: label,
    value: products?.filter((p) => p.category === key && p.active).length ?? 0,
  }))

  const loading = loadingProducts || loadingMovements || loadingOrders

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Skeleton className="h-7 w-48 bg-secondary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-secondary rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full bg-secondary rounded-xl" />
        <div className="grid md:grid-cols-2 gap-5">
          <Skeleton className="h-64 bg-secondary rounded-xl" />
          <Skeleton className="h-64 bg-secondary rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="animate-slide-up flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl text-foreground"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              Visão Geral
            </h1>
            {criticalProducts.length > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-950/50 text-red-400 border border-red-800/40 rounded-full px-2.5 py-0.5 font-medium">
                <AlertTriangle size={10} />
                {criticalProducts.length} crítico{criticalProducts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide capitalize">
            {todayFormatted}
          </p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* ── Critical Alert ── */}
      {criticalProducts.length > 0 && (
        <div className="animate-slide-up border-l-4 border-destructive bg-red-950/30 border border-red-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-400">
              Estoque Crítico — {criticalProducts.length} produto{criticalProducts.length > 1 ? 's' : ''} abaixo do mínimo
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {criticalProducts.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 text-xs bg-red-900/30 text-red-300 border border-red-800/30 rounded-md px-2 py-1"
              >
                {p.name}: <span className="font-bold tabular-nums">{p.current_stock}</span>/{p.min_stock} un
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Críticos"
          value={criticalProducts.length}
          sub={criticalProducts.length > 0 ? 'precisam reposição' : 'estoque ok'}
          accent={criticalProducts.length > 0 ? 'red' : 'green'}
          icon={AlertTriangle}
        />
        <StatCard
          title="Pedidos Hoje"
          value={todayOrders.length}
          sub="delivery"
          accent="gold"
          icon={ShoppingBag}
        />
        <StatCard
          title="Entradas Hoje"
          value={todayIns}
          sub="movimentações"
          accent="green"
          icon={PackagePlus}
        />
        <StatCard
          title="Total Produtos"
          value={products?.length ?? 0}
          sub="no catálogo"
          accent="none"
          icon={Package}
        />
      </div>

      {/* ── Category Distribution Chart ── */}
      <div className="animate-slide-up bg-card border border-border rounded-xl p-5">
        <p className="text-xs tracking-wider uppercase text-muted-foreground mb-4">
          Distribuição por Categoria
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={categoryData} barCategoryGap="30%">
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(0 0% 100% / 0.04)' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {categoryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={GOLD_COLOR} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Stock overview */}
        <div className="animate-slide-up bg-card border border-border rounded-xl p-5">
          <p className="text-xs tracking-wider uppercase text-muted-foreground mb-4">Estoque Atual</p>
          <div className="space-y-4">
            {products?.slice(0, 8).map((p) => {
              const pct = p.min_stock > 0
                ? Math.min(100, (p.current_stock / (p.min_stock * 3)) * 100)
                : 100
              const isCrit = p.current_stock <= p.min_stock
              const pctLabel = `${Math.round(pct)}%`
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium truncate max-w-[180px] text-foreground">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground tabular-nums">{pctLabel}</span>
                      <span className={`font-bold tabular-nums ${isCrit ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {p.current_stock} un
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isCrit
                          ? 'hsl(0, 70%, 55%)'
                          : GOLD_COLOR,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {!products?.length && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum produto cadastrado
              </p>
            )}
          </div>
        </div>

        {/* Recent movements */}
        <div className="animate-slide-up bg-card border border-border rounded-xl p-5">
          <p className="text-xs tracking-wider uppercase text-muted-foreground mb-4">
            Movimentações Recentes
          </p>
          <div className="space-y-0.5">
            {movements?.slice(0, 10).map((m) => {
              const action = ACTION_MAP[m.action] ?? { label: m.action, color: '', symbol: '·' }
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-base font-bold shrink-0 w-4 text-center ${action.color}`}
                      aria-label={action.label}
                    >
                      {action.symbol}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {(m.product as unknown as { name: string } | undefined)?.name ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {(m.profile as unknown as { full_name: string } | undefined)?.full_name ?? 'operador'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-xs font-semibold ${action.color}`}>{action.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{m.quantity} un</p>
                  </div>
                </div>
              )
            })}
            {movements?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Sem movimentações ainda
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
