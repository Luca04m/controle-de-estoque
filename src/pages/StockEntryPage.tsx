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
} from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useRegisterMovement, useStockMovements } from '@/hooks/useStockMovements'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product, ProductCategory, StockMovement } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = 'hsl(42 60% 55%)'
const GOLD_DARK = 'oklch(0.10 0 0)'

const ORIGIN_CHIPS = [
  { label: 'Lamas Destilaria', emoji: '🏭' },
  { label: 'Reposição Interna', emoji: '🔄' },
  { label: 'Fornecedor Externo', emoji: '🚚' },
  { label: 'Ajuste Inventário', emoji: '📋' },
  { label: 'Outro', emoji: '✏️' },
] as const

type OriginLabel = (typeof ORIGIN_CHIPS)[number]['label']

const QUICK_QTY = [1, 5, 10, 24, 48] as const

const CATEGORY_META: Record<
  ProductCategory,
  { label: string; emoji: string; tw: string; accent: string }
> = {
  honey:      { label: 'Honey',      emoji: '🍯', tw: 'text-amber-400  bg-amber-400/10  border-amber-400/25',  accent: '#fbbf24' },
  cappuccino: { label: 'Cappuccino', emoji: '☕', tw: 'text-orange-400 bg-orange-400/10 border-orange-400/25', accent: '#fb923c' },
  blended:    { label: 'Blended',    emoji: '🌀', tw: 'text-purple-400 bg-purple-400/10 border-purple-400/25', accent: '#c084fc' },
  acessorio:  { label: 'Acessório',  emoji: '🎁', tw: 'text-slate-400  bg-slate-400/10  border-slate-400/25',  accent: '#94a3b8' },
}

const CATEGORIES: Array<{ key: ProductCategory | 'all'; label: string; emoji: string }> = [
  { key: 'all',       label: 'Todos',     emoji: '' },
  { key: 'honey',     label: 'Honey',     emoji: '🍯' },
  { key: 'cappuccino',label: 'Cappuccino',emoji: '☕' },
  { key: 'blended',   label: 'Blended',   emoji: '🌀' },
  { key: 'acessorio', label: 'Acessório', emoji: '🎁' },
]

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

type Step = 'select' | 'quantity' | 'confirm' | 'success'

// ─── Micro-components ─────────────────────────────────────────────────────────

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
    ? Math.min(100, Math.round((projected / target) * 100))
    : undefined
  const isCritical = current <= min
  const projectedOk = projected !== undefined ? projected > min : true

  return (
    <div className="relative w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      {/* projected ghost bar (if present, render first as background) */}
      {projectedPct !== undefined && (
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${projectedOk ? 'bg-emerald-500/25' : 'bg-red-500/25'}`}
          style={{ width: `${projectedPct}%` }}
        />
      )}
      {/* current bar */}
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
        style={{ width: `${currentPct}%` }}
      />
      {/* min threshold marker */}
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
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.tw}`}>
      {meta.emoji} {meta.label}
    </span>
  )
}

function ProductRow({
  product,
  onSelect,
}: {
  product: Product
  onSelect: (p: Product) => void
}) {
  const isCritical = product.current_stock <= product.min_stock

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`
        w-full text-left px-4 py-3.5 border transition-all
        active:scale-[0.98] hover:border-[hsl(42_60%_55%/0.35)] hover:bg-[hsl(42_60%_55%/0.04)]
        ${isCritical
          ? 'border-red-800/35 bg-red-950/15 hover:border-red-700/50'
          : 'border-[hsl(240_15%_12%)] bg-[hsl(240_20%_6%)]'
        }
        rounded-2xl
      `}
    >
      <div className="flex items-center gap-3">
        {/* left: name + meta */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white leading-tight truncate">
              {product.name}
            </span>
            {isCritical && (
              <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800/40 px-1.5 py-0.5 rounded">
                Crítico
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CategoryBadge category={product.category} />
            <span className="text-[10px] font-mono text-white/30">{product.sku}</span>
            {product.supplier && (
              <span className="text-[10px] text-white/25 truncate hidden sm:inline">{product.supplier}</span>
            )}
          </div>
          <StockBar current={product.current_stock} min={product.min_stock} />
        </div>

        {/* right: stock count */}
        <div className="flex-shrink-0 text-right">
          <p className={`text-xl font-black leading-none tabular-nums ${isCritical ? 'text-red-400' : 'text-white'}`}>
            {product.current_stock}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">un</p>
        </div>
      </div>
    </button>
  )
}

function RecentMovementStrip({ movement }: { movement: StockMovement }) {
  const when = fmtDate.format(new Date(movement.created_at))
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <Plus size={12} className="text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">
          {movement.product?.name ?? 'Produto'}
        </p>
        <p className="text-[10px] text-white/30">{when}</p>
      </div>
      <span className="text-sm font-black text-emerald-400 flex-shrink-0">+{movement.quantity}</span>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="w-full px-4 pt-4 space-y-3">
      <Skeleton className="h-11 w-full rounded-xl bg-white/5" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-9 flex-1 rounded-xl bg-white/5" />)}
      </div>
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />)}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function StockEntryPage() {
  const { data: products, isLoading } = useProducts()
  const { data: recentMovements } = useStockMovements({ limit: 3 })
  const registerMovement = useRegisterMovement()

  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [origin, setOrigin] = useState<OriginLabel | null>(null)
  const [customOrigin, setCustomOrigin] = useState('')
  const [invoice, setInvoice] = useState('')
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [customQtyMode, setCustomQtyMode] = useState(false)
  const [customQtyValue, setCustomQtyValue] = useState('')

  const searchRef = useRef<HTMLInputElement>(null)
  const customQtyRef = useRef<HTMLInputElement>(null)

  const activeOrigin = origin === 'Outro' ? customOrigin.trim() : (origin ?? '')
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

  // sort: critical first
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aCrit = a.current_stock <= a.min_stock ? 0 : 1
    const bCrit = b.current_stock <= b.min_stock ? 0 : 1
    return aCrit - bCrit || a.name.localeCompare(b.name)
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  function goTo(s: Step) {
    setStep(s)
    window.scrollTo(0, 0)
  }

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p)
    setQuantity(1)
    setOrigin(null)
    setCustomOrigin('')
    setInvoice('')
    setInvoiceOpen(false)
    setCustomQtyMode(false)
    setCustomQtyValue('')
    goTo('quantity')
  }

  function handleQtyChange(val: number) {
    const clamped = Math.max(1, val)
    setQuantity(clamped)
  }

  function handleQuickQty(n: number) {
    setQuantity(n)
    setCustomQtyMode(false)
    setCustomQtyValue('')
  }

  function handleCustomQtySubmit() {
    const parsed = parseInt(customQtyValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(parsed)
      setCustomQtyMode(false)
    }
  }

  async function handleSubmit() {
    if (!selectedProduct) return
    await registerMovement.mutateAsync({
      product_id: selectedProduct.id,
      action: 'in',
      quantity,
      notes: `${activeOrigin}${invoice ? ` — NF: ${invoice}` : ''}`,
    })
    goTo('success')
  }

  function handleReset() {
    setStep('select')
    setSelectedProduct(null)
    setQuantity(1)
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
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    if (customQtyMode && customQtyRef.current) customQtyRef.current.focus()
  }, [customQtyMode])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) return <SkeletonList />

  // ── Step: Success ─────────────────────────────────────────────────────────

  if (step === 'success' && selectedProduct) {
    const newStock = selectedProduct.current_stock + quantity
    return (
      <div className="w-full px-4 pt-6 space-y-5">
        {/* Big success badge */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white">Entrada registrada!</h2>
          <p className="text-sm text-white/40 mt-1">Estoque atualizado com sucesso</p>
        </div>

        {/* Summary card */}
        <div className="bg-[hsl(240_20%_6%)] border border-[hsl(42_60%_55%/0.25)] rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30 mb-1">Produto</p>
              <p className="text-base font-bold text-white">{selectedProduct.name}</p>
              <p className="text-[11px] font-mono text-white/30 mt-0.5">{selectedProduct.sku}</p>
            </div>
            <CategoryBadge category={selectedProduct.category} />
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Qty in gold */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30 mb-2">Adicionado</p>
              <p className="text-5xl font-black leading-none" style={{ color: GOLD }}>+{quantity}</p>
              <p className="text-xs text-white/30 mt-1">unidades</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-right space-y-1">
              <div>
                <p className="text-[10px] text-white/30">Antes</p>
                <p className="text-sm font-semibold text-white/50">{selectedProduct.current_stock} un</p>
              </div>
              <div className="text-[10px] text-white/20">→</div>
              <div>
                <p className="text-[10px] text-white/30">Depois</p>
                <p className="text-lg font-black text-emerald-400">{newStock} un</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06]" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Origem</span>
              <span className="font-medium text-white/80 text-right max-w-[60%] truncate">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between">
                <span className="text-white/40">NF / Lote</span>
                <span className="font-mono text-white/70">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/40">Valor estimado</span>
              <span className="font-semibold" style={{ color: GOLD }}>{fmt.format(selectedProduct.price_cost * quantity)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-8">
          <button
            type="button"
            onClick={handleReset}
            className="w-full h-14 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: GOLD, color: GOLD_DARK }}
          >
            <Plus size={18} />
            Registrar outra entrada
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full h-12 rounded-xl border border-white/10 text-sm text-white/50 hover:bg-white/[0.03] transition-all"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Confirm ─────────────────────────────────────────────────────────

  if (step === 'confirm' && selectedProduct) {
    const newStock = selectedProduct.current_stock + quantity

    return (
      <div className="w-full px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('quantity')}
            className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.05] transition-all active:scale-95"
          >
            <ArrowLeft size={16} className="text-white/50" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Confirmar Entrada</h1>
            <p className="text-xs text-white/35">Verifique antes de confirmar</p>
          </div>
        </div>

        {/* Main summary card */}
        <div className="bg-[hsl(240_20%_6%)] border border-[hsl(42_60%_55%/0.3)] rounded-2xl overflow-hidden">
          {/* Top: product info */}
          <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30 mb-1">Produto</p>
              <p className="text-lg font-bold text-white leading-tight">{selectedProduct.name}</p>
              <p className="text-[11px] font-mono text-white/30 mt-0.5">{selectedProduct.sku}</p>
            </div>
            <CategoryBadge category={selectedProduct.category} />
          </div>

          <div className="border-t border-white/[0.06] mx-5" />

          {/* Qty + before/after */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30 mb-2">Adicionando</p>
              <p className="text-5xl font-black leading-none" style={{ color: GOLD }}>+{quantity}</p>
              <p className="text-xs text-white/30 mt-1">unidades</p>
            </div>
            <div className="flex-shrink-0 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 space-y-2 text-right">
              <div>
                <p className="text-[10px] text-white/30">Estoque atual</p>
                <p className="text-sm font-semibold text-white/50">{selectedProduct.current_stock} un</p>
              </div>
              <div className="text-[10px] text-white/20">↓</div>
              <div>
                <p className="text-[10px] text-white/30">Após entrada</p>
                <p className="text-xl font-black text-emerald-400">{newStock} un</p>
              </div>
            </div>
          </div>

          <div className="mx-5">
            <StockBar current={selectedProduct.current_stock} min={selectedProduct.min_stock} projected={newStock} />
          </div>

          <div className="border-t border-white/[0.06] mx-5 mt-4" />

          {/* Origin + NF + cost */}
          <div className="px-5 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-start gap-3">
              <span className="text-white/40 flex-shrink-0">Origem</span>
              <span className="font-medium text-white/80 text-right">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between">
                <span className="text-white/40">NF / Lote</span>
                <span className="font-mono text-white/70">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/40">Custo estimado</span>
              <span className="font-semibold" style={{ color: GOLD }}>
                {fmt.format(selectedProduct.price_cost * quantity)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pb-8">
          <button
            type="button"
            onClick={() => goTo('quantity')}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:bg-white/[0.03] transition-all disabled:opacity-40"
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
    const projectedStock = selectedProduct.current_stock + quantity
    const isQuickQty = (QUICK_QTY as readonly number[]).includes(quantity)

    return (
      <div className="w-full px-4 pt-4 space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('select')}
            className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.05] transition-all active:scale-95"
          >
            <ArrowLeft size={16} className="text-white/50" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">{selectedProduct.name}</h1>
            <p className="text-[11px] font-mono text-white/35">
              {selectedProduct.sku} · {selectedProduct.current_stock} em estoque
            </p>
          </div>
        </div>

        {/* Quantity card */}
        <div className="bg-[hsl(240_20%_6%)] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <Label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
            Quantidade a adicionar
          </Label>

          {/* Big stepper */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleQtyChange(quantity - 1)}
              className="w-14 h-14 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center hover:border-white/20 hover:bg-white/[0.07] transition-all active:scale-95"
            >
              <Minus size={20} className="text-white/60" />
            </button>

            <div className="flex-1 h-14 bg-white/[0.04] rounded-xl flex items-center justify-center border border-white/[0.06]">
              <span className="text-3xl font-black tabular-nums" style={{ color: GOLD }}>{quantity}</span>
            </div>

            <button
              type="button"
              onClick={() => handleQtyChange(quantity + 1)}
              className="w-14 h-14 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center hover:border-white/20 hover:bg-white/[0.07] transition-all active:scale-95"
            >
              <Plus size={20} className="text-white/60" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_QTY.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleQuickQty(n)}
                className={`h-9 px-3 rounded-lg text-sm font-semibold border transition-all active:scale-95 ${
                  quantity === n && !customQtyMode
                    ? 'border-[hsl(42_60%_55%)] text-[hsl(42_60%_55%)] bg-[hsl(42_60%_55%/0.1)]'
                    : 'border-white/[0.08] text-white/40 bg-white/[0.03] hover:border-white/20 hover:text-white/70'
                }`}
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
              className={`h-9 px-3 rounded-lg text-sm font-semibold border transition-all active:scale-95 ${
                customQtyMode || (!isQuickQty)
                  ? 'border-[hsl(42_60%_55%)] text-[hsl(42_60%_55%)] bg-[hsl(42_60%_55%/0.1)]'
                  : 'border-white/[0.08] text-white/40 bg-white/[0.03] hover:border-white/20 hover:text-white/70'
              }`}
            >
              +
            </button>
          </div>

          {/* Custom qty input */}
          {customQtyMode && (
            <div className="flex gap-2">
              <Input
                ref={customQtyRef}
                type="number"
                inputMode="numeric"
                placeholder="Quantidade..."
                value={customQtyValue}
                onChange={e => setCustomQtyValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomQtySubmit() }}
                className="flex-1 h-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 font-mono"
              />
              <button
                type="button"
                onClick={handleCustomQtySubmit}
                className="h-10 px-4 rounded-lg text-sm font-semibold border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                OK
              </button>
            </div>
          )}

          {/* Stock projection */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Estoque atual</span>
              <span className="font-semibold text-white/60 tabular-nums">{selectedProduct.current_stock} un</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Após entrada</span>
              <span className="font-black text-emerald-400 tabular-nums">{projectedStock} un</span>
            </div>
            <StockBar
              current={selectedProduct.current_stock}
              min={selectedProduct.min_stock}
              projected={projectedStock}
            />
            {selectedProduct.min_stock > 0 && (
              <p className="text-[10px] text-white/25">
                Mínimo: {selectedProduct.min_stock} un
              </p>
            )}
          </div>
        </div>

        {/* Origin card */}
        <div className="bg-[hsl(240_20%_6%)] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <Label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
            Origem da Entrada
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {ORIGIN_CHIPS.map(({ label, emoji }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOrigin(label)
                  if (label !== 'Outro') setCustomOrigin('')
                }}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium border transition-all active:scale-95 text-left ${
                  origin === label
                    ? 'border-[hsl(42_60%_55%)] text-[hsl(42_60%_55%)] bg-[hsl(42_60%_55%/0.08)]'
                    : 'border-white/[0.07] text-white/45 bg-white/[0.03] hover:border-white/15 hover:text-white/70'
                }`}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="leading-tight">{label}</span>
              </button>
            ))}
          </div>
          {origin === 'Outro' && (
            <Input
              autoFocus
              placeholder="Descreva a origem..."
              className="h-11 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25"
              value={customOrigin}
              onChange={e => setCustomOrigin(e.target.value)}
            />
          )}
        </div>

        {/* NF / Lote — collapsible */}
        <div className="bg-[hsl(240_20%_6%)] border border-white/[0.08] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setInvoiceOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <FileText size={14} className="text-white/30" />
              <span className="text-sm font-medium text-white/50">Nota Fiscal / Lote</span>
              {invoice && (
                <span className="text-[10px] font-mono text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-md">
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
        <button
          type="button"
          onClick={() => goTo('confirm')}
          disabled={!canProceed}
          className="w-full h-14 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-35 flex items-center justify-center gap-2"
          style={canProceed ? { background: GOLD, color: GOLD_DARK } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Revisar
          <ChevronRight size={18} />
        </button>
      </div>
    )
  }

  // ── Step: Select Product ──────────────────────────────────────────────────

  return (
    <div className="w-full pb-10">
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3 space-y-3"
        style={{ background: 'hsl(240 25% 4% / 0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-between gap-3">
          {searchOpen ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <Input
                  ref={searchRef}
                  placeholder="Produto, SKU ou fornecedor..."
                  className="h-10 pl-9 pr-4 bg-white/[0.05] border-white/10 text-white placeholder:text-white/25 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearch('') }}
                className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.05] transition-all flex-shrink-0"
              >
                <X size={15} className="text-white/50" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'hsl(42 60% 55% / 0.15)' }}
                >
                  <PackagePlus size={16} style={{ color: GOLD }} />
                </div>
                <h1 className="text-base font-bold text-white">Entrada</h1>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.05] transition-all"
              >
                <Search size={15} className="text-white/50" />
              </button>
            </>
          )}
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`flex-shrink-0 h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                categoryFilter === cat.key
                  ? 'border-[hsl(42_60%_55%)] text-[hsl(42_60%_55%)] bg-[hsl(42_60%_55%/0.1)]'
                  : 'border-white/[0.07] text-white/40 bg-white/[0.03] hover:border-white/15 hover:text-white/60'
              }`}
            >
              {cat.emoji ? `${cat.emoji} ${cat.label}` : cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-1">
        {/* Critical banner */}
        {criticalProducts.length > 0 && (
          <div className="bg-red-950/25 border border-red-800/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                {criticalProducts.length} crítico{criticalProducts.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {criticalProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p)}
                  className="flex-shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-xl bg-red-900/30 border border-red-700/25 hover:bg-red-800/35 transition-all active:scale-95"
                >
                  <span className="text-[11px] font-semibold text-red-300">{p.name}</span>
                  <span className="text-[10px] font-black text-red-500">{p.current_stock}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product list */}
        {sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center space-y-2">
            <Warehouse size={32} className="text-white/15" />
            <p className="text-sm text-white/30">Nenhum produto encontrado</p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-white/40 underline underline-offset-2 mt-1"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedProducts.map(p => (
              <ProductRow key={p.id} product={p} onSelect={handleSelectProduct} />
            ))}
          </div>
        )}

        {/* Recent entries strip */}
        {recentMovements && recentMovements.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-white/25" />
              <p className="text-[10px] uppercase tracking-widest font-semibold text-white/25">
                Últimas entradas
              </p>
            </div>
            <div className="space-y-1.5">
              {recentMovements
                .filter(m => m.action === 'in')
                .map(m => (
                  <RecentMovementStrip key={m.id} movement={m} />
                ))
              }
            </div>
          </div>
        )}

        {/* Reset icon shortcut when something was just done */}
        <div className="h-4" />
      </div>
    </div>
  )
}
