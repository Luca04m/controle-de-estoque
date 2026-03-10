import { useState } from 'react'
import { useLocations } from '@/hooks/useLocations'
import { useProducts } from '@/hooks/useProducts'
import { useTransferStock } from '@/hooks/useTransferStock'
import { useStockMovements } from '@/hooks/useStockMovements'
import { getMockStockForLocation } from '@/hooks/useLocationStock'
import { useUserLocation } from '@/hooks/useUserLocation'
import { getProductImage } from '@/lib/productImages'
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'hsl(240 18% 12%)' }}
        >
          <ArrowRightLeft size={28} className="text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Transferências são restritas a gestores.</p>
      </div>
    )
  }

  const selectedProduct = products?.find((p) => p.id === productId)
  const availableAtOrigin = fromId && productId ? getMockStockForLocation(productId, fromId) : 0
  const stockAtDest = toId && productId ? getMockStockForLocation(productId, toId) : 0
  const isValid = fromId && toId && productId && quantity > 0 && fromId !== toId && quantity <= availableAtOrigin
  const fromLocation = locations?.find(l => l.id === fromId)
  const toLocation = locations?.find(l => l.id === toId)
  const productImage = selectedProduct ? getProductImage(selectedProduct.sku) : undefined

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
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto animate-slide-up">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'hsl(42 60% 55% / 0.12)' }}
        >
          <ArrowRightLeft size={20} style={{ color: 'hsl(42 60% 55%)' }} />
        </div>
        <div>
          <h1
            className="text-2xl text-foreground leading-tight"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Transferências
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mova estoque entre pontos de venda
          </p>
        </div>
      </div>

      {/* ── SUCCESS TOAST ───────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/40 animate-slide-up">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-sm text-emerald-400 font-semibold block">Transferência realizada!</span>
            <span className="text-[11px] text-emerald-400/70">Estoque atualizado nos dois pontos</span>
          </div>
        </div>
      )}

      {/* ── MAIN CARD ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden animate-slide-up"
        style={{
          background: 'hsl(240 20% 7%)',
          borderColor: 'hsl(240 15% 14%)',
        }}
      >

        {/* ─── ROUTE SECTION ───────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
            <MapPin size={12} style={{ color: 'hsl(42 60% 55%)' }} />
            Rota
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_40px_1fr] gap-3 items-start">
            {/* Origin card */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">Origem</span>
              <Select value={fromId} onValueChange={(v) => { setFromId(v ?? ''); if (v === toId) setToId('') }}>
                <SelectTrigger
                  className="h-14 rounded-xl border-transparent transition-all hover:border-[hsl(42_60%_55%_/_0.2)]"
                  style={{
                    background: fromLocation ? 'hsl(42 60% 55% / 0.06)' : 'hsl(240 15% 11%)',
                    borderColor: fromLocation ? 'hsl(42 60% 55% / 0.15)' : 'transparent',
                  }}
                >
                  {fromLocation ? (
                    <div className="flex items-center gap-2.5 text-left">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'hsl(42 60% 55% / 0.12)' }}
                      >
                        <MapPin size={14} style={{ color: 'hsl(42 60% 55%)' }} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-foreground truncate">{fromLocation.name}</span>
                        <span className="block text-[10px] text-muted-foreground">{fromLocation.city}</span>
                      </div>
                    </div>
                  ) : (
                    <SelectValue placeholder="Selecionar origem" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} className="rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <MapPin size={13} className="text-muted-foreground shrink-0" />
                        <div className="text-left">
                          <span className="block text-sm">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">{loc.city} - {loc.state}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Arrow connector */}
            <div className="hidden sm:flex items-center justify-center pt-7">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'hsl(42 60% 55% / 0.1)',
                  border: '1.5px solid hsl(42 60% 55% / 0.25)',
                }}
              >
                <ArrowRight size={16} style={{ color: 'hsl(42 60% 55%)' }} />
              </div>
            </div>
            <div className="sm:hidden flex items-center justify-center py-1">
              <ArrowRight size={16} className="text-muted-foreground/40 rotate-90" />
            </div>

            {/* Destination card */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">Destino</span>
              <Select value={toId} onValueChange={(v) => setToId(v ?? '')}>
                <SelectTrigger
                  className="h-14 rounded-xl border-transparent transition-all hover:border-[hsl(42_60%_55%_/_0.2)]"
                  style={{
                    background: toLocation ? 'hsl(42 60% 55% / 0.06)' : 'hsl(240 15% 11%)',
                    borderColor: toLocation ? 'hsl(42 60% 55% / 0.15)' : 'transparent',
                  }}
                >
                  {toLocation ? (
                    <div className="flex items-center gap-2.5 text-left">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'hsl(42 60% 55% / 0.12)' }}
                      >
                        <MapPin size={14} style={{ color: 'hsl(42 60% 55%)' }} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-foreground truncate">{toLocation.name}</span>
                        <span className="block text-[10px] text-muted-foreground">{toLocation.city}</span>
                      </div>
                    </div>
                  ) : (
                    <SelectValue placeholder="Selecionar destino" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  {locations?.filter((l) => l.id !== fromId).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} className="rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <MapPin size={13} className="text-muted-foreground shrink-0" />
                        <div className="text-left">
                          <span className="block text-sm">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">{loc.city} - {loc.state}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Route summary pill */}
          {fromLocation && toLocation && (
            <div
              className="mt-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl animate-slide-up"
              style={{
                background: 'hsl(42 60% 55% / 0.06)',
                border: '1px solid hsl(42 60% 55% / 0.15)',
              }}
            >
              <ArrowRightLeft size={13} style={{ color: 'hsl(42 60% 55%)' }} />
              <span className="text-xs font-semibold text-foreground">{fromLocation.name}</span>
              <ArrowRight size={11} style={{ color: 'hsl(42 60% 55%)' }} />
              <span className="text-xs font-semibold text-foreground">{toLocation.name}</span>
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

        {/* ─── DIVIDER ─────────────────────────────────────────────── */}
        <div className="mx-5 sm:mx-6 h-px" style={{ background: 'hsl(240 15% 14%)' }} />

        {/* ─── PRODUCT + QUANTITY SECTION ───────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-5">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
            <Package size={12} style={{ color: 'hsl(42 60% 55%)' }} />
            Produto e quantidade
          </p>

          {/* Product selector */}
          <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
            <SelectTrigger
              className="h-14 rounded-xl border-transparent transition-all hover:border-[hsl(42_60%_55%_/_0.2)]"
              style={{
                background: selectedProduct ? 'hsl(240 15% 11%)' : 'hsl(240 15% 11%)',
                borderColor: selectedProduct ? 'hsl(42 60% 55% / 0.15)' : 'transparent',
              }}
            >
              {selectedProduct ? (
                <div className="flex items-center gap-3 text-left">
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={selectedProduct.name}
                      className="w-9 h-9 rounded-lg object-contain"
                      style={{ background: 'hsl(240 15% 14%)' }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'hsl(240 15% 14%)' }}
                    >
                      <Package size={16} className="text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{selectedProduct.name}</span>
                    <span className="block text-[10px] text-muted-foreground font-mono">{selectedProduct.sku}</span>
                  </div>
                </div>
              ) : (
                <SelectValue placeholder="Selecionar produto" />
              )}
            </SelectTrigger>
            <SelectContent className="bg-card border-border rounded-xl">
              {products?.map((p) => {
                const img = getProductImage(p.sku)
                return (
                  <SelectItem key={p.id} value={p.id} className="rounded-lg">
                    <div className="flex items-center gap-2.5">
                      {img ? (
                        <img src={img} alt={p.name} className="w-7 h-7 rounded-md object-contain bg-secondary/50" />
                      ) : (
                        <Package size={14} className="text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <span className="block text-sm">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Stock comparison row */}
          {fromId && toId && productId && (
            <div className="grid grid-cols-3 gap-2.5 animate-slide-up">
              {/* Origin stock */}
              <div
                className="rounded-xl px-3 py-3 text-center"
                style={{
                  background: availableAtOrigin <= (selectedProduct?.min_stock ?? 0)
                    ? 'hsl(0 60% 50% / 0.08)'
                    : 'hsl(240 15% 11%)',
                  border: `1px solid ${
                    availableAtOrigin <= (selectedProduct?.min_stock ?? 0)
                      ? 'hsl(0 60% 50% / 0.2)'
                      : 'hsl(240 15% 14%)'
                  }`,
                }}
              >
                <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Origem</p>
                <p
                  className="text-2xl font-bold tabular-nums mt-1"
                  style={{
                    color: availableAtOrigin <= (selectedProduct?.min_stock ?? 0)
                      ? 'hsl(0 70% 60%)'
                      : 'hsl(0 0% 95%)',
                  }}
                >
                  {availableAtOrigin}
                </p>
                <p className="text-[10px] text-muted-foreground/50">unidades</p>
                {availableAtOrigin <= (selectedProduct?.min_stock ?? 0) && (
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    <AlertTriangle size={9} style={{ color: 'hsl(0 70% 60%)' }} />
                    <span className="text-[9px]" style={{ color: 'hsl(0 70% 60%)' }}>Baixo</span>
                  </div>
                )}
              </div>

              {/* Destination stock */}
              <div
                className="rounded-xl px-3 py-3 text-center"
                style={{
                  background: 'hsl(240 15% 11%)',
                  border: '1px solid hsl(240 15% 14%)',
                }}
              >
                <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Destino</p>
                <p className="text-2xl font-bold tabular-nums mt-1 text-foreground">{stockAtDest}</p>
                <p className="text-[10px] text-muted-foreground/50">unidades</p>
              </div>

              {/* After transfer */}
              <div
                className="rounded-xl px-3 py-3 text-center"
                style={{
                  background: 'hsl(42 60% 55% / 0.06)',
                  border: '1px solid hsl(42 60% 55% / 0.15)',
                }}
              >
                <p className="text-[9px] tracking-[0.15em] uppercase font-medium" style={{ color: 'hsl(42 60% 55% / 0.6)' }}>
                  Após
                </p>
                <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'hsl(42 60% 55%)' }}>
                  {stockAtDest + quantity}
                </p>
                <p className="text-[10px]" style={{ color: 'hsl(42 60% 55% / 0.4)' }}>no destino</p>
              </div>
            </div>
          )}

          {/* Quantity stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">Quantidade</span>
              <div
                className="flex items-center h-14 rounded-xl overflow-hidden"
                style={{
                  background: 'hsl(240 15% 11%)',
                  border: '1px solid hsl(240 15% 14%)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-full flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                  style={{ borderRight: '1px solid hsl(240 15% 14%)' }}
                >
                  <Minus size={14} />
                </button>
                <Input
                  type="number"
                  min={1}
                  max={availableAtOrigin}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-full border-0 bg-transparent text-center text-xl font-bold tabular-nums focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableAtOrigin || 999, quantity + 1))}
                  className="w-12 h-full flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                  style={{ borderLeft: '1px solid hsl(240 15% 14%)' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                Observação <span className="normal-case tracking-normal opacity-50">(opcional)</span>
              </span>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reposição semanal"
                className="h-14 rounded-xl border-transparent hover:border-[hsl(240_15%_18%)] transition-colors"
                style={{
                  background: 'hsl(240 15% 11%)',
                  borderColor: 'hsl(240 15% 14%)',
                }}
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

        {/* ─── DIVIDER ─────────────────────────────────────────────── */}
        <div className="mx-5 sm:mx-6 h-px" style={{ background: 'hsl(240 15% 14%)' }} />

        {/* ─── SUBMIT BUTTON ───────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <button
            onClick={handleTransfer}
            disabled={!isValid || transfer.isPending}
            className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: isValid
                ? 'linear-gradient(135deg, hsl(42 60% 55%), hsl(42 50% 45%))'
                : 'hsl(240 15% 11%)',
              color: isValid ? 'hsl(240 25% 4%)' : 'hsl(240 10% 30%)',
              boxShadow: isValid
                ? '0 4px 24px hsl(42 60% 55% / 0.3), 0 1px 3px hsl(42 60% 55% / 0.15)'
                : 'none',
              border: isValid ? 'none' : '1px solid hsl(240 15% 14%)',
            }}
          >
            <Send size={16} />
            {transfer.isPending ? 'Transferindo...' : 'Confirmar Transferência'}
          </button>
        </div>
      </div>

      {/* ── RECENT TRANSFERS ──────────────────────────────────────── */}
      {transferMovements.length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden animate-slide-up"
          style={{
            background: 'hsl(240 20% 7%)',
            borderColor: 'hsl(240 15% 14%)',
          }}
        >
          <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center gap-2.5">
            <Clock size={13} style={{ color: 'hsl(42 60% 55% / 0.5)' }} />
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">
              Transferências Recentes
            </p>
          </div>
          <div>
            {transferMovements.slice(0, 10).map((mv, idx) => {
              const mvImage = mv.product?.sku ? getProductImage(mv.product.sku) : undefined
              return (
                <div
                  key={mv.id}
                  className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5"
                  style={{
                    borderTop: idx > 0 ? '1px solid hsl(240 15% 12%)' : undefined,
                  }}
                >
                  {mvImage ? (
                    <img
                      src={mvImage}
                      alt={mv.product?.name ?? ''}
                      className="w-9 h-9 rounded-lg object-contain shrink-0"
                      style={{ background: 'hsl(240 15% 12%)' }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'hsl(240 15% 12%)' }}
                    >
                      <Package size={14} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm text-foreground truncate block">
                      {mv.product?.name ?? mv.product_id}
                    </span>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{mv.notes ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold tabular-nums"
                      style={{
                        background: mv.quantity > 0 ? 'hsl(160 50% 45% / 0.1)' : 'hsl(0 60% 50% / 0.1)',
                        color: mv.quantity > 0 ? 'hsl(160 50% 55%)' : 'hsl(0 70% 60%)',
                        borderColor: mv.quantity > 0 ? 'hsl(160 50% 45% / 0.2)' : 'hsl(0 60% 50% / 0.2)',
                      }}
                    >
                      {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 tabular-nums">
                      {new Date(mv.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ───────────────────────────────────────────── */}
      {transferMovements.length === 0 && (
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center animate-slide-up"
          style={{
            border: '1px dashed hsl(240 15% 16%)',
            background: 'hsl(240 20% 6%)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'hsl(240 15% 10%)' }}
          >
            <ArrowRightLeft size={22} className="text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Nenhuma transferência registrada</p>
          <p className="text-xs text-muted-foreground/40 mt-1.5 max-w-[260px] leading-relaxed">
            Preencha o formulário acima para mover estoque entre os pontos de venda
          </p>
        </div>
      )}
    </div>
  )
}
