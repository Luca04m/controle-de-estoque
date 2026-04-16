import { useState, useMemo } from 'react'
import { Calendar, MapPin, Package, AlertCircle, Clock, CheckCircle2, XCircle, Plus, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { useBatches, countByStatus } from '@/hooks/useBatches'
import { Skeleton } from '@/components/ui/skeleton'
import { BarcodeScanner } from '@/features/barcode/BarcodeScanner'
import type { BatchStatus, ExpiringBatch } from '@/types'

const STATUS_CFG: Record<BatchStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  expired:  { label: 'Vencido',       icon: XCircle,       color: 'text-destructive',   bg: 'bg-destructive/10', border: 'border-destructive/40' },
  critical: { label: 'Crítico (≤7d)', icon: AlertCircle,   color: 'text-warning',       bg: 'bg-warning/10',     border: 'border-warning/40' },
  warning:  { label: 'Atenção (≤30d)', icon: Clock,        color: 'text-amber-400',     bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  ok:       { label: 'Em dia',        icon: CheckCircle2,  color: 'text-emerald-400',   bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
}

const TABS: BatchStatus[] = ['expired', 'critical', 'warning', 'ok']

function BatchCard({ b }: { b: ExpiringBatch }) {
  const cfg = STATUS_CFG[b.status]
  const Icon = cfg.icon
  const expiryFmt = new Date(b.expiry_date).toLocaleDateString('pt-BR')

  return (
    <div className={`bg-card border ${cfg.border} rounded-xl p-4 transition hover:scale-[1.01]`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{b.product_name}</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{b.sku}</p>
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${cfg.color} ${cfg.bg} px-2 py-0.5 rounded-full shrink-0`}>
          <Icon size={11} />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Package size={11} className="text-gold" />
          Lote <span className="text-foreground font-mono">{b.batch_code}</span>
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={11} className="text-gold" />
          {b.location_name}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs">
          <Calendar size={11} className={cfg.color} />
          <span className="text-muted-foreground">Validade:</span>
          <span className={`font-semibold ${cfg.color}`}>{expiryFmt}</span>
          <span className="text-muted-foreground text-[10px]">
            ({b.days_until_expiry < 0
              ? `${Math.abs(b.days_until_expiry)}d atrás`
              : `em ${b.days_until_expiry}d`})
          </span>
        </span>
        <span className="text-sm font-black tabular-nums text-foreground">
          {b.quantity} <span className="text-[10px] text-muted-foreground font-normal">un</span>
        </span>
      </div>

      {b.notes && (
        <p className="mt-2 text-[11px] text-muted-foreground italic">"{b.notes}"</p>
      )}
    </div>
  )
}

export function BatchesPage() {
  const { data: batches, isLoading } = useBatches()
  const [tab, setTab] = useState<BatchStatus | 'all'>('all')
  const [scanning, setScanning] = useState(false)

  const handleScan = (code: string) => {
    setScanning(false)
    toast.success(`Código ${code} reconhecido`, {
      description: 'Produto identificado — preencha lote e validade.',
    })
  }

  const counts = useMemo(() => countByStatus(batches), [batches])

  const filtered = useMemo(() => {
    if (!batches) return []
    const arr = tab === 'all' ? batches : batches.filter(b => b.status === tab)
    const statusOrder: Record<BatchStatus, number> = { expired: 0, critical: 1, warning: 2, ok: 3 }
    return [...arr].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return a.days_until_expiry - b.days_until_expiry
    })
  }, [batches, tab])

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48 bg-secondary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 bg-secondary rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 bg-secondary rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {scanning && (
        <BarcodeScanner onDetected={handleScan} onClose={() => setScanning(false)} />
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
            Lotes & Validade
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rastreamento de lotes com data de validade — FIFO e alertas automáticos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 text-sm bg-card border border-border px-3 py-2 rounded-lg hover:bg-secondary/50 transition"
          >
            <ScanLine size={14} />
            Escanear código
          </button>
          <button className="flex items-center gap-1.5 text-sm bg-gold text-primary-foreground font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition">
            <Plus size={14} />
            Novo lote
          </button>
        </div>
      </div>

      {/* KPI cards por status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.map(s => {
          const cfg = STATUS_CFG[s]
          const Icon = cfg.icon
          return (
            <button
              key={s}
              onClick={() => setTab(t => t === s ? 'all' : s)}
              className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 text-left hover:scale-[1.02] transition ${tab === s ? 'ring-2 ring-gold' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} className={cfg.color} />
                <span className="text-2xl font-black tabular-nums text-foreground">{counts[s]}</span>
              </div>
              <p className={`text-[10px] font-semibold ${cfg.color} uppercase tracking-wider`}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab('all')}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            tab === 'all'
              ? 'bg-gold text-primary-foreground border-gold'
              : 'bg-card text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          Todos ({batches?.length ?? 0})
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(b => <BatchCard key={b.id} b={b} />)}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-8">
            Nenhum lote nesta categoria
          </p>
        )}
      </div>
    </div>
  )
}
