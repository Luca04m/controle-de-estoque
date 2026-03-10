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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import { useRegisterMovement, useStockMovements } from '@/hooks/useStockMovements'
import { useUserLocation } from '@/hooks/useUserLocation'
import { LocationSelector } from '@/components/LocationSelector'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div
        className="relative w-full h-36 flex items-center justify-center overflow-hidden"
        style={{ background: 'hsl(240 18% 8%)' }}
      >
        {img ? (
          // M-10: width/height explícitos evitam layout shift
          <img
            src={img}
            alt={product.name}
            width={144}
            height={144}
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

        {/* B-02: title explicativo no badge crítico */}
        {isCritical && (
          <div
            className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5 rounded"
            title={`Estoque abaixo do mínimo (${product.min_stock} un)`}
          >
            Crítico
          </div>
        )}

        <div
          className="absolute bottom-2 right-2 text-xs font-black tabular-nums"
          style={{ color: isCritical ? '#f87171' : GOLD }}
        >
          {product.current_stock} un
        </div>
      </div>

      <div className="p-2.5 space-y-1.5 flex-1">
        <p className="text-xs font-semibold text-white leading-tight line-clamp-2">
          {product.name}
        </p>
        <CategoryBadge category={product.category} />
        <StockBar current={product.current_stock} min={product.min_stock} />
      </div>
    </button>
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
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 w-full rounded-xl bg-white/5" />)}
      </div>
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
    if (searchRef.current) searchRef.current.focus()
  }, [])

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

          {/* Projected stock — C-01: cálculo correto para out/loss (subtrai) */}
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

        {/* Origin card — label dinâmico por tipo */}
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

        {/* CTA + A-02: helper text quando desabilitado */}
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
          {/* A-02: mensagem explicativa quando botão está desabilitado */}
          {!canProceed && (
            <p className="text-center text-xs text-white/40">
              Selecione o {typeMeta.originLabel.toLowerCase()} para continuar
            </p>
          )}
        </div>
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
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(42 60% 55% / 0.12)' }}
          >
            <PackagePlus size={16} style={{ color: GOLD }} />
          </div>
          {/* C-01: título genérico */}
          <h1 className="text-base font-bold text-white flex-1">Movimentação de Estoque</h1>
        </div>

        {/* Location selector */}
        <div className="mt-3">
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
      </div>

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

        {/* M-06: distingue "sem produtos cadastrados" de "sem resultados na busca" */}
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
          <div className="grid grid-cols-2 gap-3">
            {sortedProducts.map(p => (
              <ProductCard key={p.id} product={p} onSelect={handleSelectProduct} />
            ))}
          </div>
        )}

        {/* C-01: mostra todos os tipos de movimentação recente */}
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
    </div>
  )
}
