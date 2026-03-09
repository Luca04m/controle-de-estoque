import { useState, useMemo } from 'react'
import { useAllMovements } from '@/hooks/useStockMovements'
import { useAllProducts } from '@/hooks/useProducts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react'
import { MovementCard } from '@/components/MovementCard'
import type { MovementAction } from '@/types'

// ─── Constants & helpers ─────────────────────────────────────────────────────

const ACTION_LABELS: Record<MovementAction, { label: string; color: string }> = {
  in: { label: 'Entrada', color: 'text-emerald-400' },
  out: { label: 'Saída', color: 'text-red-400' },
  adjustment: { label: 'Ajuste', color: 'text-amber-400' },
  loss: { label: 'Perda', color: 'text-orange-400' },
}

const PAGE_SIZE = 50

// Build last-30-days date labels
function last30DaysLabels(): string[] {
  const labels: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(d.toISOString().slice(0, 10))
  }
  return labels
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
}

function KpiCard({ label, value, icon, colorClass }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 p-2 rounded-lg bg-current/5 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{label}</p>
        <p className={`text-2xl font-black tabular-nums mt-0.5 ${colorClass}`}>
          {value.toLocaleString('pt-BR')}
        </p>
        <p className="text-[10px] text-muted-foreground">unidades</p>
      </div>
    </div>
  )
}

// ─── Recharts custom tooltip ─────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = new Date(label + 'T00:00:00')
  const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{dateStr}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.fill }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── ReportsPage ─────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { data: products } = useAllProducts()
  const [filters, setFilters] = useState<{
    product_id?: string
    action?: MovementAction
    from?: string
    to?: string
    limit: number
    offset: number
  }>({ limit: PAGE_SIZE, offset: 0 })

  // We fetch all movements (no limit) for KPIs + chart using a separate call
  const { data: allData } = useAllMovements({ limit: 9999, offset: 0 })
  const { data, isLoading } = useAllMovements(filters)

  function setFilter(key: string, value: string | null | undefined) {
    const resolved = value ?? undefined
    setFilters((f) => ({ ...f, [key]: resolved, offset: 0 } as typeof f))
  }

  // ── KPI calculations (from unfiltered data for the summary) ───────────────
  const kpis = useMemo(() => {
    const movements = allData?.data ?? []
    const totalIn = movements
      .filter((m) => m.action === 'in')
      .reduce((s, m) => s + m.quantity, 0)
    const totalOut = movements
      .filter((m) => m.action === 'out')
      .reduce((s, m) => s + m.quantity, 0)
    const totalLoss = movements
      .filter((m) => m.action === 'loss')
      .reduce((s, m) => s + m.quantity, 0)
    const saldo = totalIn - totalOut - totalLoss
    return { totalIn, totalOut, totalLoss, saldo }
  }, [allData])

  // ── Bar chart data (last 30 days, all movements) ──────────────────────────
  const chartData = useMemo(() => {
    const days = last30DaysLabels()
    const movements = allData?.data ?? []

    const buckets: Record<string, { date: string; Entradas: number; Saídas: number }> = {}
    for (const day of days) {
      buckets[day] = { date: day, Entradas: 0, Saídas: 0 }
    }

    for (const m of movements) {
      const day = m.created_at.slice(0, 10)
      if (!buckets[day]) continue
      if (m.action === 'in') buckets[day].Entradas += m.quantity
      if (m.action === 'out') buckets[day].Saídas += m.quantity
    }

    return days.map((d) => ({
      ...buckets[d],
      label: new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      }),
    }))
  }, [allData])

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!data?.data) return
    const headers = ['Data', 'Produto', 'SKU', 'Tipo', 'Quantidade', 'Referência', 'Notas', 'Operador']
    const rows = data.data.map((m) => [
      new Date(m.created_at).toLocaleString('pt-BR'),
      (m.product as unknown as { name: string } | undefined)?.name ?? '',
      (m.product as unknown as { sku: string } | undefined)?.sku ?? '',
      ACTION_LABELS[m.action]?.label ?? m.action,
      m.quantity,
      m.order_id ?? '',
      m.notes,
      (m.profile as unknown as { full_name: string } | undefined)?.full_name ?? '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mr-lion-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const currentPage = Math.floor(filters.offset / PAGE_SIZE) + 1

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Histórico & Relatórios
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data ? `${data.count} movimentações encontradas` : 'Carregando...'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!data?.data?.length}
          className="h-9 px-4 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
        >
          ↓ Exportar CSV
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Entradas"
          value={kpis.totalIn}
          icon={<TrendingUp className="w-4 h-4" />}
          colorClass="text-emerald-400"
        />
        <KpiCard
          label="Total Saídas"
          value={kpis.totalOut}
          icon={<TrendingDown className="w-4 h-4" />}
          colorClass="text-red-400"
        />
        <KpiCard
          label="Total Perdas"
          value={kpis.totalLoss}
          icon={<AlertTriangle className="w-4 h-4" />}
          colorClass="text-orange-400"
        />
        <KpiCard
          label="Saldo Período"
          value={kpis.saldo}
          icon={<Activity className="w-4 h-4" />}
          colorClass={kpis.saldo >= 0 ? 'text-gold' : 'text-red-400'}
        />
      </div>

      {/* Bar Chart — last 30 days */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs tracking-wider uppercase text-muted-foreground font-medium">
          Movimentações — últimos 30 dias
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(240 5% 55%)' }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(240 5% 55%)' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(240 10% 10%)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="square"
              />
              <Bar dataKey="Entradas" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Saídas" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Produto</Label>
          <Select
            onValueChange={(v) =>
              setFilter('product_id', !v || v === 'all' ? undefined : String(v))
            }
          >
            <SelectTrigger className="h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Tipo</Label>
          <Select
            onValueChange={(v) =>
              setFilter('action', !v || v === 'all' ? undefined : String(v))
            }
          >
            <SelectTrigger className="h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="in">Entrada</SelectItem>
              <SelectItem value="out">Saída</SelectItem>
              <SelectItem value="adjustment">Ajuste</SelectItem>
              <SelectItem value="loss">Perda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">De</Label>
          <Input
            type="date"
            className="h-8 text-xs bg-secondary border-border"
            onChange={(e) =>
              setFilter('from', e.target.value ? `${e.target.value}T00:00:00` : '')
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Até</Label>
          <Input
            type="date"
            className="h-8 text-xs bg-secondary border-border"
            onChange={(e) =>
              setFilter('to', e.target.value ? `${e.target.value}T23:59:59` : '')
            }
          />
        </div>
      </div>

      {/* Mobile cards (sm:hidden) */}
      {isLoading ? (
        <div className="sm:hidden space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-secondary rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="sm:hidden space-y-2">
          {data?.data?.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Activity size={28} className="opacity-20" />
              <span className="text-sm">Nenhuma movimentação no período</span>
            </div>
          ) : (
            data?.data?.map((m) => <MovementCard key={m.id} movement={m} />)
          )}
        </div>
      )}

      {/* Desktop Table (hidden sm:block) */}
      {isLoading ? (
        <div className="hidden sm:block space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="hidden sm:block rounded-xl border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Data/Hora
                </TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Produto
                </TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  SKU
                </TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Tipo
                </TableHead>
                <TableHead className="text-right text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Qtd
                </TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Operador
                </TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Notas
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data?.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    Nenhuma movimentação no período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((m) => {
                  const config = ACTION_LABELS[m.action]
                  const operatorName =
                    (m.profile as unknown as { full_name: string } | undefined)?.full_name ?? '—'
                  const notes = m.notes ?? ''

                  return (
                    <TableRow
                      key={m.id}
                      className="border-border hover:bg-secondary/50 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(m.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {(m.product as unknown as { name: string } | undefined)?.name ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {(m.product as unknown as { sku: string } | undefined)?.sku ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-semibold ${config?.color ?? 'text-muted-foreground'}`}
                        >
                          {config?.label ?? m.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-foreground">
                        {m.quantity}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                          {operatorName}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {notes ? (
                          <span title={notes} className="cursor-default">
                            {notes}
                          </span>
                        ) : (
                          <span className="text-border">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setFilters((f) => ({ ...f, offset: f.offset - PAGE_SIZE }))}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, offset: f.offset + PAGE_SIZE }))}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
