import { useState, useRef, useEffect } from 'react'
import {
  PackagePlus,
  Search,
  X,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
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
import { getProductImage } from '@/lib/productImages'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = 'hsl(42 60% 55%)'
const GOLD_DARK = 'hsl(240 25% 6%)'

const ORIGIN_LABELS = [
  'Lamas Destilaria',
  'Reposição Interna',
  'Fornecedor Externo',
  'Ajuste Inventário',
  'Outro',
] as const

type OriginLabel = (typeof ORIGIN_LABELS)[number]

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
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: meta.dot }}
      />
      {meta.label}
    </span>
  )
}

function ProductCard({
  product,
  onSelect,
}: {
  product: Product
  onSelect: (p: Product) => void
}) {
  const isCritical = product.current_stock <= product.min_stock
  const img = getProductImage(product.sku)
  const meta = CATEGORY_META[product.category]

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="relative flex flex-col rounded-xl border overflow-hidden transition-all active:scale-[0.97] text-left"
      style={{
        backgroundColor: 'hsl(240 20% 7%)',
        borderColor: isCritical ? 'hsl(0 70% 35% / 0.5)' : 'hsl(240 15% 12%)',
      }}
    >
      {/* Image area */}
      <div
        className="relative w-full h-36 flex items-center justify-center overflow-hidden"
        style={{ background: 'hsl(240 18% 8%)' }}
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: 'hsl(240 15% 12%)', color: meta.dot }}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Critical badge */}
        {isCritical && (
          <div className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5 rounded">
            Crítico
          </div>
        )}

        {/* Stock overlay */}
        <div
          className="absolute bottom-2 right-2 text-xs font-black tabular-nums"
          style={{ color: isCritical ? '#f87171' : GOLD }}
        >
          {product.current_stock} un
        </div>
      </div>

      {/* Info area */}
      <div className="p-2.5 space-y-1.5 flex-1">
        <p className="text-[12px] font-semibold text-white leading-tight line-clamp-2">
          {product.name}
        </p>
        <CategoryBadge category={product.category} />
        <StockBar current={product.current_stock} min={product.min_stock} />
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

function SkeletonGrid() {
  return (
    <div className="w-full px-4 pt-4 space-y-3">
      <Skeleton className="h-11 w-full rounded-xl bg-white/5" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-9 flex-1 rounded-xl bg-white/5" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 w-full rounded-xl bg-white/5" />)}
      </div>
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
    if (searchRef.current) searchRef.current.focus()
  }, [])

  useEffect(() => {
    if (customQtyMode && customQtyRef.current) customQtyRef.current.focus()
  }, [customQtyMode])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) return <SkeletonGrid />

  // ── Step: Success ─────────────────────────────────────────────────────────

  if (step === 'success' && selectedProduct) {
    const newStock = selectedProduct.current_stock + quantity
    const successImg = getProductImage(selectedProduct.sku)
    const successMeta = CATEGORY_META[selectedProduct.category]

    return (
      <div className="w-full px-4 pt-8 pb-10 flex flex-col items-center space-y-6">
        {/* Checkmark */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'hsl(152 60% 35% / 0.12)', border: '1px solid hsl(152 60% 35% / 0.3)' }}
          >
            <CheckCircle2 size={38} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Entrada registrada!</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {selectedProduct.name}
            </p>
            <p className="text-3xl font-black mt-2 tabular-nums" style={{ color: GOLD }}>
              +{quantity} unidades
            </p>
          </div>
        </div>

        {/* Summary card */}
        <div
          className="w-full rounded-2xl overflow-hidden border"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(42 60% 55% / 0.2)' }}
        >
          {/* Product header */}
          <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'hsl(240 15% 12%)' }}>
            <div
              className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(240 18% 8%)' }}
            >
              {successImg ? (
                <img
                  src={successImg}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="text-xl font-bold" style={{ color: successMeta.dot }}>
                  {selectedProduct.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">{selectedProduct.name}</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{selectedProduct.sku}</p>
              <div className="mt-1">
                <CategoryBadge category={selectedProduct.category} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'hsl(240 15% 12%)' }}>
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Antes</p>
              <p className="text-base font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {selectedProduct.current_stock}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Adicionado</p>
              <p className="text-base font-black tabular-nums" style={{ color: GOLD }}>+{quantity}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Depois</p>
              <p className="text-base font-black tabular-nums text-emerald-400">{newStock}</p>
            </div>
          </div>

          {/* Details */}
          <div
            className="px-4 py-3 space-y-2 border-t text-sm"
            style={{ borderColor: 'hsl(240 15% 12%)' }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Origem</span>
              <span className="font-medium text-white/80 text-right max-w-[60%] truncate">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>NF / Lote</span>
                <span className="font-mono text-white/70">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Valor estimado</span>
              <span className="font-semibold" style={{ color: GOLD }}>
                {fmt.format(selectedProduct.price_cost * quantity)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3">
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
            className="w-full h-12 rounded-xl border text-sm transition-all hover:bg-white/[0.03]"
            style={{ borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.4)' }}
          >
            Início
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Confirm ─────────────────────────────────────────────────────────

  if (step === 'confirm' && selectedProduct) {
    const newStock = selectedProduct.current_stock + quantity
    const confirmImg = getProductImage(selectedProduct.sku)
    const confirmMeta = CATEGORY_META[selectedProduct.category]

    return (
      <div className="w-full px-4 pt-4 space-y-4 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('quantity')}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-all active:scale-95"
            style={{ border: '1px solid hsl(240 15% 14%)' }}
          >
            <ArrowLeft size={16} className="text-white/50" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Confirmar Entrada</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Verifique os dados antes de confirmar</p>
          </div>
        </div>

        {/* Summary card */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(42 60% 55% / 0.25)' }}
        >
          {/* Product row */}
          <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'hsl(240 15% 12%)' }}>
            <div
              className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(240 18% 8%)' }}
            >
              {confirmImg ? (
                <img
                  src={confirmImg}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="text-xl font-bold" style={{ color: confirmMeta.dot }}>
                  {selectedProduct.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-tight">{selectedProduct.name}</p>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{selectedProduct.sku}</p>
              <div className="mt-1.5">
                <CategoryBadge category={selectedProduct.category} />
              </div>
            </div>
          </div>

          {/* Qty + before/after */}
          <div className="flex items-stretch border-b" style={{ borderColor: 'hsl(240 15% 12%)' }}>
            <div className="flex-1 flex flex-col items-center justify-center py-5">
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Adicionando
              </p>
              <p className="text-5xl font-black tabular-nums leading-none" style={{ color: GOLD }}>
                +{quantity}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>unidades</p>
            </div>
            <div
              className="w-px self-stretch"
              style={{ background: 'hsl(240 15% 12%)' }}
            />
            <div className="flex-1 flex flex-col justify-center gap-2 py-5 px-4">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Atual</span>
                <span className="font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {selectedProduct.current_stock} un
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Após entrada</span>
                <span className="font-black text-emerald-400 tabular-nums">{newStock} un</span>
              </div>
              <StockBar
                current={selectedProduct.current_stock}
                min={selectedProduct.min_stock}
                projected={newStock}
              />
            </div>
          </div>

          {/* Details */}
          <div className="px-4 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-start gap-3">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Origem</span>
              <span className="font-medium text-white/80 text-right">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>NF / Lote</span>
                <span className="font-mono text-white/70">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Custo estimado</span>
              <span className="font-semibold" style={{ color: GOLD }}>
                {fmt.format(selectedProduct.price_cost * quantity)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => goTo('quantity')}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl border text-sm transition-all disabled:opacity-40 hover:bg-white/[0.03]"
            style={{ borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.5)' }}
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
    const qtyImg = getProductImage(selectedProduct.sku)
    const qtyMeta = CATEGORY_META[selectedProduct.category]

    return (
      <div className="w-full px-4 pt-4 space-y-4 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo('select')}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-all active:scale-95"
            style={{ border: '1px solid hsl(240 15% 14%)' }}
          >
            <ArrowLeft size={16} className="text-white/50" />
          </button>
          <h1 className="text-base font-bold text-white">Adicionar Estoque</h1>
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
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Estoque atual:</span>
              <span
                className="font-black tabular-nums"
                style={{ color: selectedProduct.current_stock <= selectedProduct.min_stock ? '#f87171' : GOLD }}
              >
                {selectedProduct.current_stock} un
              </span>
            </div>
          </div>
        </div>

        {/* Quantity card */}
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ backgroundColor: 'hsl(240 20% 7%)', borderColor: 'hsl(240 15% 12%)' }}
        >
          <Label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Quantidade a adicionar
          </Label>

          {/* Big stepper */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleQtyChange(quantity - 1)}
              className="w-16 h-16 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/[0.07]"
              style={{ border: '1px solid hsl(240 15% 14%)', background: 'hsl(240 18% 9%)' }}
            >
              <Minus size={22} className="text-white/60" />
            </button>

            <div
              className="flex-1 h-16 rounded-xl flex items-center justify-center"
              style={{ border: '1px solid hsl(240 15% 12%)', background: 'hsl(240 18% 9%)' }}
            >
              <span className="text-4xl font-black tabular-nums" style={{ color: GOLD }}>{quantity}</span>
            </div>

            <button
              type="button"
              onClick={() => handleQtyChange(quantity + 1)}
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
                    ? { borderColor: GOLD, color: GOLD, background: 'hsl(42 60% 55% / 0.1)' }
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
                  ? { borderColor: GOLD, color: GOLD, background: 'hsl(42 60% 55% / 0.1)' }
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
                placeholder="Quantidade personalizada..."
                value={customQtyValue}
                onChange={e => setCustomQtyValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomQtySubmit() }}
                className="flex-1 h-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 font-mono"
              />
              <button
                type="button"
                onClick={handleCustomQtySubmit}
                className="h-10 px-4 rounded-lg text-sm font-semibold transition-all hover:text-white"
                style={{ border: '1px solid hsl(240 15% 14%)', background: 'hsl(240 18% 9%)', color: 'rgba(255,255,255,0.6)' }}
              >
                OK
              </button>
            </div>
          )}

          {/* Projected stock bar */}
          <div
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'hsl(240 18% 9%)', border: '1px solid hsl(240 15% 12%)' }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Estoque atual</span>
              <span className="font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {selectedProduct.current_stock} un
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Após entrada</span>
              <span className="font-black text-emerald-400 tabular-nums">{projectedStock} un</span>
            </div>
            <StockBar
              current={selectedProduct.current_stock}
              min={selectedProduct.min_stock}
              projected={projectedStock}
            />
            {selectedProduct.min_stock > 0 && (
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
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
          <Label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Origem da Entrada
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {ORIGIN_LABELS.map(label => (
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
                    ? { borderColor: GOLD, color: GOLD, background: 'hsl(42 60% 55% / 0.08)' }
                    : { borderColor: 'hsl(240 15% 14%)', color: 'rgba(255,255,255,0.45)', background: 'transparent' }
                }
              >
                {label}
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
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Nota Fiscal / Lote
              </span>
              {invoice && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}>
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
          style={
            canProceed
              ? { background: GOLD, color: GOLD_DARK }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }
          }
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
        style={{ background: 'hsl(240 25% 4% / 0.97)', backdropFilter: 'blur(12px)' }}
      >
        {/* Title + search always visible */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(42 60% 55% / 0.12)' }}
          >
            <PackagePlus size={16} style={{ color: GOLD }} />
          </div>
          <h1 className="text-base font-bold text-white flex-1">Entrada de Estoque</h1>
        </div>

        {/* Search bar always visible */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            ref={searchRef}
            placeholder="Produto, SKU ou fornecedor..."
            className="h-10 pl-9 pr-9 bg-white/[0.05] border-white/10 text-white placeholder:text-white/25 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category filter tabs */}
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
      </div>

      <div className="px-4 space-y-4 mt-1">
        {/* Product grid */}
        {sortedProducts.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-3">
            {sortedProducts.map(p => (
              <ProductCard key={p.id} product={p} onSelect={handleSelectProduct} />
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

        <div className="h-4" />
      </div>
    </div>
  )
}
