import { useState } from 'react'
import { useLocations } from '@/hooks/useLocations'
import { useProducts } from '@/hooks/useProducts'
import { useTransferStock } from '@/hooks/useTransferStock'
import { useStockMovements } from '@/hooks/useStockMovements'
import { getMockStockForLocation } from '@/hooks/useLocationStock'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowRightLeft, ArrowRight, Package, CheckCircle2,
  AlertTriangle, Clock, MapPin, ChevronRight, Minus, Plus, Send,
} from 'lucide-react'
import type { MovementAction } from '@/types'

export function TransfersPage() {
  const { isManager } = useUserLocation()
  const { data: locations } = useLocations()
  const { data: products } = useProducts()
  const transfer = useTransferStock()
  const { data: recentMovements } = useStockMovements({ limit: 20 })

  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')
  const [productId, setProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')
  const [success, setSuccess] = useState(false)

  if (!isManager) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <ArrowRightLeft size={32} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm">Transferências são restritas a gestores.</p>
      </div>
    )
  }

  const selectedProduct = products?.find((p) => p.id === productId)
  const availableAtOrigin = fromId && productId ? getMockStockForLocation(productId, fromId) : 0
  const stockAtDest = toId && productId ? getMockStockForLocation(productId, toId) : 0
  const isValid = fromId && toId && productId && quantity > 0 && fromId !== toId && quantity <= availableAtOrigin
  const fromLocation = locations?.find(l => l.id === fromId)
  const toLocation = locations?.find(l => l.id === toId)

  async function handleTransfer() {
    if (!isValid) return
    await transfer.mutateAsync({
      from_location_id: fromId,
      to_location_id: toId,
      product_id: productId,
      quantity,
      notes: notes || undefined,
    })
    setSuccess(true)
    setTimeout(() => setSuccess(false), 4000)
    setQuantity(1)
    setNotes('')
    setProductId('')
  }

  const transferMovements = recentMovements?.filter((m: { action: MovementAction }) => m.action === 'transfer') ?? []

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1
          className="text-2xl text-foreground flex items-center gap-2.5"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(42 60% 55% / 0.15)' }}>
            <ArrowRightLeft size={16} className="text-gold" />
          </div>
          Transferências
        </h1>
        <p className="text-xs text-muted-foreground mt-1 ml-[42px]">Mova estoque entre pontos de venda</p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/40 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-sm text-emerald-400 font-semibold block">Transferência realizada!</span>
            <span className="text-xs text-emerald-400/70">Estoque atualizado nos dois pontos</span>
          </div>
        </div>
      )}

      {/* ── ROUTE PICKER ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border/50">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center" style={{ background: 'hsl(42 60% 55% / 0.15)', color: 'hsl(42 60% 55%)' }}>1</span>
            Rota da transferência
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_48px_1fr] gap-4 items-start">
            {/* Origin */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Origem</span>
              <Select value={fromId} onValueChange={(v) => { setFromId(v ?? ''); if (v === toId) setToId('') }}>
                <SelectTrigger className="h-12 bg-secondary/50 border-border hover:border-muted-foreground/30 transition-colors">
                  <SelectValue placeholder="Selecionar origem" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-muted-foreground shrink-0" />
                        <div className="text-left">
                          <span className="block">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">{loc.city} - {loc.state}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromLocation && (
                <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                  <p className="text-[10px] text-muted-foreground truncate">{fromLocation.address}</p>
                  <p className="text-[10px] text-muted-foreground">{fromLocation.city} - {fromLocation.state}</p>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="hidden sm:flex items-center justify-center pt-8">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </div>
            <div className="sm:hidden flex items-center justify-center">
              <ArrowRight size={16} className="text-muted-foreground rotate-90" />
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Destino</span>
              <Select value={toId} onValueChange={(v) => setToId(v ?? '')}>
                <SelectTrigger className="h-12 bg-secondary/50 border-border hover:border-muted-foreground/30 transition-colors">
                  <SelectValue placeholder="Selecionar destino" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {locations?.filter((l) => l.id !== fromId).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-muted-foreground shrink-0" />
                        <div className="text-left">
                          <span className="block">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">{loc.city} - {loc.state}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toLocation && (
                <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                  <p className="text-[10px] text-muted-foreground truncate">{toLocation.address}</p>
                  <p className="text-[10px] text-muted-foreground">{toLocation.city} - {toLocation.state}</p>
                </div>
              )}
            </div>
          </div>

          {/* Route summary pill */}
          {fromLocation && toLocation && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg border border-gold/20 bg-gold/5">
              <ArrowRightLeft size={12} className="text-gold shrink-0" />
              <span className="text-xs font-medium text-foreground">{fromLocation.name}</span>
              <ArrowRight size={10} className="text-gold" />
              <span className="text-xs font-medium text-foreground">{toLocation.name}</span>
            </div>
          )}

          {/* Validation: same origin & destination */}
          {fromId === toId && fromId !== '' && (
            <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Origem e destino devem ser diferentes.
            </p>
          )}
        </div>
      </div>

      {/* ── PRODUCT + QUANTITY ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border/50">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center" style={{ background: 'hsl(42 60% 55% / 0.15)', color: 'hsl(42 60% 55%)' }}>2</span>
            Produto e quantidade
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Product selector */}
          <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
            <SelectTrigger className="h-12 bg-secondary/50 border-border hover:border-muted-foreground/30 transition-colors">
              <SelectValue placeholder="Selecionar produto" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2.5">
                    <Package size={14} className="text-muted-foreground shrink-0" />
                    <span>{p.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock comparison: origin vs destination */}
          {fromId && toId && productId && (
            <div className="grid grid-cols-2 gap-3">
              <div className={`px-3 py-2.5 rounded-lg border ${availableAtOrigin <= (selectedProduct?.min_stock ?? 0) ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-secondary/30'}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Na origem</p>
                <p className={`text-xl font-bold tabular-nums mt-0.5 ${availableAtOrigin <= (selectedProduct?.min_stock ?? 0) ? 'text-red-400' : 'text-foreground'}`}>
                  {availableAtOrigin} <span className="text-xs font-normal text-muted-foreground">un</span>
                </p>
                {availableAtOrigin <= (selectedProduct?.min_stock ?? 0) && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={10} className="text-red-400" />
                    <span className="text-[10px] text-red-400">Estoque baixo</span>
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5 rounded-lg border border-border bg-secondary/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No destino</p>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-foreground">
                  {stockAtDest} <span className="text-xs font-normal text-muted-foreground">un</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Após: <strong className="text-foreground">{stockAtDest + quantity}</strong> un
                </p>
              </div>
            </div>
          )}

          {/* Quantity stepper + notes */}
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
            <div className="space-y-1.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Quantidade</span>
              <div className="flex items-center h-12 rounded-lg border border-border bg-secondary/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Minus size={14} />
                </button>
                <Input
                  type="number"
                  min={1}
                  max={availableAtOrigin}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-full border-0 bg-transparent text-center text-lg font-bold tabular-nums focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableAtOrigin || 999, quantity + 1))}
                  className="w-12 h-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">Observação <span className="normal-case tracking-normal opacity-50">(opcional)</span></span>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reposição semanal para fim de semana"
                className="h-12 bg-secondary/50 border-border hover:border-muted-foreground/30 transition-colors"
              />
            </div>
          </div>

          {/* Validation: quantity exceeds available */}
          {quantity > availableAtOrigin && availableAtOrigin > 0 && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Quantidade excede o disponível ({availableAtOrigin} un).
            </p>
          )}
        </div>
      </div>

      {/* ── CONFIRM BUTTON ───────────────────────────────────────────── */}
      <button
        onClick={handleTransfer}
        disabled={!isValid || transfer.isPending}
        className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{
          backgroundColor: isValid ? 'hsl(42 60% 55%)' : 'hsl(240 10% 16%)',
          color: isValid ? 'hsl(240 25% 4%)' : 'hsl(240 10% 35%)',
          boxShadow: isValid ? '0 0 20px hsl(42 60% 55% / 0.25)' : 'none',
        }}
      >
        <Send size={16} />
        {transfer.isPending ? 'Transferindo...' : 'Confirmar Transferência'}
      </button>

      {/* ── RECENT TRANSFERS ─────────────────────────────────────────── */}
      {transferMovements.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border/50 flex items-center gap-2">
            <Clock size={13} className="text-muted-foreground" />
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">
              Transferências Recentes
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {transferMovements.slice(0, 10).map((mv) => (
              <div key={mv.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm text-foreground truncate block">{mv.product?.name ?? mv.product_id}</span>
                  <p className="text-xs text-muted-foreground truncate">{mv.notes ?? '—'}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <Badge variant="outline" className={mv.quantity > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    {new Date(mv.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {transferMovements.length === 0 && (
        <div className="border border-dashed border-border/60 rounded-xl p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-secondary/60 flex items-center justify-center mb-4">
            <ArrowRightLeft size={20} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Nenhuma transferência registrada</p>
          <p className="text-xs text-muted-foreground/50 mt-1 max-w-xs">
            Preencha o formulário acima para mover estoque entre os pontos de venda
          </p>
        </div>
      )}
    </div>
  )
}
