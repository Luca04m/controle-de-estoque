import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CheckCircle2, ArrowRight, RotateCcw, Send } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useLocations } from '@/hooks/useLocations'
import { useTransferStock } from '@/hooks/useTransferStock'
import { getProductImage } from '@/lib/productImages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package, MapPin } from 'lucide-react'
import { QuantityInput } from './QuantityInput'
import { NotesField } from './NotesField'

const GOLD = 'hsl(42 60% 55%)'
const DARK_BG = 'hsl(240 20% 7%)'
const CARD_BORDER = 'hsl(240 15% 14%)'
const CARD_BG_INNER = 'hsl(240 15% 11%)'
const SERIF_FONT = '"DM Serif Display", Georgia, serif'

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function TransferFormPage() {
  const navigate = useNavigate()
  const { data: products } = useProducts()
  const { data: locations } = useLocations()
  const transfer = useTransferStock()

  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)

  const fromLocation = locations?.find((l) => l.id === fromLocationId)
  const toLocation = locations?.find((l) => l.id === toLocationId)
  const selectedProduct = products?.find((p) => p.id === productId)

  const canSubmit = fromLocationId && toLocationId && fromLocationId !== toLocationId && productId && quantity > 0

  async function handleSubmit() {
    if (!canSubmit) return
    try {
      await transfer.mutateAsync({ from_location_id: fromLocationId, to_location_id: toLocationId, product_id: productId, quantity, notes: notes || undefined })
      setSuccess(true)
    } catch {
      // errors handled by hook
    }
  }

  function reset() {
    setFromLocationId('')
    setToLocationId('')
    setProductId('')
    setQuantity(1)
    setNotes('')
    setSuccess(false)
  }

  if (success) {
    return (
      <div
        className="rounded-2xl border p-8 sm:p-12 flex flex-col items-center text-center animate-slide-up"
        style={{ background: DARK_BG, borderColor: 'hsl(142 50% 40% / 0.25)' }}
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'hsl(142 50% 45% / 0.15)' }}>
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl text-foreground mb-2" style={{ fontFamily: SERIF_FONT }}>Transferencia Realizada!</h2>
        <p className="text-sm text-muted-foreground mb-2">
          {quantity} un. de <span className="text-foreground">{selectedProduct?.name}</span>
        </p>
        <p className="text-xs text-muted-foreground/60 mb-6">
          {fromLocation?.name} → {toLocation?.name} — {formatDateShort(new Date().toISOString())}
        </p>
        <div className="flex gap-3">
          <button onClick={reset} className="h-12 px-8 rounded-xl font-bold text-sm flex items-center gap-2.5 active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`, color: 'hsl(240 25% 4%)', boxShadow: `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}` }}>
            <RotateCcw size={16} /> Nova Transferencia
          </button>
          <button onClick={() => navigate('/entrada')} className="h-12 px-6 rounded-xl font-semibold text-sm" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}`, color: 'hsl(0 0% 70%)' }}>
            Voltar ao Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <button onClick={() => navigate('/entrada')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight size={14} className="rotate-180" />
        Voltar
      </button>

      <div className="rounded-2xl border overflow-hidden" style={{ background: DARK_BG, borderColor: CARD_BORDER }}>
        <div className="p-5 sm:p-6 space-y-5">
          {/* Locations row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
                <MapPin size={12} style={{ color: GOLD }} /> Origem
              </p>
              <Select value={fromLocationId} onValueChange={(v) => { if (v) setFromLocationId(v) }}>
                <SelectTrigger className="h-12 rounded-xl border-transparent" style={{ background: CARD_BG_INNER }}>
                  <SelectValue placeholder="De onde..." />
                </SelectTrigger>
                <SelectContent>
                  {locations?.filter((l) => l.id !== toLocationId).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-6 shrink-0">
              <ArrowRight size={18} className="text-muted-foreground/40" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
                <MapPin size={12} style={{ color: GOLD }} /> Destino
              </p>
              <Select value={toLocationId} onValueChange={(v) => { if (v) setToLocationId(v) }}>
                <SelectTrigger className="h-12 rounded-xl border-transparent" style={{ background: CARD_BG_INNER }}>
                  <SelectValue placeholder="Para onde..." />
                </SelectTrigger>
                <SelectContent>
                  {locations?.filter((l) => l.id !== fromLocationId).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-px" style={{ background: CARD_BORDER }} />

          {/* Product */}
          <div className="space-y-1.5">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
              <Package size={12} style={{ color: GOLD }} /> Produto
            </p>
            <Select value={productId} onValueChange={(v) => { if (v) setProductId(v) }}>
              <SelectTrigger className="h-14 rounded-xl border-transparent" style={{ background: CARD_BG_INNER }}>
                {selectedProduct ? (
                  <div className="flex items-center gap-2.5 text-left">
                    {(() => { const img = getProductImage(selectedProduct.sku); return img ? <img src={img} alt={selectedProduct.name} className="w-7 h-7 rounded-md object-contain bg-secondary/50" /> : <Package size={14} className="text-muted-foreground" /> })()}
                    <span className="text-sm">{selectedProduct.name}</span>
                  </div>
                ) : <SelectValue placeholder="Selecionar produto..." />}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {products?.map((p) => {
                  const img = getProductImage(p.sku)
                  return (
                    <SelectItem key={p.id} value={p.id} className="rounded-lg">
                      <div className="flex items-center gap-2.5">
                        {img ? <img src={img} alt={p.name} className="w-7 h-7 rounded-md object-contain bg-secondary/50" /> : <Package size={14} className="text-muted-foreground" />}
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

          <QuantityInput value={quantity} onChange={setQuantity} min={1} />
          <NotesField value={notes} onChange={setNotes} />
        </div>

        <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
        <div className="p-5 sm:p-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || transfer.isPending}
            className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ background: canSubmit ? `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))` : CARD_BG_INNER, color: canSubmit ? 'hsl(240 25% 4%)' : 'hsl(240 10% 30%)', boxShadow: canSubmit ? `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}` : 'none', border: canSubmit ? 'none' : `1px solid ${CARD_BORDER}` }}
          >
            <Send size={16} />
            {transfer.isPending ? 'Transferindo...' : 'Confirmar Transferencia'}
          </button>
        </div>
      </div>
    </div>
  )
}
