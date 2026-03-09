import { useState, useMemo, useCallback } from 'react'
import { useProducts } from '@/hooks/useProducts'
import {
  useDeliveryOrders,
  useCreateOrder,
  useUpdateOrderStatus,
} from '@/hooks/useDeliveryOrders'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Package,
  MapPin,
  User,
  RotateCcw,
  Phone,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  ShoppingBag,
  Truck,
  Calendar,
} from 'lucide-react'
import type { OrderItem, DeliveryOrder, Product, ProductCategory } from '@/types'
import type { CreateOrderInput } from '@/hooks/useDeliveryOrders'

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Date filters ─────────────────────────────────────────────────────────────

type DateFilter = 'today' | 'week' | 'all'

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return d >= startOfWeek
}

// ─── Category styles ──────────────────────────────────────────────────────────

const categoryStyles: Record<ProductCategory, { label: string; className: string }> = {
  honey: { label: 'Mel', className: 'bg-amber-950/50 text-amber-400 border-amber-800/30' },
  cappuccino: { label: 'Cappuccino', className: 'bg-orange-950/50 text-orange-400 border-orange-800/30' },
  blended: { label: 'Blended', className: 'bg-purple-950/50 text-purple-400 border-purple-800/30' },
  acessorio: { label: 'Acessório', className: 'bg-slate-800/60 text-slate-400 border-slate-700/30' },
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendente', className: 'bg-amber-950/50 text-amber-400 border-amber-800/30' },
    confirmed: { label: 'Confirmado', className: 'bg-[hsl(42_60%_55%/0.12)] text-[hsl(42_60%_55%)] border-[hsl(42_60%_55%/0.25)]' },
    delivered: { label: 'Entregue', className: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/30' },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-secondary text-muted-foreground border-border' }
  return (
    <span className={`text-[10px] border rounded-full px-2 py-0.5 font-semibold tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ─── KPI pill ────────────────────────────────────────────────────────────────

interface KpiPillProps {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}

function KpiPill({ icon, label, value, highlight }: KpiPillProps) {
  return (
    <div
      className={`flex items-center gap-2.5 shrink-0 rounded-xl px-4 py-2.5 border ${
        highlight
          ? 'bg-[hsl(42_60%_55%/0.08)] border-[hsl(42_60%_55%/0.2)]'
          : 'bg-card border-border'
      }`}
    >
      <span className={highlight ? 'text-[hsl(42_60%_55%)]' : 'text-muted-foreground'}>
        {icon}
      </span>
      <div>
        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className={`text-sm font-bold tabular-nums ${highlight ? 'text-[hsl(42_60%_55%)]' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Stepper progress bar ────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
              s < step
                ? 'bg-[hsl(42_60%_55%)] border-[hsl(42_60%_55%)] text-[hsl(240_25%_4%)]'
                : s === step
                ? 'border-[hsl(42_60%_55%)] text-[hsl(42_60%_55%)] bg-transparent'
                : 'border-border text-muted-foreground bg-transparent'
            }`}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 3 && (
            <div
              className="h-0.5 w-8 rounded-full transition-all duration-300"
              style={{
                backgroundColor: s < step ? 'hsl(42 60% 55%)' : 'hsl(var(--border))',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Pending item type ────────────────────────────────────────────────────────

interface PendingItem extends OrderItem {
  tempId: string
}

// ─── Step 1: Recipient ────────────────────────────────────────────────────────

interface Step1Props {
  reference: string
  address: string
  notes: string
  onChange: (field: 'reference' | 'address' | 'notes', value: string) => void
  onNext: () => void
}

function Step1Recipient({ reference, address, notes, onChange, onNext }: Step1Props) {
  const canProceed = address.trim().length > 3

  return (
    <div
      className="space-y-6"
      style={{ animation: 'slideIn 0.22s ease-out' }}
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1">
          Passo 1 de 3
        </p>
        <h2
          className="text-2xl text-foreground"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Destinatário
        </h2>
      </div>

      {/* Reference / WhatsApp */}
      <div className="space-y-1.5">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3 h-3" />
          WhatsApp / Referência
        </Label>
        <Input
          placeholder="+55 21 99999-0000"
          className="h-12 bg-card border-border text-sm"
          value={reference}
          onChange={(e) => onChange('reference', e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          Endereço de Entrega
          <span className="text-red-400 normal-case tracking-normal font-bold">*</span>
        </Label>
        <textarea
          rows={3}
          placeholder="Nome completo + endereço completo. Usado como prova de entrega."
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(42_60%_55%/0.4)] focus:border-[hsl(42_60%_55%/0.5)] transition-all"
          value={address}
          onChange={(e) => onChange('address', e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Nome completo + endereço. Prova de entrega.
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground">
          Observações
          <span className="ml-1.5 normal-case tracking-normal font-normal text-muted-foreground/60">(opcional)</span>
        </Label>
        <Input
          placeholder="Ex: deixar na portaria, ligar antes..."
          className="h-12 bg-card border-border text-sm"
          value={notes}
          onChange={(e) => onChange('notes', e.target.value)}
        />
      </div>

      <button
        disabled={!canProceed}
        onClick={onNext}
        className="w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canProceed ? 'hsl(42 60% 55%)' : undefined,
          color: canProceed ? 'hsl(240 25% 4%)' : undefined,
          border: canProceed ? 'none' : '1px solid hsl(var(--border))',
        }}
      >
        Próximo
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Step 2: Products ─────────────────────────────────────────────────────────

interface Step2Props {
  products: Product[]
  items: PendingItem[]
  onUpdateQty: (productId: string, delta: number) => void
  onNext: () => void
  onBack: () => void
}

function Step2Products({ products, items, onUpdateQty, onNext, onBack }: Step2Props) {
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const canProceed = items.length > 0

  function getQty(productId: string) {
    return items.find((i) => i.product_id === productId)?.quantity ?? 0
  }

  return (
    <div
      className="space-y-5 pb-28"
      style={{ animation: 'slideIn 0.22s ease-out' }}
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1">
          Passo 2 de 3
        </p>
        <h2
          className="text-2xl text-foreground"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Produtos
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => {
          const qty = getQty(product.id)
          const selected = qty > 0
          const outOfStock = product.current_stock === 0
          const catStyle = categoryStyles[product.category] ?? categoryStyles.acessorio

          return (
            <div
              key={product.id}
              className={`relative rounded-2xl border p-3 transition-all duration-200 ${
                outOfStock
                  ? 'opacity-50 cursor-not-allowed border-border bg-card'
                  : selected
                  ? 'border-[hsl(42_60%_55%/0.6)] bg-[hsl(42_60%_55%/0.05)] shadow-[0_0_0_1px_hsl(42_60%_55%/0.2)]'
                  : 'border-border bg-card hover:border-[hsl(42_60%_55%/0.3)] cursor-pointer'
              }`}
            >
              {/* Qty badge */}
              {selected && (
                <div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{
                    backgroundColor: 'hsl(42 60% 55%)',
                    color: 'hsl(240 25% 4%)',
                  }}
                >
                  {qty}
                </div>
              )}

              <div className="space-y-2">
                {/* Category chip */}
                <span className={`text-[9px] font-semibold tracking-wider uppercase border rounded-full px-1.5 py-0.5 ${catStyle.className}`}>
                  {catStyle.label}
                </span>

                {/* Name */}
                <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                  {product.name}
                </p>

                {/* Stock + price */}
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] ${outOfStock ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {outOfStock ? 'Sem estoque' : `${product.current_stock} em estoque`}
                  </p>
                </div>
                <p className="text-sm font-black tabular-nums text-[hsl(42_60%_55%)]">
                  {fmt(product.price_sale)}
                </p>

                {/* Stepper (shown when selected or on tap) */}
                {!outOfStock && (
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, -1)}
                      disabled={qty === 0}
                      className="w-8 h-8 rounded-lg border border-border bg-secondary text-foreground font-bold text-base flex items-center justify-center hover:bg-muted transition-all disabled:opacity-30"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center text-sm font-black tabular-nums text-foreground">
                      {qty === 0 ? (
                        <span className="text-[11px] text-muted-foreground font-normal">add</span>
                      ) : (
                        qty
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, 1)}
                      className="w-8 h-8 rounded-lg border border-[hsl(42_60%_55%/0.4)] bg-[hsl(42_60%_55%/0.08)] text-[hsl(42_60%_55%)] font-bold text-base flex items-center justify-center hover:bg-[hsl(42_60%_55%/0.15)] transition-all"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky cart footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4"
        style={{
          background: 'linear-gradient(to top, hsl(240 25% 4%) 70%, transparent)',
        }}
      >
        <div className="w-full space-y-3">
          {canProceed && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm"
              style={{
                backgroundColor: 'hsl(42 60% 55% / 0.1)',
                borderColor: 'hsl(42 60% 55% / 0.25)',
              }}
            >
              <span className="text-muted-foreground">
                {totalItems} produto{totalItems !== 1 ? 's' : ''}
              </span>
              <span className="font-black tabular-nums text-[hsl(42_60%_55%)]">
                {fmt(totalValue)}
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="h-14 w-14 shrink-0 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
            >
              ←
            </button>
            <button
              disabled={!canProceed}
              onClick={onNext}
              className="flex-1 h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{
                backgroundColor: canProceed ? 'hsl(42 60% 55%)' : 'hsl(var(--secondary))',
                color: canProceed ? 'hsl(240 25% 4%)' : 'hsl(var(--muted-foreground))',
                border: canProceed ? 'none' : '1px solid hsl(var(--border))',
              }}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────

interface Step3Props {
  reference: string
  address: string
  notes: string
  items: PendingItem[]
  isPending: boolean
  onBack: () => void
  onConfirm: () => void
}

function Step3Confirm({ reference, address, notes, items, isPending, onBack, onConfirm }: Step3Props) {
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div
      className="space-y-6"
      style={{ animation: 'slideIn 0.22s ease-out' }}
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-1">
          Passo 3 de 3
        </p>
        <h2
          className="text-2xl text-foreground"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Confirmar
        </h2>
      </div>

      {/* Summary card */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{
          backgroundColor: 'hsl(240 25% 7%)',
          borderColor: 'hsl(42 60% 55% / 0.2)',
          boxShadow: '0 0 0 1px hsl(42 60% 55% / 0.08), inset 0 1px 0 hsl(42 60% 55% / 0.05)',
        }}
      >
        {/* Recipient info */}
        <div className="space-y-2">
          {reference && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-foreground">{reference}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-[hsl(42_60%_55%)] shrink-0 mt-0.5" />
              <span className="text-foreground leading-snug">{address}</span>
            </div>
          )}
          {notes && (
            <p className="text-xs text-muted-foreground pl-5">{notes}</p>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Items */}
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.tempId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground tabular-nums shrink-0">{item.quantity}×</span>
                <span className="text-foreground truncate">{item.product_name}</span>
              </div>
              <span className="font-bold tabular-nums text-foreground ml-3 shrink-0">
                {fmt(item.quantity * item.unit_price)}
              </span>
            </div>
          ))}
        </div>

        <div
          className="h-px"
          style={{ backgroundColor: 'hsl(42 60% 55% / 0.2)' }}
        />

        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total do pedido</p>
            <p className="text-xs text-muted-foreground">{totalUnits} unidade{totalUnits !== 1 ? 's' : ''}</p>
          </div>
          <span
            className="text-3xl font-black tabular-nums"
            style={{ color: 'hsl(42 60% 55%)' }}
          >
            {fmt(totalValue)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-14 w-14 shrink-0 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
        >
          ←
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{
            backgroundColor: 'hsl(42 60% 55%)',
            color: 'hsl(240 25% 4%)',
          }}
        >
          {isPending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Pedido
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────

interface SuccessProps {
  onNewOrder: () => void
  onBackToList: () => void
}

function SuccessScreen({ onNewOrder, onBackToList }: SuccessProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-8 py-16 text-center"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      {/* Checkmark */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'hsl(42 60% 55% / 0.1)',
          border: '2px solid hsl(42 60% 55% / 0.3)',
          animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <CheckCircle2
          className="w-12 h-12"
          style={{ color: 'hsl(42 60% 55%)' }}
        />
      </div>

      <div className="space-y-2">
        <h2
          className="text-3xl text-foreground"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Pedido confirmado!
        </h2>
        <p className="text-sm text-muted-foreground">
          Estoque atualizado e pedido registrado com sucesso.
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={onNewOrder}
          className="w-full h-14 rounded-xl font-bold text-sm tracking-wide transition-all"
          style={{
            backgroundColor: 'hsl(42 60% 55%)',
            color: 'hsl(240 25% 4%)',
          }}
        >
          + Novo Pedido
        </button>
        <button
          onClick={onBackToList}
          className="w-full h-12 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
        >
          Voltar para lista
        </button>
      </div>
    </div>
  )
}

// ─── New Order Wizard ─────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 'success'

interface NewOrderWizardProps {
  prefillItems?: PendingItem[]
  onDone: () => void
  onSuccessNewOrder: () => void
}

function NewOrderWizard({ prefillItems, onDone, onSuccessNewOrder }: NewOrderWizardProps) {
  const { data: products = [] } = useProducts()
  const createOrder = useCreateOrder()

  const [step, setStep] = useState<WizardStep>(1)
  const [reference, setReference] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PendingItem[]>(prefillItems ?? [])

  const handleField = useCallback(
    (field: 'reference' | 'address' | 'notes', value: string) => {
      if (field === 'reference') setReference(value)
      else if (field === 'address') setAddress(value)
      else setNotes(value)
    },
    []
  )

  const handleUpdateQty = useCallback(
    (productId: string, delta: number) => {
      const product = products.find((p) => p.id === productId)
      if (!product) return

      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === productId)
        if (!existing) {
          if (delta <= 0) return prev
          return [
            ...prev,
            {
              tempId: crypto.randomUUID(),
              product_id: product.id,
              product_name: product.name,
              quantity: delta,
              unit_price: product.price_sale,
            },
          ]
        }
        const newQty = existing.quantity + delta
        if (newQty <= 0) return prev.filter((i) => i.product_id !== productId)
        return prev.map((i) =>
          i.product_id === productId ? { ...i, quantity: newQty } : i
        )
      })
    },
    [products]
  )

  const goToStep = (s: WizardStep) => {
    setStep(s)
    window.scrollTo(0, 0)
  }

  const handleConfirm = async () => {
    const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    await createOrder.mutateAsync({
      items: items.map(({ tempId: _t, ...item }) => item),
      reference: reference || null,
      notes: notes || null,
      address: address || null,
      total_value: totalValue,
    } as unknown as CreateOrderInput)
    goToStep('success')
  }

  const currentStepNum: 1 | 2 | 3 = step === 'success' ? 3 : (step as 1 | 2 | 3)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(240 25% 4%)' }}>
      <div className="w-full p-4 space-y-6">
        {/* Top nav */}
        {step !== 'success' && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={step === 1 ? onDone : () => goToStep((step as number - 1) as WizardStep)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              ← {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>
            <StepBar step={currentStepNum} />
          </div>
        )}

        {/* Step content */}
        {step === 1 && (
          <Step1Recipient
            reference={reference}
            address={address}
            notes={notes}
            onChange={handleField}
            onNext={() => goToStep(2)}
          />
        )}

        {step === 2 && (
          <Step2Products
            products={products}
            items={items}
            onUpdateQty={handleUpdateQty}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}

        {step === 3 && (
          <Step3Confirm
            reference={reference}
            address={address}
            notes={notes}
            items={items}
            isPending={createOrder.isPending}
            onBack={() => goToStep(2)}
            onConfirm={handleConfirm}
          />
        )}

        {step === 'success' && (
          <SuccessScreen
            onNewOrder={onSuccessNewOrder}
            onBackToList={onDone}
          />
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: DeliveryOrder
  onMarkDelivered?: () => void
  onReorder?: () => void
}

function OrderCard({ order, onMarkDelivered, onReorder }: OrderCardProps) {
  const items = order.items as OrderItem[]
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalValue =
    order.total_value ?? items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0)
  const operator = (order.profile as { full_name?: string } | undefined)?.full_name ?? '—'

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200 hover:border-[hsl(42_60%_55%/0.25)]"
      style={{
        backgroundColor: 'hsl(240 25% 7%)',
        borderColor:
          order.status === 'delivered'
            ? 'hsl(152 60% 30% / 0.25)'
            : 'hsl(var(--border))',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Top row: reference + status + time */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm text-foreground font-semibold truncate">
              {order.reference ?? order.id.slice(0, 8)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {timeAgo(order.created_at)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Value row */}
        <div className="flex items-center justify-between">
          <span
            className="text-2xl font-black tabular-nums"
            style={{ color: 'hsl(42 60% 55%)' }}
          >
            {fmt(totalValue)}
          </span>
          <span className="text-xs bg-secondary text-muted-foreground border border-border rounded-full px-2.5 py-0.5 tabular-nums font-medium">
            {totalItems} un
          </span>
        </div>

        {/* Address */}
        {order.address && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-[hsl(42_60%_55%/0.6)]" />
            <span className="truncate leading-relaxed" title={order.address}>
              {order.address}
            </span>
          </div>
        )}

        {/* Items preview chips */}
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="text-[10px] font-medium rounded-full px-2 py-0.5 border"
              style={{
                backgroundColor: 'hsl(240 25% 10%)',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              {item.product_name.split(' ').slice(0, 2).join(' ')} ×{item.quantity}
            </span>
          ))}
        </div>

        {/* Operator row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="w-3 h-3 shrink-0" />
          <span>{operator}</span>
          <span className="text-border">·</span>
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{formatDate(order.created_at)}</span>
        </div>

        {/* Delivered row */}
        {order.status === 'delivered' && order.delivered_by && (
          <div
            className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
            style={{
              backgroundColor: 'hsl(152 60% 10% / 0.5)',
              color: 'hsl(152 60% 55%)',
            }}
          >
            <Truck className="w-3 h-3 shrink-0" />
            <span>Entregue por {order.delivered_by}</span>
            {order.delivered_at && (
              <>
                <span style={{ color: 'hsl(152 60% 30%)' }}>·</span>
                <span>{formatDate(order.delivered_at)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      {(onMarkDelivered || onReorder) && (
        <div className="border-t border-border px-4 py-3">
          {onMarkDelivered && (
            <button
              onClick={onMarkDelivered}
              className="w-full h-10 rounded-xl font-semibold text-xs tracking-wide transition-all"
              style={{
                backgroundColor: 'hsl(152 60% 40% / 0.12)',
                color: 'hsl(152 60% 55%)',
                border: '1px solid hsl(152 60% 40% / 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(152 60% 40% / 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(152 60% 40% / 0.12)'
              }}
            >
              Marcar Entregue
            </button>
          )}
          {onReorder && (
            <button
              onClick={onReorder}
              className="w-full h-10 rounded-xl font-semibold text-xs tracking-wide border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Repetir Pedido
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

// ─── Main OrdersPage ──────────────────────────────────────────────────────────

export function OrdersPage() {
  const { data: orders, isLoading } = useDeliveryOrders()
  const { data: products } = useProducts()
  const updateStatus = useUpdateOrderStatus()

  const [showWizard, setShowWizard] = useState(false)
  const [prefillItems, setPrefillItems] = useState<PendingItem[] | undefined>()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!orders) return null
    const todayOrders = orders.filter((o) => isToday(o.created_at))
    const weekRevenue = orders
      .filter((o) => o.status === 'delivered' && isThisWeek(o.created_at))
      .reduce((s, o) => s + (o.total_value ?? 0), 0)
    const confirmed = orders.filter((o) => o.status === 'confirmed' || o.status === 'pending')
    const delivered = orders.filter((o) => o.status === 'delivered')
    return { todayCount: todayOrders.length, weekRevenue, confirmedCount: confirmed.length, deliveredCount: delivered.length }
  }, [orders])

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filterList = useCallback(
    (list: DeliveryOrder[]) => {
      let result = list
      if (dateFilter === 'today') result = result.filter((o) => isToday(o.created_at))
      else if (dateFilter === 'week') result = result.filter((o) => isThisWeek(o.created_at))
      const q = search.trim().toLowerCase()
      if (q) {
        result = result.filter(
          (o) =>
            o.reference?.toLowerCase().includes(q) ||
            o.address?.toLowerCase().includes(q) ||
            o.items.some((i) => (i as OrderItem).product_name?.toLowerCase().includes(q))
        )
      }
      return result
    },
    [dateFilter, search]
  )

  const confirmedOrders = useMemo(
    () => filterList(orders?.filter((o) => o.status === 'confirmed' || o.status === 'pending') ?? []),
    [filterList, orders]
  )

  const deliveredOrders = useMemo(
    () => filterList(orders?.filter((o) => o.status === 'delivered') ?? []),
    [filterList, orders]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleReorder(order: DeliveryOrder) {
    const pending: PendingItem[] = (order.items as OrderItem[]).map((item) => {
      const product = products?.find((p) => p.id === item.product_id)
      return {
        tempId: crypto.randomUUID(),
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: product?.price_sale ?? item.unit_price ?? 0,
      }
    })
    setPrefillItems(pending)
    setShowWizard(true)
    window.scrollTo(0, 0)
  }

  function handleNewOrder() {
    setPrefillItems(undefined)
    setShowWizard(true)
    window.scrollTo(0, 0)
  }

  function handleDone() {
    setShowWizard(false)
    setPrefillItems(undefined)
  }

  function handleWizardNewOrder() {
    setPrefillItems(undefined)
    setShowWizard(true)
    window.scrollTo(0, 0)
  }

  // ── Wizard view ───────────────────────────────────────────────────────────
  if (showWizard) {
    return (
      <NewOrderWizard
        prefillItems={prefillItems}
        onDone={handleDone}
        onSuccessNewOrder={handleWizardNewOrder}
      />
    )
  }

  const dateChips: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Semana' },
    { key: 'all', label: 'Todos' },
  ]

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-4 w-full pb-8">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1
            className="text-3xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Pedidos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">
            Delivery Mr. Lion
          </p>
        </div>
        <button
          onClick={handleNewOrder}
          className="h-11 px-5 rounded-xl font-bold text-sm tracking-wide transition-all hover:opacity-90 active:scale-[0.97] flex items-center gap-2"
          style={{
            backgroundColor: 'hsl(42 60% 55%)',
            color: 'hsl(240 25% 4%)',
          }}
        >
          <ShoppingBag className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      {/* KPI bar */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-32 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : kpis ? (
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <KpiPill
            icon={<ShoppingBag className="w-4 h-4" />}
            label="Hoje"
            value={`${kpis.todayCount} pedidos`}
          />
          <KpiPill
            icon={<TrendingUp className="w-4 h-4" />}
            label="Semana"
            value={fmt(kpis.weekRevenue)}
            highlight
          />
          <KpiPill
            icon={<Package className="w-4 h-4" />}
            label="Confirmados"
            value={String(kpis.confirmedCount)}
          />
          <KpiPill
            icon={<Truck className="w-4 h-4" />}
            label="Entregues"
            value={String(kpis.deliveredCount)}
          />
        </div>
      ) : null}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por referência, endereço ou produto..."
          className="pl-9 h-11 bg-card border-border text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Date chips */}
      <div className="flex gap-2">
        {dateChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setDateFilter(chip.key)}
            className={`h-7 px-3.5 rounded-full text-xs font-semibold border transition-all ${
              dateFilter === chip.key
                ? 'text-[hsl(42_60%_55%)] border-[hsl(42_60%_55%/0.35)]'
                : 'bg-secondary text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
            }`}
            style={
              dateFilter === chip.key
                ? { backgroundColor: 'hsl(42 60% 55% / 0.1)' }
                : undefined
            }
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="confirmed">
        <TabsList className="w-full bg-card border border-border">
          <TabsTrigger value="confirmed" className="flex-1 text-xs tracking-wide gap-2">
            Confirmados
            {!isLoading && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
                style={{
                  backgroundColor: 'hsl(42 60% 55% / 0.12)',
                  color: 'hsl(42 60% 55%)',
                }}
              >
                {confirmedOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 text-xs tracking-wide gap-2">
            Entregues
            {!isLoading && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] font-black">
                {deliveredOrders.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Confirmed */}
        <TabsContent value="confirmed" className="space-y-3 mt-4">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : confirmedOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'hsl(240 25% 8%)' }}
              >
                <Package className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground/60">Nenhum pedido confirmado</p>
                <p className="text-xs">
                  {search ? 'Tente outro termo de busca' : 'Clique em "+ Novo Pedido" para começar'}
                </p>
              </div>
            </div>
          ) : (
            confirmedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onMarkDelivered={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
              />
            ))
          )}
        </TabsContent>

        {/* Delivered */}
        <TabsContent value="delivered" className="space-y-3 mt-4">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : deliveredOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'hsl(240 25% 8%)' }}
              >
                <Truck className="w-7 h-7 opacity-40" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground/60">Nenhuma entrega registrada</p>
                <p className="text-xs">
                  {search ? 'Tente outro termo de busca' : 'Entregas concluídas aparecerão aqui'}
                </p>
              </div>
            </div>
          ) : (
            deliveredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onReorder={() => handleReorder(order)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
