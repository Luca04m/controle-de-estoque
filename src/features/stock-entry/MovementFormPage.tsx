import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  CheckCircle2,
  Plus,
  Minus,
  FileText,
  Package,
  MapPin,
  Send,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useRegisterMovement, useRegisterBatchMovements } from '@/hooks/useStockMovements'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useLocations } from '@/hooks/useLocations'
import { getMockStockForLocation } from '@/hooks/useLocationStock'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getProductImage } from '@/lib/productImages'
import type { Product, MovementAction } from '@/types'

const GOLD = 'hsl(42 60% 55%)'
const DARK_BG = 'hsl(240 20% 7%)'
const CARD_BORDER = 'hsl(240 15% 14%)'
const CARD_BG_INNER = 'hsl(240 15% 11%)'
const SERIF_FONT = '"DM Serif Display", Georgia, serif'

interface CartItem {
  id: string
  product: Product
  quantity: number
}

const ACTION_META: Record<MovementAction, { label: string; color: string; bgColor: string; borderColor: string }> = {
  in:         { label: 'Entrada',        color: '#22c55e', bgColor: 'hsl(142 50% 45% / 0.1)',  borderColor: 'hsl(142 50% 45% / 0.25)' },
  out:        { label: 'Saida',          color: '#ef4444', bgColor: 'hsl(0 60% 50% / 0.1)',    borderColor: 'hsl(0 60% 50% / 0.25)'   },
  adjustment: { label: 'Ajuste',         color: '#f59e0b', bgColor: 'hsl(38 60% 50% / 0.1)',   borderColor: 'hsl(38 60% 50% / 0.25)'  },
  loss:       { label: 'Perda',          color: '#b91c1c', bgColor: 'hsl(0 60% 30% / 0.12)',   borderColor: 'hsl(0 60% 30% / 0.3)'    },
  transfer:   { label: 'Transferencia',  color: '#3b82f6', bgColor: 'hsl(217 60% 50% / 0.1)',  borderColor: 'hsl(217 60% 50% / 0.25)' },
}

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface MovementFormPageProps {
  action: MovementAction
}

export function MovementFormPage({ action }: MovementFormPageProps) {
  const navigate = useNavigate()
  const { data: products } = useProducts()
  const { data: locations } = useLocations()
  const { isManager, userLocationId } = useUserLocation()
  const registerSingle = useRegisterMovement()
  const registerBatch = useRegisterBatchMovements()

  const [step, setStep] = useState<1 | 2>(1)
  const [locationId, setLocationId] = useState<string>(userLocationId ?? '')
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearchId, setProductSearchId] = useState<string>('')
  const [origin, setOrigin] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const effectiveLocationId = isManager ? locationId : (userLocationId ?? '')
  const selectedLocation = locations?.find((l) => l.id === effectiveLocationId)
  const actionMeta = ACTION_META[action]

  const totalProducts = cart.length
  const totalUnits = cart.reduce((s, c) => s + c.quantity, 0)

  function addToCart() {
    if (!productSearchId) return
    const product = products?.find((p) => p.id === productSearchId)
    if (!product || cart.some((c) => c.product.id === product.id)) return
    setCart([...cart, { id: crypto.randomUUID(), product, quantity: 1 }])
    setProductSearchId('')
  }

  function updateCartQty(id: string, delta: number) {
    setCart(cart.map((c) => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c))
  }

  function setCartQty(id: string, qty: number) {
    setCart(cart.map((c) => c.id === id ? { ...c, quantity: Math.max(1, qty) } : c))
  }

  function removeFromCart(id: string) {
    setCart(cart.filter((c) => c.id !== id))
  }

  async function handleSubmit() {
    if (!effectiveLocationId || cart.length === 0) return
    setSubmitting(true)
    try {
      if (action === 'in' && cart.length > 1) {
        await registerBatch.mutateAsync(
          cart.map((c) => ({
            id: c.id,
            product_id: c.product.id,
            quantity: c.quantity,
            notes: notes || origin || '',
            location_id: effectiveLocationId,
          }))
        )
      } else {
        for (const item of cart) {
          await registerSingle.mutateAsync({
            product_id: item.product.id,
            action,
            quantity: item.quantity,
            notes: notes || origin || '',
            location_id: effectiveLocationId,
          })
        }
      }
      setSuccess(true)
    } catch {
      // errors handled by hooks
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep(1)
    setLocationId(userLocationId ?? '')
    setCart([])
    setProductSearchId('')
    setOrigin('')
    setNotes('')
    setSuccess(false)
  }

  // ── SUCCESS ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="rounded-2xl border p-8 sm:p-12 flex flex-col items-center text-center animate-slide-up"
        style={{ background: DARK_BG, borderColor: 'hsl(142 50% 40% / 0.25)' }}
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'hsl(142 50% 45% / 0.15)' }}>
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl text-foreground mb-2" style={{ fontFamily: SERIF_FONT }}>
          Movimentacao Registrada!
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          {totalProducts} produto{totalProducts > 1 ? 's' : ''} | {totalUnits} unidade{totalUnits > 1 ? 's' : ''} | {actionMeta.label}
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">
          {selectedLocation?.name ?? 'Local'} — {formatDateShort(new Date().toISOString())}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="h-12 px-8 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`, color: 'hsl(240 25% 4%)', boxShadow: `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}` }}
          >
            <RotateCcw size={16} />
            Nova Movimentacao
          </button>
          <button
            onClick={() => navigate('/entrada')}
            className="h-12 px-6 rounded-xl font-semibold text-sm transition-all hover:bg-[hsl(240_15%_13%)]"
            style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}`, color: 'hsl(0 0% 70%)' }}
          >
            Voltar ao Menu
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 1: LOCATION + ADD PRODUCTS ──────────────────────────────────
  if (step === 1) {
    const productsNotInCart = products?.filter((p) => !cart.some((c) => c.product.id === p.id))
    const canProceed = cart.length > 0 && effectiveLocationId !== ''

    return (
      <div className="space-y-5 animate-slide-up">
        <button onClick={() => navigate('/entrada')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className="rotate-180" />
          Voltar
        </button>

        <div className="rounded-2xl border overflow-hidden" style={{ background: DARK_BG, borderColor: CARD_BORDER }}>
          {/* Location */}
          <div className="p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <MapPin size={12} style={{ color: GOLD }} />
              Local
            </p>
            {!isManager && userLocationId ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${GOLD.replace(')', ' / 0.12)')}` }}>
                  <MapPin size={14} style={{ color: GOLD }} />
                </div>
                <div>
                  <span className="block text-sm font-medium text-foreground">{locations?.find((l) => l.id === userLocationId)?.name ?? 'Sua loja'}</span>
                  <span className="block text-[10px] text-muted-foreground">{locations?.find((l) => l.id === userLocationId)?.city}</span>
                </div>
              </div>
            ) : (
              <Select value={locationId} onValueChange={(v) => { if (v) setLocationId(v) }}>
                <SelectTrigger className="h-14 rounded-xl border-transparent" style={{ background: CARD_BG_INNER }}>
                  <SelectValue placeholder="Selecionar local" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-muted-foreground" />
                        {loc.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />

          {/* Add products */}
          <div className="p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <Package size={12} style={{ color: GOLD }} />
              Produtos
            </p>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Select value={productSearchId} onValueChange={(v) => { if (v) setProductSearchId(v) }}>
                  <SelectTrigger className="h-14 rounded-xl border-transparent" style={{ background: CARD_BG_INNER }}>
                    <SelectValue placeholder="Selecionar produto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {productsNotInCart?.map((p) => {
                      const img = getProductImage(p.sku)
                      return (
                        <SelectItem key={p.id} value={p.id} className="rounded-lg">
                          <div className="flex items-center gap-2.5">
                            {img ? <img src={img} alt={p.name} className="w-7 h-7 rounded-md object-contain bg-secondary/50" /> : <Package size={14} className="text-muted-foreground shrink-0" />}
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
              </div>
              <button
                onClick={addToCart}
                disabled={!productSearchId}
                className="h-14 w-14 rounded-xl flex items-center justify-center transition-all disabled:opacity-25 shrink-0"
                style={{ background: productSearchId ? `${GOLD.replace(')', ' / 0.15)')}` : CARD_BG_INNER, border: `1px solid ${productSearchId ? GOLD.replace(')', ' / 0.3)') : CARD_BORDER}` }}
              >
                <Plus size={20} style={{ color: productSearchId ? GOLD : 'hsl(240 10% 30%)' }} />
              </button>
            </div>

            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item) => {
                  const img = getProductImage(item.product.sku)
                  const stockHere = effectiveLocationId ? getMockStockForLocation(item.product.id, effectiveLocationId) : 0
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
                      {img ? (
                        <img src={img} alt={item.product.name} className="w-9 h-9 rounded-lg object-contain shrink-0" style={{ background: 'hsl(240 15% 14%)' }} />
                      ) : (
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(240 15% 14%)' }}>
                          <Package size={16} className="text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.product.sku}
                          {(action === 'out' || action === 'loss') && <span className="ml-2 text-muted-foreground/50">Est: {stockHere}</span>}
                        </p>
                      </div>
                      <div className="flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${CARD_BORDER}`, background: DARK_BG }}>
                        <button type="button" onClick={() => updateCartQty(item.id, -1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" style={{ borderRight: `1px solid ${CARD_BORDER}` }}>
                          <Minus size={12} />
                        </button>
                        <input type="number" min={1} value={item.quantity} onChange={(e) => setCartQty(item.id, parseInt(e.target.value) || 1)} className="w-12 h-9 bg-transparent text-center text-sm font-bold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-foreground" />
                        <button type="button" onClick={() => updateCartQty(item.id, 1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" style={{ borderLeft: `1px solid ${CARD_BORDER}` }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl p-8 flex flex-col items-center text-center" style={{ border: `1px dashed ${CARD_BORDER}`, background: 'hsl(240 20% 6%)' }}>
                <Package size={24} className="text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground/50">Selecione produtos acima para adicionar</p>
              </div>
            )}
          </div>

          {/* Origin / Notes */}
          {cart.length > 0 && (
            <>
              <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
              <div className="p-5 sm:p-6 space-y-4">
                {(action === 'in' || action === 'out') && (
                  <div className="space-y-2">
                    <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                      {action === 'in' ? 'Origem / Fornecedor' : 'Destino / Cliente'}
                    </span>
                    <Input
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder={action === 'in' ? 'Ex: Lamas Destilaria — lote 0309' : 'Ex: Pedido delivery — +55 21 99301-4477'}
                      className="h-12 rounded-xl border-transparent"
                      style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                    Observacoes <span className="normal-case tracking-normal opacity-50">(opcional)</span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    rows={2}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-transparent border resize-none focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground/40"
                    style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Summary + Proceed */}
          {cart.length > 0 && (
            <>
              <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background: `${GOLD.replace(')', ' / 0.06)')}`, border: `1px solid ${GOLD.replace(')', ' / 0.15)')}` }}>
                  <span className="text-sm font-semibold" style={{ color: GOLD }}>
                    {totalProducts} produto{totalProducts > 1 ? 's' : ''} | {totalUnits} unidade{totalUnits > 1 ? 's' : ''} total
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold" style={{ background: actionMeta.bgColor, color: actionMeta.color, borderColor: actionMeta.borderColor }}>
                    {actionMeta.label}
                  </Badge>
                </div>
                <button
                  onClick={() => canProceed && setStep(2)}
                  disabled={!canProceed}
                  className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ background: canProceed ? `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))` : CARD_BG_INNER, color: canProceed ? 'hsl(240 25% 4%)' : 'hsl(240 10% 30%)', boxShadow: canProceed ? `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}` : 'none', border: canProceed ? 'none' : `1px solid ${CARD_BORDER}` }}
                >
                  Revisar Movimentacao
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── STEP 2: CONFIRMATION ──────────────────────────────────────────────
  const actionMetaFinal = ACTION_META[action]

  return (
    <div className="space-y-5 animate-slide-up">
      <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight size={14} className="rotate-180" />
        Voltar para edicao
      </button>

      <div className="rounded-2xl border overflow-hidden" style={{ background: DARK_BG, borderColor: CARD_BORDER }}>
        <div className="p-5 sm:p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
            <FileText size={12} style={{ color: GOLD }} />
            Resumo da movimentacao
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl p-4" style={{ background: actionMetaFinal.bgColor, border: `1px solid ${actionMetaFinal.borderColor}` }}>
              <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Tipo</p>
              <p className="text-lg font-bold mt-1" style={{ color: actionMetaFinal.color }}>{actionMetaFinal.label}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: `${GOLD.replace(')', ' / 0.06)')}`, border: `1px solid ${GOLD.replace(')', ' / 0.15)')}` }}>
              <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Local</p>
              <p className="text-lg font-bold mt-1 truncate" style={{ color: GOLD }}>{selectedLocation?.name ?? '—'}</p>
            </div>
          </div>

          <div className="space-y-2">
            {cart.map((item) => {
              const img = getProductImage(item.product.sku)
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
                  {img ? <img src={img} alt={item.product.name} className="w-9 h-9 rounded-lg object-contain shrink-0" style={{ background: 'hsl(240 15% 14%)' }} /> : <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(240 15% 14%)' }}><Package size={16} className="text-muted-foreground/50" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{item.product.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold tabular-nums text-foreground">{item.quantity}</p>
                    <p className="text-[10px] text-muted-foreground/50">un.</p>
                  </div>
                </div>
              )
            })}
          </div>

          {(origin || notes) && (
            <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
              {origin && <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/70">{action === 'in' ? 'Origem:' : 'Destino:'}</span> {origin}</p>}
              {notes && <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold text-foreground/70">Obs:</span> {notes}</p>}
            </div>
          )}
        </div>

        <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
        <div className="p-5 sm:p-6 flex items-center justify-between" style={{ background: `${GOLD.replace(')', ' / 0.04)')}` }}>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: GOLD }}>
              {totalProducts} produto{totalProducts > 1 ? 's' : ''} | {totalUnits} un.
            </p>
          </div>
        </div>

        <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
        <div className="p-5 sm:p-6 flex gap-3">
          <button onClick={() => setStep(1)} className="flex-1 h-14 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-[hsl(240_15%_13%)]" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}`, color: 'hsl(0 0% 70%)' }}>
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-[2] h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`, color: 'hsl(240 25% 4%)', boxShadow: `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}` }}
          >
            <Send size={16} />
            {submitting ? 'Registrando...' : 'Confirmar Movimentacao'}
          </button>
        </div>
      </div>
    </div>
  )
}
