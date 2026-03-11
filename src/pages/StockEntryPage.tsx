import { useState, useRef, useEffect } from 'react'
import {
  PackagePlus,
  Search,
  X,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Warehouse,
  SlidersHorizontal,
  AlertOctagon,
  ArrowRightLeft,
  ArrowRight,
  Package,
  MapPin,
  Send,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import { useRegisterMovement, useStockMovements } from '@/hooks/useStockMovements'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useLocations } from '@/hooks/useLocations'
import { useTransferStock } from '@/hooks/useTransferStock'
import { getMockStockForLocation } from '@/hooks/useLocationStock'
import { LocationSelector } from '@/components/LocationSelector'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Product, ProductCategory, StockMovement, MovementAction } from '@/types'
import { getProductImage } from '@/lib/productImages'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = 'hsl(42 60% 55%)'
const GOLD_DARK = 'hsl(240 25% 6%)'

// C-01: origens por tipo de movimentação
const ORIGIN_LABELS_BY_TYPE: Record<MovementAction, readonly string[]> = {
  in:         ['Lamas Destilaria', 'Reposição Interna', 'Fornecedor Externo', 'Ajuste Inventário', 'Outro'],
  out:        ['Venda Delivery', 'Venda B2B', 'Transferência', 'Amostras / Brinde', 'Outro'],
  adjustment: ['Contagem Física', 'Correção Sistema', 'Devolução', 'Outro'],
  loss:       ['Dano no Transporte', 'Dano no Armazenamento', 'Extravio', 'Vencimento', 'Outro'],
  transfer:   ['Transferência entre lojas'],
}

// C-01: metadados visuais por tipo de movimento
const MOVEMENT_TYPE_META: Record<MovementAction, {
  label: string
  subtitle: string
  sign: string
  color: string
  bgOpacity: string
  borderOpacity: string
  originLabel: string
}> = {
  in: {
    label: 'Entrada',
    subtitle: 'Recebimento de mercadoria',
    sign: '+',
    color: GOLD,
    bgOpacity: 'hsl(42 60% 55% / 0.1)',
    borderOpacity: 'hsl(42 60% 55% / 0.3)',
    originLabel: 'Origem da Entrada',
  },
  out: {
    label: 'Saída',
    subtitle: 'Venda ou transferência',
    sign: '−',
    color: '#f87171',
    bgOpacity: 'hsl(0 80% 65% / 0.1)',
    borderOpacity: 'hsl(0 80% 65% / 0.3)',
    originLabel: 'Motivo da Saída',
  },
  adjustment: {
    label: 'Ajuste',
    subtitle: 'Correção de inventário',
    sign: '±',
    color: '#fbbf24',
    bgOpacity: 'hsl(45 90% 60% / 0.1)',
    borderOpacity: 'hsl(45 90% 60% / 0.3)',
    originLabel: 'Motivo do Ajuste',
  },
  loss: {
    label: 'Perda',
    subtitle: 'Dano, extravio ou vencimento',
    sign: '−',
    color: '#fb923c',
    bgOpacity: 'hsl(25 90% 60% / 0.1)',
    borderOpacity: 'hsl(25 90% 60% / 0.3)',
    originLabel: 'Causa da Perda',
  },
  transfer: {
    label: 'Transferência',
    subtitle: 'Entre pontos de venda',
    sign: '↔',
    color: '#8b5cf6',
    bgOpacity: 'hsl(258 65% 55% / 0.1)',
    borderOpacity: 'hsl(258 65% 55% / 0.3)',
    originLabel: 'Destino',
  },
}

const QUICK_QTY = [1, 5, 10, 24, 48] as const

const CATEGORY_META: Record<ProductCategory, { label: string; tw: string; dot: string }> = {
  honey:      { label: 'Honey',      tw: 'text-amber-400  bg-amber-400/10  border-amber-400/25',  dot: '#fbbf24' },
  cappuccino: { label: 'Cappuccino', tw: 'text-orange-400 bg-orange-400/10 border-orange-400/25', dot: '#fb923c' },
  blended:    { label: 'Blended',    tw: 'text-violet-400 bg-violet-400/10 border-violet-400/25', dot: '#a78bfa' },
  acessorio:  { label: 'Acessório',  tw: 'text-slate-400  bg-slate-400/10  border-slate-400/25',  dot: '#94a3b8' },
}

const CATEGORIES: Array<{ key: ProductCategory | 'all'; label: string }> = [
  { key: 'all',        label: 'Todos'      },
  { key: 'honey',      label: 'Honey'      },
  { key: 'cappuccino', label: 'Cappuccino' },
  { key: 'blended',    label: 'Blended'    },
  { key: 'acessorio',  label: 'Acessório'  },
]

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const ACTION_COLORS: Record<MovementAction, string> = {
  in:         '#34d399',
  out:        '#f87171',
  adjustment: '#fbbf24',
  loss:       '#fb923c',
  transfer:   '#8b5cf6',
}

type Step = 'select' | 'quantity' | 'confirm' | 'success'
type TabKey = 'movements' | 'transfers'

// ─── Micro-components ─────────────────────────────────────────────────────────

// A-01: indicador de progresso do wizard
function StepIndicator({ current }: { current: 'quantity' | 'confirm' }) {
  const steps = [
    { key: 'quantity', label: 'Qtd.' },
    { key: 'confirm',  label: 'Revisar' },
  ]
  const currentIndex = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center gap-2 flex-1">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2 flex-1 last:flex-none">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all ${
              i <= currentIndex
                ? 'bg-gold/20 border border-gold/50 text-gold'
                : 'bg-white/5 border border-white/10 text-white/30'
            }`}
          >
            {i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px transition-all ${i < currentIndex ? 'bg-gold/40' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
      <span className="text-xs text-white/35 ml-1">
        Passo {currentIndex + 1} de {steps.length}
      </span>
    </div>
  )
}

function StockBar({
  current,
  min,
  projected,
}: {
  current: number
  min: number
  projected?: number
}) {
  const target = Math.max(min * 3, current * 1.5, 1)
  const currentPct = Math.min(100, Math.round((current / target) * 100))
  const projectedPct = projected !== undefined
    ? Math.min(100, Math.max(0, Math.round((projected / target) * 100)))
    : undefined
  const isCritical = current <= min
  const projectedOk = projected !== undefined ? projected > min : true

  return (
    <div className="relative w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      {projectedPct !== undefined && (
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${projectedOk ? 'bg-emerald-500/25' : 'bg-red-500/25'}`}
          style={{ width: `${projectedPct}%` }}
        />
      )}
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
        style={{ width: `${currentPct}%` }}
      />
      {min > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-white/30"
          style={{ left: `${Math.min(100, Math.round((min / target) * 100))}%` }}
        />
      )}
    </div>
  )
}

function CategoryBadge({ category }: { category: ProductCategory }) {
  const meta = CATEGORY_META[category]
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${meta.tw}`}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  )
}

// C-01: strip com ícone e cor por tipo de movimento
function RecentMovementStrip({ movement }: { movement: StockMovement }) {
  const when = fmtDate.format(new Date(movement.created_at))
  const actionColor = ACTION_COLORS[movement.action]
  const typeMeta = MOVEMENT_TYPE_META[movement.action]

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${actionColor}18`, border: `1px solid ${actionColor}35` }}
      >
        {movement.action === 'in' ? (
          <Plus size={12} style={{ color: actionColor }} />
        ) : movement.action === 'out' ? (
          <Minus size={12} style={{ color: actionColor }} />
        ) : movement.action === 'adjustment' ? (
          <SlidersHorizontal size={11} style={{ color: actionColor }} />
        ) : (
          <AlertOctagon size={11} style={{ color: actionColor }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">
          {movement.product?.name ?? 'Produto'}
        </p>
        <p className="text-[10px] text-white/35">{when}</p>
      </div>
      <span className="text-sm font-black flex-shrink-0" style={{ color: actionColor }}>
        {typeMeta.sign}{movement.quantity}
      </span>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="w-full px-4 pt-4 space-y-3">
      <Skeleton className="h-11 w-full rounded-xl bg-white/5" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-9 flex-1 rounded-xl bg-white/5" />)}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/5" />)}
      </div>
    </div>
  )
}

// ─── Transfers Tab Content ────────────────────────────────────────────────────

function TransfersTab() {
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
    <div className="space-y-6 max-w-3xl mx-auto animate-slide-up">

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
            <MapPin size={12} style={{ color: GOLD }} />
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
                        <MapPin size={14} style={{ color: GOLD }} />
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
                <ArrowRight size={16} style={{ color: GOLD }} />
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
                        <MapPin size={14} style={{ color: GOLD }} />
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
              <ArrowRightLeft size={13} style={{ color: GOLD }} />
              <span className="text-xs font-semibold text-foreground">{fromLocation.name}</span>
              <ArrowRight size={11} style={{ color: GOLD }} />
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
            <Package size={12} style={{ color: GOLD }} />
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
                <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: GOLD }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function StockEntryPage() {
  const navigate = useNavigate()
  const { data: products, isLoading } = useProducts()
  const { data: recentMovements } = useStockMovements({ limit: 5 })
  const registerMovement = useRegisterMovement()
  const { userLocationId } = useUserLocation()

  // ── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('movements')
  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(userLocationId ?? 'loc-degusto-tijuca')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // C-01: tipo de movimento e sinal do ajuste
  const [movementType, setMovementType] = useState<MovementAction>('in')
  const [adjustmentSign, setAdjustmentSign] = useState<1 | -1>(1)

  const [quantity, setQuantity] = useState(1)
  const [origin, setOrigin] = useState<string | null>(null)
  const [customOrigin, setCustomOrigin] = useState('')
  const [invoice, setInvoice] = useState('')
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [customQtyMode, setCustomQtyMode] = useState(false)
  const [customQtyValue, setCustomQtyValue] = useState('')

  const searchRef = useRef<HTMLInputElement>(null)
  const customQtyRef = useRef<HTMLInputElement>(null)

  const currentOriginLabels = ORIGIN_LABELS_BY_TYPE[movementType]
  const isOtherOrigin = origin === 'Outro'
  const activeOrigin = isOtherOrigin ? customOrigin.trim() : (origin ?? '')
  const canProceed = activeOrigin.length > 0 && quantity >= 1

  const criticalProducts = products?.filter(p => p.current_stock <= p.min_stock) ?? []

  const filteredProducts = (products ?? []).filter(p => {
    const matchSearch =
      search.trim() === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    return matchSearch && matchCat
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aCrit = a.current_stock <= a.min_stock ? 0 : 1
    const bCrit = b.current_stock <= b.min_stock ? 0 : 1
    return aCrit - bCrit || a.name.localeCompare(b.name)
  })

  // C-01: estoque projetado com base no tipo de movimento
  function getProjectedStock(current: number, qty: number): number {
    if (movementType === 'in') return current + qty
    if (movementType === 'out' || movementType === 'loss') return current - qty
    if (movementType === 'adjustment') return current + qty * adjustmentSign
    return current
  }

  // C-01: quantidade assinada para envio ao hook
  function getSubmitQuantity(): number {
    if (movementType === 'adjustment') return quantity * adjustmentSign
    return quantity
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function goTo(s: Step) {
    setStep(s)
    window.scrollTo(0, 0)
  }

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p)
    setQuantity(1)
    setMovementType('in')
    setAdjustmentSign(1)
    setOrigin(null)
    setCustomOrigin('')
    setInvoice('')
    setInvoiceOpen(false)
    setCustomQtyMode(false)
    setCustomQtyValue('')
    goTo('quantity')
  }

  // C-01: reset de origem ao trocar tipo
  function handleMovementTypeChange(type: MovementAction) {
    setMovementType(type)
    setOrigin(null)
    setCustomOrigin('')
  }

  function handleQtyChange(val: number) {
    // M-05: clamp entre 1 e 9999
    const clamped = Math.max(1, Math.min(9999, val))
    setQuantity(clamped)
  }

  function handleQuickQty(n: number) {
    setQuantity(n)
    setCustomQtyMode(false)
    setCustomQtyValue('')
  }

  function handleCustomQtySubmit() {
    const parsed = parseInt(customQtyValue, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) {
      setQuantity(parsed)
      setCustomQtyMode(false)
    }
  }

  // C-02: try/catch adicionado para evitar falha silenciosa
  async function handleSubmit() {
    if (!selectedProduct) return
    try {
      await registerMovement.mutateAsync({
        product_id: selectedProduct.id,
        action: movementType,
        quantity: getSubmitQuantity(),
        notes: `${activeOrigin}${invoice ? ` — NF: ${invoice}` : ''}`,
        location_id: selectedLocationId ?? 'loc-degusto-tijuca',
      })
      goTo('success')
    } catch {
      // Erro exibido via onError toast no hook (useRegisterMovement)
    }
  }

  function handleReset() {
    setStep('select')
    setSelectedProduct(null)
    setQuantity(1)
    setMovementType('in')
    setAdjustmentSign(1)
    setOrigin(null)
    setCustomOrigin('')
    setInvoice('')
    setInvoiceOpen(false)
    setCustomQtyMode(false)
    setCustomQtyValue('')
    setSearch('')
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    if (activeTab === 'movements' && step === 'select' && searchRef.current) searchRef.current.focus()
  }, [activeTab, step])

  useEffect(() => {
    if (customQtyMode && customQtyRef.current) customQtyRef.current.focus()
  }, [customQtyMode])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) return <SkeletonGrid />

  const typeMeta = MOVEMENT_TYPE_META[movementType]

  // ── Step: Success ─────────────────────────────────────────────────────────

  if (step === 'success' && selectedProduct) {
    const submitQty = getSubmitQuantity()
    const projectedStock = getProjectedStock(selectedProduct.current_stock, quantity)
    const successImg = getProductImage(selectedProduct.sku)
    const successMeta = CATEGORY_META[selectedProduct.category]
    const displaySign = submitQty >= 0 ? '+' : ''

    const successTitle =
      movementType === 'in'         ? 'Entrada registrada!'  :
      movementType === 'out'        ? 'Saída registrada!'    :
      movementType === 'adjustment' ? 'Ajuste registrado!'   :
                                      'Perda registrada!'

    return (
      <div className="w-full px-4 pt-8 pb-10 flex flex-col items-center space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${typeMeta.color}18`, border: `1px solid ${typeMeta.color}40` }}
          >
            <CheckCircle2 size={38} style={{ color: typeMeta.color }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{successTitle}</h2>
            <p className="text-sm mt-1 text-white/40">{selectedProduct.name}</p>
            <p className="text-3xl font-black mt-2 tabular-nums" style={{ color: typeMeta.color }}>
              {displaySign}{submitQty} unidades
            </p>
          </div>
        </div>

        <div
          className="w-full rounded-2xl overflow-hidden border"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: `${typeMeta.color}30` }}
        >
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div
              className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(240 18% 8%)' }}
            >
              {successImg ? (
                <img src={successImg} alt={selectedProduct.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xl font-bold" style={{ color: successMeta.dot }}>
                  {selectedProduct.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">{selectedProduct.name}</p>
              <p className="text-[10px] font-mono mt-0.5 text-white/35">{selectedProduct.sku}</p>
              <div className="mt-1"><CategoryBadge category={selectedProduct.category} /></div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1 text-white/35">Antes</p>
              <p className="text-base font-black tabular-nums text-white/45">{selectedProduct.current_stock}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1 text-white/35">{typeMeta.label}</p>
              <p className="text-base font-black tabular-nums" style={{ color: typeMeta.color }}>
                {displaySign}{submitQty}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1 text-white/35">Depois</p>
              <p className={`text-base font-black tabular-nums ${projectedStock <= selectedProduct.min_stock ? 'text-red-400' : 'text-emerald-400'}`}>
                {projectedStock}
              </p>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2 border-t border-border text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/40">Motivo / Origem</span>
              <span className="font-medium text-white/80 text-right max-w-[60%] truncate">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between items-center">
                <span className="text-white/40">NF / Lote</span>
                <span className="font-mono text-white/70">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-white/40">Valor estimado</span>
              <span className="font-semibold" style={{ color: GOLD }}>
                {fmt.format(selectedProduct.price_cost * Math.abs(submitQty))}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={handleReset}
            className="w-full h-14 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: GOLD, color: GOLD_DARK }}
          >
            <Plus size={18} />
            Registrar outra movimentação
          </button>
          {/* M-04: navega ao dashboard ao invés de chamar handleReset */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full h-12 rounded-xl border text-sm transition-all hover:bg-white/[0.03] text-white/40"
            style={{ borderColor: 'hsl(240 15% 14%)' }}
          >
            Ir ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Confirm ─────────────────────────────────────────────────────────

  if (step === 'confirm' && selectedProduct) {
    const submitQty = getSubmitQuantity()
    const projectedStock = getProjectedStock(selectedProduct.current_stock, quantity)
    const confirmImg = getProductImage(selectedProduct.sku)
    const confirmMeta = CATEGORY_META[selectedProduct.category]
    const displaySign = submitQty >= 0 ? '+' : ''

    return (
      <div className="w-full px-4 pt-4 space-y-4 pb-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('quantity')}
            aria-label="Voltar para quantidade"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-all active:scale-95 border border-border"
          >
            <ArrowLeft size={16} className="text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Confirmar {typeMeta.label}</h1>
            <p className="text-xs text-white/35">Verifique os dados antes de confirmar</p>
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden border"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: `${typeMeta.color}35` }}
        >
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div
              className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(240 18% 8%)' }}
            >
              {confirmImg ? (
                <img src={confirmImg} alt={selectedProduct.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xl font-bold" style={{ color: confirmMeta.dot }}>
                  {selectedProduct.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-tight">{selectedProduct.name}</p>
              <p className="text-[11px] font-mono mt-0.5 text-white/35">{selectedProduct.sku}</p>
              <div className="mt-1.5"><CategoryBadge category={selectedProduct.category} /></div>
            </div>
          </div>

          <div className="flex items-stretch border-b border-border">
            <div className="flex-1 flex flex-col items-center justify-center py-5">
              <p className="text-[10px] uppercase tracking-wider mb-2 text-white/35">{typeMeta.label}</p>
              <p className="text-5xl font-black tabular-nums leading-none" style={{ color: typeMeta.color }}>
                {displaySign}{submitQty}
              </p>
              <p className="text-xs mt-1 text-white/35">unidades</p>
            </div>
            <div className="w-px self-stretch bg-border" />
            <div className="flex-1 flex flex-col justify-center gap-2 py-5 px-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Atual</span>
                <span className="font-semibold tabular-nums text-white/55">{selectedProduct.current_stock} un</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Após {typeMeta.label.toLowerCase()}</span>
                <span className={`font-black tabular-nums ${projectedStock <= selectedProduct.min_stock ? 'text-red-400' : 'text-emerald-400'}`}>
                  {projectedStock} un
                </span>
              </div>
              <StockBar
                current={selectedProduct.current_stock}
                min={selectedProduct.min_stock}
                projected={projectedStock}
              />
            </div>
          </div>

          <div className="px-4 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-start gap-3">
              <span className="text-white/40">Motivo / Origem</span>
              <span className="font-medium text-white/80 text-right">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between items-center">
                <span className="text-white/40">NF / Lote</span>
                <span className="font-mono text-white/70">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-white/40">Custo estimado</span>
              <span className="font-semibold" style={{ color: GOLD }}>
                {fmt.format(selectedProduct.price_cost * Math.abs(submitQty))}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => goTo('quantity')}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl border text-sm transition-all disabled:opacity-40 hover:bg-white/[0.03] text-white/50"
            style={{ borderColor: 'hsl(240 15% 14%)' }}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: GOLD, color: GOLD_DARK }}
          >
            <CheckCircle2 size={18} />
            {registerMovement.isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Quantity + Origin ───────────────────────────────────────────────

  if (step === 'quantity' && selectedProduct) {
    const projectedStock = getProjectedStock(selectedProduct.current_stock, quantity)
    const isQuickQty = (QUICK_QTY as readonly number[]).includes(quantity)
    const qtyImg = getProductImage(selectedProduct.sku)
    const qtyMeta = CATEGORY_META[selectedProduct.category]

    return (
      <div className="w-full px-4 pt-4 space-y-4 pb-10">
        {/* Header: A-01 step indicator */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('select')}
            aria-label="Voltar para seleção de produto"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-all active:scale-95 border border-border"
          >
            <ArrowLeft size={16} className="text-white/50" />
          </button>
          <StepIndicator current="quantity" />
        </div>

        {/* Product showcase */}
        <div
          className="flex items-center gap-4 p-4 rounded-2xl border"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
        >
          <div
            className="w-[100px] h-[100px] rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: 'hsl(240 18% 8%)' }}
          >
            {qtyImg ? (
              <img
                src={qtyImg}
                alt={selectedProduct.name}
                width={100}
                height={100}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-3xl font-bold" style={{ color: qtyMeta.dot }}>
                {selectedProduct.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-base font-bold text-white leading-tight">{selectedProduct.name}</p>
            <CategoryBadge category={selectedProduct.category} />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">Estoque atual:</span>
              <span
                className="font-black tabular-nums"
                style={{ color: selectedProduct.current_stock <= selectedProduct.min_stock ? '#f87171' : GOLD }}
              >
                {selectedProduct.current_stock} un
              </span>
            </div>
          </div>
        </div>

        {/* C-01: seletor de tipo de movimento */}
        <div
          className="rounded-2xl border p-4 space-y-3"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
        >
          <Label className="text-[10px] uppercase tracking-widest font-semibold text-white/35">
            Tipo de movimentação
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(MOVEMENT_TYPE_META) as [MovementAction, typeof typeMeta][]).map(([type, meta]) => (
              <button
                key={type}
                type="button"
                onClick={() => handleMovementTypeChange(type)}
                title={meta.subtitle}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-center transition-all active:scale-95"
                style={
                  movementType === type
                    ? { borderColor: meta.color, background: meta.bgOpacity }
                    : { borderColor: 'hsl(240 15% 14%)', background: 'transparent' }
                }
              >
                <span
                  className="text-base font-black leading-none"
                  style={{ color: movementType === type ? meta.color : 'rgba(255,255,255,0.30)' }}
                >
                  {meta.sign}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: movementType === type ? meta.color : 'rgba(255,255,255,0.35)' }}
                >
                  {meta.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity card */}
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
        >
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase tracking-widest font-semibold text-white/35">
              Quantidade
            </Label>
            {/* C-01: toggle de sinal para 'adjustment' */}
            {movementType === 'adjustment' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAdjustmentSign(1)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={
                    adjustmentSign === 1
                      ? { borderColor: '#34d399', color: '#34d399', background: 'rgba(52,211,153,0.1)' }
                      : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.40)', background: 'transparent' }
                  }
                >
                  + Aumentar
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentSign(-1)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={
                    adjustmentSign === -1
                      ? { borderColor: '#f87171', color: '#f87171', background: 'rgba(248,113,113,0.1)' }
                      : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.40)', background: 'transparent' }
                  }
                >
                  − Reduzir
                </button>
              </div>
            )}
          </div>

          {/* Big stepper */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleQtyChange(quantity - 1)}
              aria-label="Diminuir quantidade"
              className="w-16 h-16 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/[0.07]"
              style={{ border: '1px solid hsl(240 15% 14%)', background: 'hsl(240 18% 9%)' }}
            >
              <Minus size={22} className="text-white/60" />
            </button>

            <div
              className="flex-1 h-16 rounded-xl flex items-center justify-center"
              style={{ border: '1px solid hsl(240 15% 12%)', background: 'hsl(240 18% 9%)' }}
            >
              <span className="text-4xl font-black tabular-nums" style={{ color: typeMeta.color }}>
                {movementType === 'adjustment' ? (adjustmentSign > 0 ? '+' : '−') : typeMeta.sign}{quantity}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQtyChange(quantity + 1)}
              aria-label="Aumentar quantidade"
              className="w-16 h-16 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/[0.07]"
              style={{ border: '1px solid hsl(240 15% 14%)', background: 'hsl(240 18% 9%)' }}
            >
              <Plus size={22} className="text-white/60" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_QTY.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleQuickQty(n)}
                className="h-9 px-3 rounded-lg text-sm font-semibold border transition-all active:scale-95"
                style={
                  quantity === n && !customQtyMode
                    ? { borderColor: typeMeta.color, color: typeMeta.color, background: typeMeta.bgOpacity }
                    : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.4)', background: 'transparent' }
                }
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCustomQtyMode(true)
                setCustomQtyValue(String(isQuickQty ? '' : quantity))
              }}
              className="h-9 px-3 rounded-lg text-sm font-semibold border transition-all active:scale-95"
              style={
                customQtyMode || !isQuickQty
                  ? { borderColor: typeMeta.color, color: typeMeta.color, background: typeMeta.bgOpacity }
                  : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.4)', background: 'transparent' }
              }
            >
              Outro
            </button>
          </div>

          {customQtyMode && (
            <div className="flex gap-2">
              <Input
                ref={customQtyRef}
                type="number"
                inputMode="numeric"
                placeholder="Quantidade (máx. 9.999)..."
                value={customQtyValue}
                onChange={e => setCustomQtyValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomQtySubmit() }}
                className="flex-1 h-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 font-mono"
                min={1}
                max={9999}
              />
              <button
                type="button"
                onClick={handleCustomQtySubmit}
                className="h-10 px-4 rounded-lg text-sm font-semibold transition-all hover:text-white text-white/60"
                style={{ border: '1px solid hsl(240 15% 14%)', background: 'hsl(240 18% 9%)' }}
              >
                OK
              </button>
            </div>
          )}

          {/* Projected stock */}
          <div
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'hsl(240 18% 9%)', border: '1px solid hsl(240 15% 12%)' }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Estoque atual</span>
              <span className="font-semibold tabular-nums text-white/60">
                {selectedProduct.current_stock} un
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Após {typeMeta.label.toLowerCase()}</span>
              <span className={`font-black tabular-nums ${projectedStock <= selectedProduct.min_stock ? 'text-red-400' : 'text-emerald-400'}`}>
                {projectedStock} un
              </span>
            </div>
            <StockBar
              current={selectedProduct.current_stock}
              min={selectedProduct.min_stock}
              projected={projectedStock}
            />
            {selectedProduct.min_stock > 0 && (
              <p className="text-xs text-white/30">
                Mínimo: {selectedProduct.min_stock} un
              </p>
            )}
          </div>
        </div>

        {/* Origin card */}
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
        >
          <Label className="text-[10px] uppercase tracking-widest font-semibold text-white/35">
            {typeMeta.originLabel}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {currentOriginLabels.map(label => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOrigin(label)
                  if (label !== 'Outro') setCustomOrigin('')
                }}
                className="px-3 py-3 rounded-xl text-sm font-medium border transition-all active:scale-95 text-left"
                style={
                  origin === label
                    ? { borderColor: typeMeta.color, color: typeMeta.color, background: typeMeta.bgOpacity }
                    : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.45)', background: 'transparent' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          {isOtherOrigin && (
            <Input
              autoFocus
              placeholder="Descreva o motivo..."
              className="h-11 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25"
              value={customOrigin}
              onChange={e => setCustomOrigin(e.target.value)}
            />
          )}
        </div>

        {/* NF / Lote collapsible */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
        >
          <button
            type="button"
            onClick={() => setInvoiceOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <FileText size={14} className="text-white/30" />
              <span className="text-sm font-medium text-white/50">Nota Fiscal / Lote</span>
              {invoice && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-white/35 bg-white/[0.06]">
                  {invoice}
                </span>
              )}
            </div>
            {invoiceOpen
              ? <ChevronUp size={14} className="text-white/30" />
              : <ChevronDown size={14} className="text-white/30" />
            }
          </button>
          {invoiceOpen && (
            <div className="px-5 pb-4">
              <Input
                autoFocus
                placeholder="NF-2024-001 ou Lote ABC-123"
                className="h-11 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 font-mono"
                value={invoice}
                onChange={e => setInvoice(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => goTo('confirm')}
            disabled={!canProceed}
            className="w-full h-14 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-35 flex items-center justify-center gap-2"
            style={
              canProceed
                ? { background: GOLD, color: GOLD_DARK }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            Revisar
            <ChevronRight size={18} />
          </button>
          {!canProceed && (
            <p className="text-center text-xs text-white/40">
              Selecione o {typeMeta.originLabel.toLowerCase()} para continuar
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Step: Select Product (TABLE VIEW) ───────────────────────────────────

  return (
    <div className="w-full pb-10">
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3 space-y-3"
        style={{ background: 'hsl(240 25% 4% / 0.97)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(42 60% 55% / 0.12)' }}
          >
            <PackagePlus size={16} style={{ color: GOLD }} />
          </div>
          <h1 className="text-base font-bold text-white flex-1">Movimentação de Estoque</h1>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────── */}
        <div
          className="flex gap-0 rounded-xl overflow-hidden"
          style={{ background: 'hsl(240 18% 8%)', border: '1px solid hsl(240 15% 12%)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className="flex-1 relative h-10 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              color: activeTab === 'movements' ? GOLD : 'rgba(255,255,255,0.4)',
              background: activeTab === 'movements' ? 'hsl(42 60% 55% / 0.08)' : 'transparent',
            }}
          >
            <PackagePlus size={14} />
            Movimentações
            {activeTab === 'movements' && (
              <div
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: GOLD }}
              />
            )}
          </button>
          <div className="w-px self-stretch" style={{ background: 'hsl(240 15% 14%)' }} />
          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className="flex-1 relative h-10 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              color: activeTab === 'transfers' ? GOLD : 'rgba(255,255,255,0.4)',
              background: activeTab === 'transfers' ? 'hsl(42 60% 55% / 0.08)' : 'transparent',
            }}
          >
            <ArrowRightLeft size={14} />
            Transferências
            {activeTab === 'transfers' && (
              <div
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: GOLD }}
              />
            )}
          </button>
        </div>

        {/* Search + filters only for movements tab */}
        {activeTab === 'movements' && (
          <>
            {/* Location selector */}
            <div className="mt-1">
              <LocationSelector
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                showAll={false}
                required
              />
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                ref={searchRef}
                placeholder="Produto, SKU ou fornecedor..."
                aria-label="Buscar produto"
                className="h-10 pl-9 pr-9 bg-white/[0.05] border-white/10 text-white placeholder:text-white/25 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className="flex-shrink-0 h-8 px-3 rounded-lg text-xs font-semibold border transition-all"
                  style={
                    categoryFilter === cat.key
                      ? { borderColor: GOLD, color: GOLD, background: 'hsl(42 60% 55% / 0.1)' }
                      : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.4)', background: 'transparent' }
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────── */}
      {activeTab === 'transfers' ? (
        <div className="px-4 mt-2">
          <TransfersTab />
        </div>
      ) : (
        <div className="px-4 space-y-4 mt-1">
          {/* Critical banner */}
          {criticalProducts.length > 0 && (
            <div
              className="rounded-xl p-3 space-y-2.5"
              style={{ background: 'hsl(0 70% 15% / 0.3)', border: '1px solid hsl(0 70% 35% / 0.25)' }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  {criticalProducts.length} produto{criticalProducts.length > 1 ? 's' : ''} em estoque crítico
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {criticalProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    title={`Estoque abaixo do mínimo (${p.min_stock} un)`}
                    className="flex-shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-lg transition-all active:scale-95"
                    style={{ background: 'hsl(0 60% 20% / 0.4)', border: '1px solid hsl(0 70% 35% / 0.25)' }}
                  >
                    <span className="text-[11px] font-semibold text-red-300">{p.name}</span>
                    <span className="text-[10px] font-black text-red-500">{p.current_stock}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product TABLE */}
          {products && products.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center space-y-3">
              <Warehouse size={32} className="text-white/15" />
              <div>
                <p className="text-sm text-white/40 font-medium">Nenhum produto cadastrado</p>
                <p className="text-xs text-white/25 mt-1">Adicione produtos antes de movimentar o estoque</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/produtos')}
                className="text-xs font-semibold px-4 py-2 rounded-lg border transition-all hover:bg-white/[0.04]"
                style={{ borderColor: 'hsl(240 15% 14%)', color: GOLD }}
              >
                Ir para Produtos
              </button>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center space-y-2">
              <Warehouse size={32} className="text-white/15" />
              <p className="text-sm text-white/30">Nenhum produto encontrado</p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs text-white/40 underline underline-offset-2 mt-1 hover:text-white/60 transition-colors"
                >
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
            >
              <Table>
                <TableHeader>
                  <TableRow
                    className="border-b hover:bg-transparent"
                    style={{ borderColor: 'hsl(240 15% 12%)' }}
                  >
                    <TableHead className="text-[10px] uppercase tracking-widest text-white/35 font-semibold pl-3">
                      Produto
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest text-white/35 font-semibold hidden sm:table-cell">
                      SKU
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest text-white/35 font-semibold hidden md:table-cell">
                      Categoria
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest text-white/35 font-semibold text-right">
                      Estoque
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest text-white/35 font-semibold text-right hidden sm:table-cell">
                      Mínimo
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest text-white/35 font-semibold text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-8 pr-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map(product => {
                    const isCritical = product.current_stock <= product.min_stock
                    const img = getProductImage(product.sku)
                    return (
                      <TableRow
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="cursor-pointer border-b transition-all hover:bg-white/[0.04] active:bg-white/[0.06]"
                        style={{ borderColor: 'hsl(240 15% 10%)' }}
                      >
                        <TableCell className="pl-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                              style={{ background: 'hsl(240 18% 9%)' }}
                            >
                              {img ? (
                                <img
                                  src={img}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: CATEGORY_META[product.category].dot }}
                                >
                                  {product.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white leading-tight truncate max-w-[180px] sm:max-w-[240px]">
                                {product.name}
                              </p>
                              <p className="text-[10px] font-mono text-white/30 sm:hidden">{product.sku}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs font-mono text-white/40">{product.sku}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <CategoryBadge category={product.category} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className="text-sm font-black tabular-nums"
                            style={{ color: isCritical ? '#f87171' : GOLD }}
                          >
                            {product.current_stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="text-xs tabular-nums text-white/30">
                            {product.min_stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isCritical ? (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                              style={{
                                background: 'hsl(0 70% 50% / 0.15)',
                                color: '#f87171',
                                border: '1px solid hsl(0 70% 50% / 0.25)',
                              }}
                            >
                              <AlertTriangle size={9} />
                              Crítico
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                              style={{
                                background: 'hsl(160 50% 45% / 0.1)',
                                color: '#34d399',
                                border: '1px solid hsl(160 50% 45% / 0.2)',
                              }}
                            >
                              OK
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-3">
                          <ChevronRight size={14} className="text-white/20" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Recent movements */}
          {recentMovements && recentMovements.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-white/25" />
                <p className="text-[10px] uppercase tracking-widest font-semibold text-white/25">
                  Últimas movimentações
                </p>
              </div>
              <div className="space-y-1.5">
                {recentMovements.map(m => (
                  <RecentMovementStrip key={m.id} movement={m} />
                ))}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      )}
    </div>
  )
}
