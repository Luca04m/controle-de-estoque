import { useState, useMemo } from 'react'
import {
  PackagePlus,
  Search,
  X,
  ChevronRight,
  CheckCircle2,
  Plus,
  Minus,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  SlidersHorizontal,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  MapPin,
  Send,
  Download,
  Filter,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import {
  useRegisterMovement,
  useRegisterBatchMovements,
  useAllMovements,
} from '@/hooks/useStockMovements'
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
import type { Product, StockMovement, MovementAction } from '@/types'
import { getProductImage } from '@/lib/productImages'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = 'hsl(42 60% 55%)'
const DARK_BG = 'hsl(240 20% 7%)'
const CARD_BORDER = 'hsl(240 15% 14%)'
const CARD_BG_INNER = 'hsl(240 15% 11%)'
const SERIF_FONT = '"DM Serif Display", Georgia, serif'
const PAGE_SIZE = 20

const MOVEMENT_TYPES: {
  action: MovementAction
  label: string
  description: string
  icon: typeof ArrowDownLeft
  color: string
  bgColor: string
  borderColor: string
}[] = [
  {
    action: 'in',
    label: 'Entrada',
    description: 'Recebimento de mercadoria',
    icon: ArrowDownLeft,
    color: '#22c55e',
    bgColor: 'hsl(142 50% 45% / 0.1)',
    borderColor: 'hsl(142 50% 45% / 0.25)',
  },
  {
    action: 'out',
    label: 'Saida',
    description: 'Venda ou retirada',
    icon: ArrowUpRight,
    color: '#ef4444',
    bgColor: 'hsl(0 60% 50% / 0.1)',
    borderColor: 'hsl(0 60% 50% / 0.25)',
  },
  {
    action: 'adjustment',
    label: 'Ajuste',
    description: 'Correcao de inventario',
    icon: SlidersHorizontal,
    color: '#f59e0b',
    bgColor: 'hsl(38 60% 50% / 0.1)',
    borderColor: 'hsl(38 60% 50% / 0.25)',
  },
  {
    action: 'loss',
    label: 'Perda',
    description: 'Quebra ou avaria',
    icon: AlertOctagon,
    color: '#b91c1c',
    bgColor: 'hsl(0 60% 30% / 0.12)',
    borderColor: 'hsl(0 60% 30% / 0.3)',
  },
]

function getActionMeta(action: MovementAction) {
  const map: Record<
    MovementAction,
    { label: string; color: string; bgColor: string; borderColor: string }
  > = {
    in: {
      label: 'Entrada',
      color: '#22c55e',
      bgColor: 'hsl(142 50% 45% / 0.1)',
      borderColor: 'hsl(142 50% 45% / 0.25)',
    },
    out: {
      label: 'Saida',
      color: '#ef4444',
      bgColor: 'hsl(0 60% 50% / 0.1)',
      borderColor: 'hsl(0 60% 50% / 0.25)',
    },
    adjustment: {
      label: 'Ajuste',
      color: '#f59e0b',
      bgColor: 'hsl(38 60% 50% / 0.1)',
      borderColor: 'hsl(38 60% 50% / 0.25)',
    },
    loss: {
      label: 'Perda',
      color: '#b91c1c',
      bgColor: 'hsl(0 60% 30% / 0.12)',
      borderColor: 'hsl(0 60% 30% / 0.3)',
    },
    transfer: {
      label: 'Transferencia',
      color: '#3b82f6',
      bgColor: 'hsl(217 60% 50% / 0.1)',
      borderColor: 'hsl(217 60% 50% / 0.25)',
    },
  }
  return map[action] ?? map.in
}

function formatDatePtBR(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Cart item type ──────────────────────────────────────────────────────────

interface CartItem {
  id: string
  product: Product
  quantity: number
}

// ─── Tab definitions ─────────────────────────────────────────────────────────

type TabId = 'history' | 'new'

const TABS: { id: TabId; label: string }[] = [
  { id: 'history', label: 'Historico' },
  { id: 'new', label: 'Nova Movimentacao' },
]

// ─── Grouped movement type ───────────────────────────────────────────────────

interface MovementGroup {
  key: string
  order_id: string | null
  movements: StockMovement[]
  action: MovementAction
  totalQty: number
  created_at: string
  location_id: string | null
  user: string
  notes: string
}

function groupMovements(movements: StockMovement[]): MovementGroup[] {
  const groups = new Map<string, StockMovement[]>()

  for (const mv of movements) {
    if (mv.order_id) {
      const existing = groups.get(mv.order_id)
      if (existing) {
        existing.push(mv)
      } else {
        groups.set(mv.order_id, [mv])
      }
    } else {
      const key = `standalone-${mv.id}`
      groups.set(key, [mv])
    }
  }

  const result: MovementGroup[] = []

  for (const [key, mvs] of groups) {
    const first = mvs[0]
    const totalQty = mvs.reduce((sum, m) => sum + Math.abs(m.quantity), 0)
    result.push({
      key,
      order_id: first.order_id,
      movements: mvs,
      action: first.action,
      totalQty,
      created_at: first.created_at,
      location_id: first.location_id,
      user: first.profile?.full_name ?? '—',
      notes: first.notes ?? '',
    })
  }

  // Sort by created_at desc
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return result
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function StockEntryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('history')

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${GOLD.replace(')', ' / 0.12)')}` }}
        >
          <PackagePlus size={18} style={{ color: GOLD }} />
        </div>
        <div>
          <h1
            className="text-xl text-foreground leading-tight"
            style={{ fontFamily: SERIF_FONT }}
          >
            Movimentacoes de Estoque
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Historico completo e registro de movimentacoes
          </p>
        </div>
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all"
            style={
              activeTab === tab.id
                ? {
                    background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`,
                    color: 'hsl(240 25% 4%)',
                    boxShadow: `0 2px 12px ${GOLD.replace(')', ' / 0.25)')}`,
                  }
                : {
                    background: 'transparent',
                    color: 'hsl(240 10% 50%)',
                  }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'new' && <NewMovementTab />}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: NOVA MOVIMENTACAO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NewMovementTab() {
  const { data: products } = useProducts()
  const { data: locations } = useLocations()
  const { isManager, userLocationId } = useUserLocation()
  const registerSingle = useRegisterMovement()
  const registerBatch = useRegisterBatchMovements()

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedAction, setSelectedAction] = useState<MovementAction | null>(null)
  const [locationId, setLocationId] = useState<string>(userLocationId ?? '')
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearchId, setProductSearchId] = useState<string>('')
  const [origin, setOrigin] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Auto-set location for operators
  const effectiveLocationId = isManager ? locationId : (userLocationId ?? '')
  const selectedLocation = locations?.find((l) => l.id === effectiveLocationId)

  // Cart helpers
  const totalProducts = cart.length
  const totalUnits = cart.reduce((s, c) => s + c.quantity, 0)

  function addToCart() {
    if (!productSearchId) return
    const product = products?.find((p) => p.id === productSearchId)
    if (!product) return
    if (cart.some((c) => c.product.id === product.id)) return
    setCart([...cart, { id: crypto.randomUUID(), product, quantity: 1 }])
    setProductSearchId('')
  }

  function updateCartQty(id: string, delta: number) {
    setCart(
      cart.map((c) =>
        c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c
      )
    )
  }

  function setCartQty(id: string, qty: number) {
    setCart(
      cart.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, qty) } : c))
    )
  }

  function removeFromCart(id: string) {
    setCart(cart.filter((c) => c.id !== id))
  }

  // Validation
  const canProceedToStep2 = selectedAction !== null && effectiveLocationId !== ''
  const canProceedToStep3 = cart.length > 0

  // Submit
  async function handleSubmit() {
    if (!selectedAction || !effectiveLocationId || cart.length === 0) return
    setSubmitting(true)

    try {
      if (selectedAction === 'in' && cart.length > 1) {
        // Batch entry
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
        // Single or sequential for non-in types
        for (const item of cart) {
          await registerSingle.mutateAsync({
            product_id: item.product.id,
            action: selectedAction,
            quantity: item.quantity,
            notes: notes || origin || '',
            location_id: effectiveLocationId,
          })
        }
      }
      setSuccess(true)
    } catch {
      // Error toasts handled by hooks
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setStep(1)
    setSelectedAction(null)
    setLocationId(userLocationId ?? '')
    setCart([])
    setProductSearchId('')
    setOrigin('')
    setNotes('')
    setSuccess(false)
  }

  // ── SUCCESS STATE ────────────────────────────────────────────────

  if (success) {
    return (
      <div className="animate-slide-up">
        <div
          className="rounded-2xl border p-8 sm:p-12 flex flex-col items-center text-center"
          style={{ background: DARK_BG, borderColor: 'hsl(142 50% 40% / 0.25)' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: 'hsl(142 50% 45% / 0.15)' }}
          >
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2
            className="text-2xl text-foreground mb-2"
            style={{ fontFamily: SERIF_FONT }}
          >
            Movimentacao Registrada!
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            {totalProducts} produto{totalProducts > 1 ? 's' : ''} | {totalUnits}{' '}
            unidade{totalUnits > 1 ? 's' : ''} |{' '}
            {MOVEMENT_TYPES.find((t) => t.action === selectedAction)?.label ?? ''}
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6">
            {selectedLocation?.name ?? 'Local'} — {formatDateShort(new Date().toISOString())}
          </p>
          <button
            onClick={resetForm}
            className="h-12 px-8 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`,
              color: 'hsl(240 25% 4%)',
              boxShadow: `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}`,
            }}
          >
            <RotateCcw size={16} />
            Nova Movimentacao
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 1: SETUP ────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="space-y-6 animate-slide-up">
        {/* Movement type cards */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: DARK_BG, borderColor: CARD_BORDER }}
        >
          <div className="p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <PackagePlus size={12} style={{ color: GOLD }} />
              Tipo de movimentacao
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOVEMENT_TYPES.map((t) => {
                const Icon = t.icon
                const isSelected = selectedAction === t.action
                return (
                  <button
                    key={t.action}
                    onClick={() => setSelectedAction(t.action)}
                    className="relative rounded-xl p-4 sm:p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: isSelected ? t.bgColor : CARD_BG_INNER,
                      border: `2px solid ${isSelected ? t.color : CARD_BORDER}`,
                      boxShadow: isSelected
                        ? `0 0 20px ${t.color}33, inset 0 1px 0 ${t.color}22`
                        : 'none',
                    }}
                  >
                    {isSelected && (
                      <div
                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: t.color }}
                      >
                        <CheckCircle2 size={12} color="white" />
                      </div>
                    )}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: `${t.color}1A` }}
                    >
                      <Icon size={20} style={{ color: t.color }} />
                    </div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: isSelected ? t.color : 'hsl(0 0% 90%)' }}
                    >
                      {t.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">
                      {t.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />

          {/* Location select */}
          <div className="p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <MapPin size={12} style={{ color: GOLD }} />
              Local
            </p>

            {!isManager && userLocationId ? (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${GOLD.replace(')', ' / 0.12)')}` }}
                >
                  <MapPin size={14} style={{ color: GOLD }} />
                </div>
                <div>
                  <span className="block text-sm font-medium text-foreground">
                    {locations?.find((l) => l.id === userLocationId)?.name ?? 'Sua loja'}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {locations?.find((l) => l.id === userLocationId)?.city}
                  </span>
                </div>
              </div>
            ) : (
              <Select value={locationId} onValueChange={(v) => { if (v) setLocationId(v) }}>
                <SelectTrigger
                  className="h-14 rounded-xl border-transparent transition-all hover:border-[hsl(42_60%_55%_/_0.2)]"
                  style={{
                    background: selectedLocation
                      ? `${GOLD.replace(')', ' / 0.06)')}`
                      : CARD_BG_INNER,
                    borderColor: selectedLocation
                      ? `${GOLD.replace(')', ' / 0.15)')}`
                      : 'transparent',
                  }}
                >
                  {selectedLocation ? (
                    <div className="flex items-center gap-2.5 text-left">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${GOLD.replace(')', ' / 0.12)')}` }}
                      >
                        <MapPin size={14} style={{ color: GOLD }} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-foreground truncate">
                          {selectedLocation.name}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {selectedLocation.city}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <SelectValue placeholder="Selecionar local" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} className="rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <MapPin size={13} className="text-muted-foreground shrink-0" />
                        <div className="text-left">
                          <span className="block text-sm">{loc.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {loc.city} - {loc.state}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={() => canProceedToStep2 && setStep(2)}
          disabled={!canProceedToStep2}
          className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: canProceedToStep2
              ? `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`
              : CARD_BG_INNER,
            color: canProceedToStep2 ? 'hsl(240 25% 4%)' : 'hsl(240 10% 30%)',
            boxShadow: canProceedToStep2
              ? `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}`
              : 'none',
            border: canProceedToStep2 ? 'none' : `1px solid ${CARD_BORDER}`,
          }}
        >
          Continuar
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  // ── STEP 2: ADD PRODUCTS ─────────────────────────────────────────

  if (step === 2) {
    const actionMeta = getActionMeta(selectedAction!)
    const productsNotInCart = products?.filter(
      (p) => !cart.some((c) => c.product.id === p.id)
    )

    return (
      <div className="space-y-5 animate-slide-up">
        {/* Back + context bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <Badge
              style={{
                background: actionMeta.bgColor,
                color: actionMeta.color,
                borderColor: actionMeta.borderColor,
              }}
              variant="outline"
              className="text-xs font-semibold"
            >
              {actionMeta.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {selectedLocation?.name ?? ''}
            </span>
          </div>
        </div>

        {/* Add products card */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: DARK_BG, borderColor: CARD_BORDER }}
        >
          <div className="p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <Package size={12} style={{ color: GOLD }} />
              Adicionar produtos
            </p>

            {/* Product selector */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={productSearchId}
                  onValueChange={(v) => { if (v) setProductSearchId(v) }}
                >
                  <SelectTrigger
                    className="h-14 rounded-xl border-transparent transition-all hover:border-[hsl(42_60%_55%_/_0.2)]"
                    style={{
                      background: CARD_BG_INNER,
                      borderColor: 'transparent',
                    }}
                  >
                    <SelectValue placeholder="Selecionar produto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border rounded-xl max-h-[300px]">
                    {productsNotInCart?.map((p) => {
                      const img = getProductImage(p.sku)
                      return (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          className="rounded-lg"
                        >
                          <div className="flex items-center gap-2.5">
                            {img ? (
                              <img
                                src={img}
                                alt={p.name}
                                className="w-7 h-7 rounded-md object-contain bg-secondary/50"
                              />
                            ) : (
                              <Package
                                size={14}
                                className="text-muted-foreground shrink-0"
                              />
                            )}
                            <div>
                              <span className="block text-sm">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {p.sku}
                              </span>
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
                style={{
                  background: productSearchId
                    ? `${GOLD.replace(')', ' / 0.15)')}`
                    : CARD_BG_INNER,
                  border: `1px solid ${productSearchId ? GOLD.replace(')', ' / 0.3)') : CARD_BORDER}`,
                }}
              >
                <Plus size={20} style={{ color: productSearchId ? GOLD : 'hsl(240 10% 30%)' }} />
              </button>
            </div>
          </div>

          {/* Cart items */}
          {cart.length > 0 && (
            <>
              <div
                className="mx-5 sm:mx-6 h-px"
                style={{ background: CARD_BORDER }}
              />
              <div className="p-5 sm:p-6 space-y-3">
                {cart.map((item) => {
                  const img = getProductImage(item.product.sku)
                  const stockHere =
                    effectiveLocationId
                      ? getMockStockForLocation(
                          item.product.id,
                          effectiveLocationId
                        )
                      : 0

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: CARD_BG_INNER,
                        border: `1px solid ${CARD_BORDER}`,
                      }}
                    >
                      {/* Product image */}
                      {img ? (
                        <img
                          src={img}
                          alt={item.product.name}
                          className="w-9 h-9 rounded-lg object-contain shrink-0"
                          style={{ background: 'hsl(240 15% 14%)' }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'hsl(240 15% 14%)' }}
                        >
                          <Package
                            size={16}
                            className="text-muted-foreground/50"
                          />
                        </div>
                      )}

                      {/* Product info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.product.sku}
                          {(selectedAction === 'out' || selectedAction === 'loss') && (
                            <span className="ml-2 text-muted-foreground/50">
                              Est: {stockHere}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quantity stepper */}
                      <div
                        className="flex items-center rounded-lg overflow-hidden shrink-0"
                        style={{
                          border: `1px solid ${CARD_BORDER}`,
                          background: DARK_BG,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          style={{
                            borderRight: `1px solid ${CARD_BORDER}`,
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            setCartQty(
                              item.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-12 h-9 bg-transparent text-center text-sm font-bold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          style={{
                            borderLeft: `1px solid ${CARD_BORDER}`,
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Empty state for cart */}
          {cart.length === 0 && (
            <div className="px-5 sm:px-6 pb-6">
              <div
                className="rounded-xl p-8 flex flex-col items-center text-center"
                style={{
                  border: `1px dashed ${CARD_BORDER}`,
                  background: 'hsl(240 20% 6%)',
                }}
              >
                <Package
                  size={24}
                  className="text-muted-foreground/30 mb-2"
                />
                <p className="text-xs text-muted-foreground/50">
                  Selecione produtos acima para adicionar
                </p>
              </div>
            </div>
          )}

          {/* Origin/notes section */}
          {cart.length > 0 && (
            <>
              <div
                className="mx-5 sm:mx-6 h-px"
                style={{ background: CARD_BORDER }}
              />
              <div className="p-5 sm:p-6 space-y-4">
                {/* Origin field */}
                {(selectedAction === 'in' || selectedAction === 'out') && (
                  <div className="space-y-2">
                    <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                      {selectedAction === 'in' ? 'Origem / Fornecedor' : 'Destino / Cliente'}
                    </span>
                    <Input
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder={
                        selectedAction === 'in'
                          ? 'Ex: Lamas Destilaria — lote 0309'
                          : 'Ex: Pedido delivery — +55 21 99301-4477'
                      }
                      className="h-12 rounded-xl border-transparent hover:border-[hsl(240_15%_18%)] transition-colors"
                      style={{
                        background: CARD_BG_INNER,
                        borderColor: CARD_BORDER,
                      }}
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                    Observacoes{' '}
                    <span className="normal-case tracking-normal opacity-50">
                      (opcional)
                    </span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes adicionais sobre esta movimentacao..."
                    rows={2}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-transparent border resize-none focus:outline-none focus:ring-1 transition-colors text-foreground placeholder:text-muted-foreground/40"
                    style={{
                      background: CARD_BG_INNER,
                      borderColor: CARD_BORDER,
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Summary bar */}
          {cart.length > 0 && (
            <>
              <div
                className="mx-5 sm:mx-6 h-px"
                style={{ background: CARD_BORDER }}
              />
              <div className="p-5 sm:p-6">
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
                  style={{
                    background: `${GOLD.replace(')', ' / 0.06)')}`,
                    border: `1px solid ${GOLD.replace(')', ' / 0.15)')}`,
                  }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{ color: GOLD }}
                  >
                    {totalProducts} produto{totalProducts > 1 ? 's' : ''} |{' '}
                    {totalUnits} unidade{totalUnits > 1 ? 's' : ''} total
                  </span>
                  <Badge
                    style={{
                      background: actionMeta.bgColor,
                      color: actionMeta.color,
                      borderColor: actionMeta.borderColor,
                    }}
                    variant="outline"
                    className="text-xs font-semibold"
                  >
                    {actionMeta.label}
                  </Badge>
                </div>

                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3}
                  className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{
                    background: canProceedToStep3
                      ? `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`
                      : CARD_BG_INNER,
                    color: canProceedToStep3
                      ? 'hsl(240 25% 4%)'
                      : 'hsl(240 10% 30%)',
                    boxShadow: canProceedToStep3
                      ? `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}`
                      : 'none',
                    border: canProceedToStep3
                      ? 'none'
                      : `1px solid ${CARD_BORDER}`,
                  }}
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

  // ── STEP 3: CONFIRMATION ─────────────────────────────────────────

  if (step === 3) {
    const actionMeta = getActionMeta(selectedAction!)

    return (
      <div className="space-y-5 animate-slide-up">
        {/* Back */}
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={14} className="rotate-180" />
          Voltar para edicao
        </button>

        {/* Review card */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: DARK_BG, borderColor: CARD_BORDER }}
        >
          <div className="p-5 sm:p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <FileText size={12} style={{ color: GOLD }} />
              Resumo da movimentacao
            </p>

            {/* Type + Location summary */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div
                className="rounded-xl p-4"
                style={{
                  background: actionMeta.bgColor,
                  border: `1px solid ${actionMeta.borderColor}`,
                }}
              >
                <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">
                  Tipo
                </p>
                <p
                  className="text-lg font-bold mt-1"
                  style={{ color: actionMeta.color }}
                >
                  {actionMeta.label}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  background: `${GOLD.replace(')', ' / 0.06)')}`,
                  border: `1px solid ${GOLD.replace(')', ' / 0.15)')}`,
                }}
              >
                <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">
                  Local
                </p>
                <p
                  className="text-lg font-bold mt-1 truncate"
                  style={{ color: GOLD }}
                >
                  {selectedLocation?.name ?? '—'}
                </p>
              </div>
            </div>

            {/* Products list */}
            <div className="space-y-2">
              {cart.map((item) => {
                const img = getProductImage(item.product.sku)
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: CARD_BG_INNER,
                      border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={item.product.name}
                        className="w-9 h-9 rounded-lg object-contain shrink-0"
                        style={{ background: 'hsl(240 15% 14%)' }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'hsl(240 15% 14%)' }}
                      >
                        <Package
                          size={16}
                          className="text-muted-foreground/50"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {item.product.sku}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {item.quantity}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50">
                        un.
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Notes */}
            {(origin || notes) && (
              <div
                className="mt-4 px-4 py-3 rounded-xl"
                style={{
                  background: CARD_BG_INNER,
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                {origin && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/70">
                      {selectedAction === 'in' ? 'Origem:' : 'Destino:'}
                    </span>{' '}
                    {origin}
                  </p>
                )}
                {notes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground/70">
                      Obs:
                    </span>{' '}
                    {notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Total bar */}
          <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
          <div
            className="p-5 sm:p-6 flex items-center justify-between"
            style={{
              background: `${GOLD.replace(')', ' / 0.04)')}`,
            }}
          >
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: GOLD }}
              >
                {totalProducts} produto{totalProducts > 1 ? 's' : ''} | {totalUnits} un.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mx-5 sm:mx-6 h-px" style={{ background: CARD_BORDER }} />
          <div className="p-5 sm:p-6 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 h-14 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-[hsl(240_15%_13%)]"
              style={{
                background: CARD_BG_INNER,
                border: `1px solid ${CARD_BORDER}`,
                color: 'hsl(0 0% 70%)',
              }}
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`,
                color: 'hsl(240 25% 4%)',
                boxShadow: `0 4px 24px ${GOLD.replace(')', ' / 0.3)')}`,
              }}
            >
              <Send size={16} />
              {submitting ? 'Registrando...' : 'Confirmar Movimentacao'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: HISTORICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type SortField = 'date' | 'type' | 'qty' | 'location'
type SortDir = 'asc' | 'desc'

function HistoryTab() {
  const { data: locations } = useLocations()
  useProducts() // keep query active for cache

  // Filter state
  const [filterLocation, setFilterLocation] = useState<string>('__all__')
  const [filterAction, setFilterAction] = useState<string>('__all__')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo, setFilterTo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState(0)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Display labels for filters
  const locationLabel = filterLocation === '__all__'
    ? 'Todas as lojas'
    : locations?.find((l) => l.id === filterLocation)?.name ?? 'Todas as lojas'

  const actionLabelMap: Record<string, string> = {
    '__all__': 'Todos os tipos',
    'in': 'Entrada',
    'out': 'Saida',
    'adjustment': 'Ajuste',
    'loss': 'Perda',
    'transfer': 'Transferencia',
  }
  const actionLabel = actionLabelMap[filterAction] ?? 'Todos os tipos'

  // Query movements
  const queryFilters = useMemo(
    () => ({
      action:
        filterAction !== '__all__'
          ? (filterAction as MovementAction)
          : undefined,
      from: filterFrom ? new Date(filterFrom).toISOString() : undefined,
      to: filterTo
        ? new Date(filterTo + 'T23:59:59').toISOString()
        : undefined,
      limit: 200,
      offset: 0,
    }),
    [filterAction, filterFrom, filterTo]
  )

  const { data: movementsResult, isLoading } = useAllMovements(queryFilters)
  const allMovements = movementsResult?.data ?? []

  // Client-side filtering for location + search
  const filteredMovements = useMemo(() => {
    let result = allMovements

    if (filterLocation !== '__all__') {
      result = result.filter((m) => m.location_id === filterLocation)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          (m.notes ?? '').toLowerCase().includes(q) ||
          (m.product?.name ?? '').toLowerCase().includes(q) ||
          (m.product?.sku ?? '').toLowerCase().includes(q)
      )
    }

    return result
  }, [allMovements, filterLocation, searchQuery])

  // Group & sort
  const groups = useMemo(() => {
    const grouped = groupMovements(filteredMovements)

    // Sort
    grouped.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          break
        case 'type':
          cmp = a.action.localeCompare(b.action)
          break
        case 'qty':
          cmp = a.totalQty - b.totalQty
          break
        case 'location': {
          const aLoc =
            locations?.find((l) => l.id === a.location_id)?.name ?? ''
          const bLoc =
            locations?.find((l) => l.id === b.location_id)?.name ?? ''
          cmp = aLoc.localeCompare(bLoc)
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return grouped
  }, [filteredMovements, sortField, sortDir, locations])

  // Pagination
  const totalGroups = groups.length
  const pagedGroups = groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(totalGroups / PAGE_SIZE)
  const showingFrom = totalGroups === 0 ? 0 : page * PAGE_SIZE + 1
  const showingTo = Math.min((page + 1) * PAGE_SIZE, totalGroups)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function clearFilters() {
    setFilterLocation('__all__')
    setFilterAction('__all__')
    setFilterFrom('')
    setFilterTo('')
    setSearchQuery('')
    setPage(0)
  }

  const hasFilters =
    filterLocation !== '__all__' ||
    filterAction !== '__all__' ||
    filterFrom !== '' ||
    filterTo !== '' ||
    searchQuery !== ''

  // CSV Export
  function exportCSV() {
    const rows: string[][] = [
      ['Data', 'Tipo', 'Produto', 'SKU', 'Quantidade', 'Local', 'Usuario', 'Observacoes'],
    ]

    for (const g of groups) {
      for (const mv of g.movements) {
        const meta = getActionMeta(mv.action)
        const loc = locations?.find((l) => l.id === mv.location_id)
        rows.push([
          formatDatePtBR(mv.created_at),
          meta.label,
          mv.product?.name ?? mv.product_id,
          mv.product?.sku ?? '',
          String(Math.abs(mv.quantity)),
          loc?.name ?? '',
          mv.profile?.full_name ?? '',
          (mv.notes ?? '').replace(/"/g, '""'),
        ])
      }
    }

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Sort icon helper (inline JSX — not a component, avoids re-mount)
  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-muted-foreground/30" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} style={{ color: GOLD }} />
    ) : (
      <ChevronDown size={12} style={{ color: GOLD }} />
    )
  }

  return (
    <div className="animate-slide-up">
      {/* ── FILTERS ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden mb-4"
        style={{ background: DARK_BG, borderColor: CARD_BORDER }}
      >
        <div className="p-4 sm:p-5">
          {/* Filter header */}
          <div className="flex items-center gap-2 mb-4">
            <Filter size={13} style={{ color: GOLD }} />
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">
              Filtros
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X size={10} />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Filter row: 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Location filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                Loja
              </label>
              <Select
                value={filterLocation}
                onValueChange={(v) => {
                  if (v) { setFilterLocation(v); setPage(0) }
                }}
              >
                <SelectTrigger
                  className="h-10 rounded-lg text-xs"
                  style={{
                    background: CARD_BG_INNER,
                    borderColor: CARD_BORDER,
                  }}
                >
                  <span className="truncate text-foreground/80">{locationLabel}</span>
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="__all__">Todas as lojas</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                Tipo
              </label>
              <Select
                value={filterAction}
                onValueChange={(v) => {
                  if (v) { setFilterAction(v); setPage(0) }
                }}
              >
                <SelectTrigger
                  className="h-10 rounded-lg text-xs"
                  style={{
                    background: CARD_BG_INNER,
                    borderColor: CARD_BORDER,
                  }}
                >
                  <span className="truncate text-foreground/80">{actionLabel}</span>
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  <SelectItem value="in">Entrada</SelectItem>
                  <SelectItem value="out">Saida</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="loss">Perda</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                De
              </label>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => {
                  setFilterFrom(e.target.value)
                  setPage(0)
                }}
                className="h-10 rounded-lg text-xs"
                style={{
                  background: CARD_BG_INNER,
                  borderColor: CARD_BORDER,
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">
                Ate
              </label>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => {
                  setFilterTo(e.target.value)
                  setPage(0)
                }}
                className="h-10 rounded-lg text-xs"
                style={{
                  background: CARD_BG_INNER,
                  borderColor: CARD_BORDER,
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          {/* Search + export row */}
          <div className="flex gap-3 mt-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              />
              <Input
                type="text"
                placeholder="Buscar por produto, notas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="h-10 rounded-lg text-xs pl-9"
                style={{
                  background: CARD_BG_INNER,
                  borderColor: CARD_BORDER,
                }}
              />
            </div>
            <button
              onClick={exportCSV}
              className="h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all hover:bg-[hsl(42_60%_55%_/_0.1)] shrink-0"
              style={{
                border: `1px solid ${GOLD.replace(')', ' / 0.3)')}`,
                color: GOLD,
              }}
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── MOVEMENTS TABLE ────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: DARK_BG, borderColor: CARD_BORDER }}
      >
        {/* Table header */}
        <div
          className="hidden sm:grid grid-cols-[140px_100px_1fr_140px_80px_100px_44px] gap-2 px-5 py-3 text-[10px] tracking-[0.12em] uppercase font-semibold text-muted-foreground/60"
          style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
        >
          <button
            onClick={() => toggleSort('date')}
            className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
          >
            Data {sortIcon('date')}
          </button>
          <button
            onClick={() => toggleSort('type')}
            className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
          >
            Tipo {sortIcon('type')}
          </button>
          <div>Produto(s)</div>
          <button
            onClick={() => toggleSort('location')}
            className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
          >
            Local {sortIcon('location')}
          </button>
          <button
            onClick={() => toggleSort('qty')}
            className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
          >
            Qtd {sortIcon('qty')}
          </button>
          <div>Usuario</div>
          <div />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground/50">
              <Clock size={16} className="animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          </div>
        ) : pagedGroups.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <Package size={28} className="text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Nenhuma movimentacao encontrada
            </p>
            {hasFilters && (
              <p className="text-xs text-muted-foreground/40 mt-1">
                Tente ajustar os filtros
              </p>
            )}
          </div>
        ) : (
          pagedGroups.map((group, idx) => {
            const meta = getActionMeta(group.action)
            const loc = locations?.find((l) => l.id === group.location_id)
            const isExpanded = expandedKeys.has(group.key)
            const hasMultiple = group.movements.length > 1
            const productSummary = hasMultiple
              ? `${group.movements.length} produtos`
              : group.movements[0]?.product?.name ?? group.movements[0]?.product_id ?? '—'

            return (
              <div key={group.key}>
                {/* Main row */}
                <button
                  onClick={() => toggleExpand(group.key)}
                  className="w-full text-left transition-colors hover:bg-[hsl(240_15%_9%)]"
                  style={{
                    borderTop:
                      idx > 0 ? `1px solid ${CARD_BORDER}` : undefined,
                  }}
                >
                  {/* Desktop row — NO product images */}
                  <div className="hidden sm:grid grid-cols-[140px_100px_1fr_140px_80px_100px_44px] gap-2 items-center px-5 py-3.5">
                    {/* Date */}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDateShort(group.created_at)}
                    </span>

                    {/* Type badge */}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold w-fit"
                      style={{
                        background: meta.bgColor,
                        color: meta.color,
                        borderColor: meta.borderColor,
                      }}
                    >
                      {meta.label}
                    </Badge>

                    {/* Products — text only, no images */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-foreground truncate">
                        {productSummary}
                      </span>
                      {hasMultiple && (
                        <Badge
                          variant="outline"
                          className="text-[9px] shrink-0 px-1.5"
                          style={{
                            background: `${GOLD.replace(')', ' / 0.08)')}`,
                            color: GOLD,
                            borderColor: `${GOLD.replace(')', ' / 0.2)')}`,
                          }}
                        >
                          {group.movements.length}
                        </Badge>
                      )}
                    </div>

                    {/* Location */}
                    <span className="text-xs text-muted-foreground truncate">
                      {loc?.name ?? '—'}
                    </span>

                    {/* Quantity */}
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {group.totalQty}
                    </span>

                    {/* User */}
                    <span className="text-xs text-muted-foreground truncate">
                      {group.user}
                    </span>

                    {/* Expand chevron */}
                    <div className="flex items-center justify-center">
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Mobile row — NO product images */}
                  <div className="sm:hidden px-4 py-3.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {productSummary}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-semibold shrink-0"
                          style={{
                            background: meta.bgColor,
                            color: meta.color,
                            borderColor: meta.borderColor,
                          }}
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                          {formatDateShort(group.created_at)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">
                          {loc?.name ?? ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-foreground">
                        {group.totalQty}
                      </p>
                      <p className="text-[10px] text-muted-foreground/40">
                        un.
                      </p>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-muted-foreground/40 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {/* Expanded detail — product images shown HERE only */}
                {isExpanded && (
                  <div
                    className="animate-slide-up"
                    style={{
                      background: 'hsl(240 18% 8%)',
                      borderTop: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    {group.movements.map((mv, mi) => {
                      const mvImg = mv.product?.sku
                        ? getProductImage(mv.product.sku)
                        : undefined
                      return (
                        <div
                          key={mv.id}
                          className="flex items-center gap-3 px-5 sm:px-8 py-3"
                          style={{
                            borderTop:
                              mi > 0
                                ? `1px solid hsl(240 15% 10%)`
                                : undefined,
                          }}
                        >
                          {mvImg ? (
                            <img
                              src={mvImg}
                              alt={mv.product?.name ?? ''}
                              className="w-8 h-8 rounded-md object-contain shrink-0"
                              style={{ background: 'hsl(240 15% 12%)' }}
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: 'hsl(240 15% 12%)' }}
                            >
                              <Package
                                size={12}
                                className="text-muted-foreground/40"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground/90 truncate">
                              {mv.product?.name ?? mv.product_id}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 font-mono">
                              {mv.product?.sku ?? ''}
                            </p>
                          </div>
                          <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
                            {Math.abs(mv.quantity)} un.
                          </span>
                        </div>
                      )
                    })}
                    {/* Full notes */}
                    {group.notes && (
                      <div
                        className="px-5 sm:px-8 py-3"
                        style={{
                          borderTop: `1px solid hsl(240 15% 10%)`,
                        }}
                      >
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-1">
                          Observacoes
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {group.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Pagination */}
        {totalGroups > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderTop: `1px solid ${CARD_BORDER}` }}
          >
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              Mostrando {showingFrom}-{showingTo} de {totalGroups}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="h-8 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-25"
                style={{
                  background: CARD_BG_INNER,
                  border: `1px solid ${CARD_BORDER}`,
                  color: 'hsl(0 0% 70%)',
                }}
              >
                Anterior
              </button>
              <span className="text-xs text-muted-foreground/50 tabular-nums px-2">
                {page + 1}/{totalPages}
              </span>
              <button
                onClick={() =>
                  setPage(Math.min(totalPages - 1, page + 1))
                }
                disabled={page >= totalPages - 1}
                className="h-8 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-25"
                style={{
                  background: CARD_BG_INNER,
                  border: `1px solid ${CARD_BORDER}`,
                  color: 'hsl(0 0% 70%)',
                }}
              >
                Proximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
