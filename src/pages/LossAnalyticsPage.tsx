import { useState, useMemo } from 'react'
import { TrendingDown, MapPin, AlertCircle, Download, Calendar } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useLossAnalytics } from '@/hooks/useLossAnalytics'
import type { LossFilters } from '@/hooks/useLossAnalytics'
import { Skeleton } from '@/components/ui/skeleton'

const WINDOWS: { label: string; days: number }[] = [
  { label: '7 dias',  days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
]

const LOCATIONS = ['all', 'Angelo / Degusto', 'Porquinho', 'Rio Comprido', 'Depósito Central', 'Mercado Livre', 'NuvemShop']

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function LossAnalyticsPage() {
  const [filters, setFilters] = useState<LossFilters>({ windowDays: 30, location: 'all' })
  const { data, isLoading } = useLossAnalytics(filters)

  const byDayData = useMemo(
    () => data?.aggregates.byDay.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      units: d.units,
    })) ?? [],
    [data],
  )

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-56 bg-secondary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 bg-secondary rounded-xl" />)}
        </div>
        <Skeleton className="h-64 bg-secondary rounded-xl" />
      </div>
    )
  }

  const { records, aggregates } = data

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Análise de Perdas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Movimentações de perda por loja, categoria e período
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-sm bg-card border border-border px-3 py-2 rounded-lg hover:bg-secondary/50 transition">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar size={12} /> Período:
        </div>
        {WINDOWS.map(w => (
          <button
            key={w.days}
            onClick={() => setFilters(f => ({ ...f, windowDays: w.days }))}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filters.windowDays === w.days
                ? 'bg-gold text-primary-foreground border-gold'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {w.label}
          </button>
        ))}
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
          <MapPin size={12} /> Loja:
        </div>
        <select
          value={filters.location}
          onChange={e => setFilters(f => ({ ...f, location: e.target.value as LossFilters['location'] }))}
          className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 text-foreground"
        >
          <option value="all">Todas</option>
          {LOCATIONS.filter(l => l !== 'all').map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-destructive/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown size={16} className="text-destructive" />
            <span className="text-2xl font-black tabular-nums text-destructive">{aggregates.totalUnits}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unidades perdidas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle size={16} className="text-warning" />
            <span className="text-2xl font-black tabular-nums text-warning">{fmtBRL(aggregates.totalValue)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor estimado</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <MapPin size={16} className="text-gold" />
            <span className="text-2xl font-black tabular-nums text-foreground">{aggregates.byLocation.length}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lojas afetadas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={16} className="text-info" />
            <span className="text-2xl font-black tabular-nums text-foreground">{records.length}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Registros</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Bar by location */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-4">
            Perdas por loja (unidades)
          </p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregates.byLocation.map(l => ({ name: l.location, units: l.units }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="units" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line trend */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-4">
            Tendência de perdas — {filters.windowDays}d
          </p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="units" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ fill: 'hsl(var(--warning))', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top reasons */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-4">
          Principais motivos
        </p>
        <div className="flex flex-wrap gap-2">
          {aggregates.topReasons.map(r => (
            <span
              key={r.reason}
              className="text-xs bg-secondary text-foreground px-3 py-1.5 rounded-full border border-border"
            >
              {r.reason} <span className="text-gold font-bold">· {r.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
            Registros detalhados ({records.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Produto</th>
                <th className="px-4 py-2 text-left font-medium">Loja</th>
                <th className="px-4 py-2 text-right font-medium">Qtd</th>
                <th className="px-4 py-2 text-left font-medium">Motivo</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 text-right font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <p className="text-foreground font-medium">{r.product_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{r.sku}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.location_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-destructive font-semibold">{r.quantity}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.reason}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-warning">{fmtBRL(r.value_estimated)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-sm">
                    Nenhum registro no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
