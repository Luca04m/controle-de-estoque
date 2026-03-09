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
  MapPin,
  User,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  Truck,
  Calendar,
  Plus,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import type { OrderItem, DeliveryOrder, Product, ProductCategory } from '@/types'
import type { CreateOrderInput } from '@/hooks/useDeliveryOrders'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
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
    pending: {
      label: 'Pendente',
      className: 'bg-amber-950/50 text-amber-400 border-amber-800/40',
    },
    confirmed: {
      label: 'Confirmado',
      className: 'bg-[hsl(42_60%_55%/0.1)] text-[hsl(42_60%_55%)] border-[hsl(42_60%_55%/0.3)]',
    },
    delivered: {
      label: 'Entregue',
      className: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
    },
  }
  const cfg = map[status] ?? {
    label: status,
    className: 'bg-secondary text-muted-foreground border-border',
  }
  return (
    <span
      className={`text-[10px] border rounded-md px-2 py-0.5 font-semibold tracking-wide uppercase ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  highlight?: boolean
}

function KpiCard({ label, value, highlight }: KpiCardProps) {
  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-col gap-1"
      style={{
        backgroundColor: highlight ? 'hsl(42 60% 55% / 0.06)' : 'hsl(240 22% 7%)',
        borderColor: highlight ? 'hsl(42 60% 55% / 0.25)' : 'hsl(240 15% 11%)',
      }}
    >
      <p className="text-[11px] font-medium text-white/35 uppercase tracking-wider">{label}</p>
      <p
        className="text-xl font-bold tabular-nums"
        style={{ color: highlight ? 'hsl(42 60% 55%)' : 'white' }}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: s === step ? '24px' : '8px',
              backgroundColor:
                s <= step ? 'hsl(42 60% 55%)' : 'hsl(240 15% 11%)',
            }}
          />
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
    <div className="space-y-5" style={{ animation: 'slideIn 0.2s ease-out' }}>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wider uppercase text-white/35 flex items-center gap-1.5">
          <User className="w-3 h-3" />
          Referência / Nome
          <span className="normal-case tracking-normal font-normal text-white/35">(opcional)</span>
        </Label>
        <Input
          placeholder="Nome do cliente ou referência"
          className="h-11 text-sm"
          style={{
            backgroundColor: 'hsl(240 22% 7%)',
            borderColor: 'hsl(240 15% 11%)',
          }}
          value={reference}
          onChange={(e) => onChange('reference', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wider uppercase text-white/35 flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          Endereço de Entrega
          <span className="text-red-400 normal-case tracking-normal font-bold">*</span>
        </Label>
        <textarea
          rows={3}
          placeholder="Nome completo + endereço completo. Usado como prova de entrega."
          className="w-full rounded-lg border px-3 py-2.5 text-sm text-foreground placeholder:text-white/35 resize-none focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: 'hsl(240 22% 7%)',
            borderColor: 'hsl(240 15% 11%)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'hsl(42 60% 55% / 0.5)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'hsl(240 15% 11%)'
          }}
          value={address}
          onChange={(e) => onChange('address', e.target.value)}
        />
        <p className="text-[11px] text-white/35">Prova de entrega. Campo obrigatório.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wider uppercase text-white/35">
          Observações
          <span className="ml-1.5 normal-case tracking-normal font-normal">(opcional)</span>
        </Label>
        <Input
          placeholder="Ex: deixar na portaria, ligar antes..."
          className="h-11 text-sm"
          style={{
            backgroundColor: 'hsl(240 22% 7%)',
            borderColor: 'hsl(240 15% 11%)',
          }}
          value={notes}
          onChange={(e) => onChange('notes', e.target.value)}
        />
      </div>

      <button
        disabled={!canProceed}
        onClick={onNext}
        className="w-full h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canProceed ? 'hsl(42 60% 55%)' : 'hsl(240 22% 7%)',
          color: canProceed ? 'hsl(240 25% 4%)' : 'hsl(var(--muted-foreground))',
          border: canProceed ? 'none' : '1px solid hsl(240 15% 11%)',
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
    <div className="space-y-4 pb-32" style={{ animation: 'slideIn 0.2s ease-out' }}>
      <h2 className="text-lg font-bold text-white">Produtos</h2>

      <div className="grid grid-cols-2 gap-2.5">
        {products.map((product) => {
          const qty = getQty(product.id)
          const selected = qty > 0
          const outOfStock = product.current_stock === 0
          const catStyle = categoryStyles[product.category] ?? categoryStyles.acessorio

          return (
            <div
              key={product.id}
              className="relative rounded-xl border p-3 transition-all duration-150"
              style={{
                backgroundColor: selected
                  ? 'hsl(42 60% 55% / 0.06)'
                  : 'hsl(240 22% 7%)',
                borderColor: selected
                  ? 'hsl(42 60% 55% / 0.5)'
                  : outOfStock
                  ? 'hsl(240 15% 11%)'
                  : 'hsl(240 15% 11%)',
                opacity: outOfStock ? 0.5 : 1,
                cursor: outOfStock ? 'not-allowed' : 'default',
              }}
            >
              {selected && (
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    backgroundColor: 'hsl(42 60% 55%)',
                    color: 'hsl(240 25% 4%)',
                  }}
                >
                  {qty}
                </div>
              )}

              <div className="space-y-2">
                <span
                  className={`text-[9px] font-semibold tracking-wider uppercase border rounded px-1.5 py-0.5 ${catStyle.className}`}
                >
                  {catStyle.label}
                </span>

                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {product.name}
                </p>

                <p
                  className={`text-[11px] ${
                    outOfStock ? 'text-red-400' : 'text-white/35'
                  }`}
                >
                  {outOfStock ? 'Sem estoque' : `${product.current_stock} em estoque`}
                </p>

                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: 'hsl(42 60% 55%)' }}
                >
                  {fmt(product.price_sale)}
                </p>

                {!outOfStock && (
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, -1)}
                      disabled={qty === 0}
                      className="w-7 h-7 rounded-md border text-white/60 font-bold text-sm flex items-center justify-center hover:text-white transition-colors disabled:opacity-30"
                      style={{ borderColor: 'hsl(240 15% 11%)', backgroundColor: 'hsl(240 22% 9%)' }}
                    >
                      −
                    </button>
                    <div className="flex-1 text-center text-sm font-bold tabular-nums text-white">
                      {qty === 0 ? (
                        <span className="text-[11px] text-white/35 font-normal">—</span>
                      ) : (
                        qty
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm transition-colors"
                      style={{
                        backgroundColor: 'hsl(42 60% 55% / 0.12)',
                        border: '1px solid hsl(42 60% 55% / 0.3)',
                        color: 'hsl(42 60% 55%)',
                      }}
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

      {/* Sticky footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4"
        style={{
          background: 'linear-gradient(to top, hsl(240 25% 4%) 70%, transparent)',
        }}
      >
        <div className="w-full space-y-2">
          {canProceed && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm"
              style={{
                backgroundColor: 'hsl(42 60% 55% / 0.08)',
                borderColor: 'hsl(42 60% 55% / 0.2)',
              }}
            >
              <span className="text-white/60 text-xs">
                {totalItems} produto{totalItems !== 1 ? 's' : ''}
              </span>
              <span
                className="font-bold tabular-nums text-sm"
                style={{ color: 'hsl(42 60% 55%)' }}
              >
                {fmt(totalValue)}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="h-12 w-12 shrink-0 rounded-lg border text-white/40 hover:text-white transition-colors flex items-center justify-center"
              style={{ borderColor: 'hsl(240 15% 11%)', backgroundColor: 'hsl(240 22% 7%)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              disabled={!canProceed}
              onClick={onNext}
              className="flex-1 h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{
                backgroundColor: canProceed ? 'hsl(42 60% 55%)' : 'hsl(240 22% 7%)',
                color: canProceed ? 'hsl(240 25% 4%)' : 'hsl(var(--muted-foreground))',
                border: canProceed ? 'none' : '1px solid hsl(240 15% 11%)',
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
    <div className="space-y-5" style={{ animation: 'slideIn 0.2s ease-out' }}>
      <h2 className="text-lg font-bold text-white">Confirmar Pedido</h2>

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'hsl(240 22% 7%)',
          borderColor: 'hsl(42 60% 55% / 0.2)',
        }}
      >
        {/* Recipient block */}
        {(reference || address || notes) && (
          <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: 'hsl(240 15% 11%)' }}>
            {reference && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-white/35 shrink-0" />
                <span className="text-white font-medium">{reference}</span>
              </div>
            )}
            {address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-[hsl(42_60%_55%)] shrink-0 mt-0.5" />
                <span className="text-white/80 leading-snug">{address}</span>
              </div>
            )}
            {notes && (
              <p className="text-xs text-white/35 pl-5">{notes}</p>
            )}
          </div>
        )}

        {/* Items table */}
        <div className="px-4 py-3 space-y-1.5">
          {items.map((item) => (
            <div key={item.tempId} className="grid text-sm" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
              <span className="text-white/80 pr-3 truncate">{item.product_name}</span>
              <span className="text-white/35 tabular-nums text-right pr-3">×{item.quantity}</span>
              <span className="text-white/35 tabular-nums text-right pr-3">{fmt(item.unit_price)}</span>
              <span className="text-white font-semibold tabular-nums text-right">
                {fmt(item.quantity * item.unit_price)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: 'hsl(42 60% 55% / 0.15)' }}
        >
          <div>
            <p className="text-xs text-white/35">Total do pedido</p>
            <p className="text-xs text-white/35">{totalUnits} unidade{totalUnits !== 1 ? 's' : ''}</p>
          </div>
          <span
            className="text-2xl font-black tabular-nums"
            style={{ color: 'hsl(42 60% 55%)' }}
          >
            {fmt(totalValue)}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="h-12 w-12 shrink-0 rounded-lg border text-white/40 hover:text-white transition-colors flex items-center justify-center"
          style={{ borderColor: 'hsl(240 15% 11%)', backgroundColor: 'hsl(240 22% 7%)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
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
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'hsl(42 60% 55% / 0.1)',
          border: '1px solid hsl(42 60% 55% / 0.25)',
        }}
      >
        <CheckCircle2
          className="w-10 h-10"
          style={{ color: 'hsl(42 60% 55%)' }}
        />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold text-white">Pedido confirmado</h2>
        <p className="text-sm text-white/35">
          Estoque atualizado e pedido registrado com sucesso.
        </p>
      </div>

      <div className="w-full space-y-2.5">
        <button
          onClick={onNewOrder}
          className="w-full h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: 'hsl(42 60% 55%)',
            color: 'hsl(240 25% 4%)',
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
        <button
          onClick={onBackToList}
          className="w-full h-11 rounded-lg border text-sm text-white/60 hover:text-white transition-colors"
          style={{ borderColor: 'hsl(240 15% 11%)', backgroundColor: 'hsl(240 22% 7%)' }}
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
      <div className="w-full p-4 space-y-5">
        {/* Top nav */}
        {step !== 'success' && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={step === 1 ? onDone : () => goToStep((step as number - 1) as WizardStep)}
              className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>
            <StepBar step={currentStepNum} />
          </div>
        )}

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

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
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
  const totalValue =
    order.total_value ?? items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0)
  const operator = (order.profile as { full_name?: string } | undefined)?.full_name ?? '—'
  const displayName = order.reference || order.id.slice(0, 8).toUpperCase()

  return (
    <div
      className="rounded-xl border overflow-hidden transition-colors duration-150"
      style={{
        backgroundColor: 'hsl(240 22% 7%)',
        borderColor:
          order.status === 'delivered'
            ? 'hsl(152 60% 25% / 0.3)'
            : 'hsl(240 15% 11%)',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-white truncate">{displayName}</span>
            <span className="text-white/35 text-xs shrink-0">{formatDateShort(order.created_at)}</span>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Address block */}
        {order.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-[hsl(42_60%_55%/0.7)] shrink-0 mt-0.5" />
            <span className="text-xs text-white/60 leading-relaxed">{order.address}</span>
          </div>
        )}

        {/* Items table */}
        <div
          className="rounded-lg border divide-y overflow-hidden"
          style={{
            borderColor: 'hsl(240 15% 11%)',
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="px-3 py-2 grid text-xs"
              style={{
                gridTemplateColumns: '1fr auto auto auto',
                backgroundColor: i % 2 === 0 ? 'transparent' : 'hsl(240 22% 8%)',
              }}
            >
              <span className="text-white/80 pr-2 truncate">{item.product_name}</span>
              <span className="text-white/35 tabular-nums text-right pr-2.5">×{item.quantity}</span>
              <span className="text-white/35 tabular-nums text-right pr-2.5">
                {fmt(item.unit_price ?? 0)}
              </span>
              <span className="text-white font-semibold tabular-nums text-right">
                {fmt(item.quantity * (item.unit_price ?? 0))}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: 'hsl(240 15% 11%)' }} />

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/35 min-w-0">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{operator}</span>
            <span className="text-white/20 shrink-0">·</span>
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="shrink-0">{formatDate(order.created_at)}</span>
          </div>
          <span
            className="text-xl font-black tabular-nums shrink-0"
            style={{ color: 'hsl(42 60% 55%)' }}
          >
            {fmt(totalValue)}
          </span>
        </div>

        {/* Delivered info */}
        {order.status === 'delivered' && order.delivered_by && (
          <div
            className="flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5"
            style={{
              backgroundColor: 'hsl(152 60% 8% / 0.8)',
              color: 'hsl(152 60% 50%)',
              border: '1px solid hsl(152 60% 20% / 0.3)',
            }}
          >
            <Truck className="w-3 h-3 shrink-0" />
            <span>
              Entregue por {order.delivered_by}
              {order.delivered_at && ` em ${formatDate(order.delivered_at)}`}
            </span>
          </div>
        )}
      </div>

      {/* Action area */}
      {(onMarkDelivered || onReorder) && (
        <div
          className="border-t px-4 py-3 space-y-2"
          style={{ borderColor: 'hsl(240 15% 11%)' }}
        >
          {onMarkDelivered && (
            <button
              onClick={onMarkDelivered}
              className="w-full h-10 rounded-lg font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'hsl(152 60% 35% / 0.1)',
                color: 'hsl(152 60% 50%)',
                border: '1px solid hsl(152 60% 35% / 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(152 60% 35% / 0.18)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(152 60% 35% / 0.1)'
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar como Entregue
            </button>
          )}
          {onReorder && (
            <button
              onClick={onReorder}
              className="w-full h-9 rounded-lg font-medium text-xs border text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              style={{ borderColor: 'hsl(240 15% 13%)' }}
            >
              <RotateCcw className="w-3 h-3" />
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
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ backgroundColor: 'hsl(240 22% 7%)', borderColor: 'hsl(240 15% 11%)' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ElementType
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon className="w-8 h-8 text-white/20" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/40">{title}</p>
        <p className="text-xs text-white/25">{subtitle}</p>
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
    return {
      todayCount: todayOrders.length,
      weekRevenue,
      confirmedCount: confirmed.length,
      deliveredCount: delivered.length,
    }
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
    () =>
      filterList(
        orders?.filter((o) => o.status === 'confirmed' || o.status === 'pending') ?? []
      ),
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
    <div className="w-full space-y-4 p-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <button
          onClick={handleNewOrder}
          className="h-10 px-4 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.97]"
          style={{
            backgroundColor: 'hsl(42 60% 55%)',
            color: 'hsl(240 25% 4%)',
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      {/* KPI grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <KpiCard label="Hoje" value={`${kpis.todayCount} pedidos`} />
          <KpiCard label="Semana (R$)" value={fmt(kpis.weekRevenue)} highlight />
          <KpiCard label="Confirmados" value={String(kpis.confirmedCount)} />
          <KpiCard label="Entregues" value={String(kpis.deliveredCount)} />
        </div>
      ) : null}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
        <Input
          placeholder="Buscar por referência, endereço ou produto..."
          className="pl-9 h-10 text-sm"
          style={{
            backgroundColor: 'hsl(240 22% 7%)',
            borderColor: 'hsl(240 15% 11%)',
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Date filter */}
      <div className="flex gap-4">
        {dateChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setDateFilter(chip.key)}
            className="text-sm font-medium transition-colors pb-0.5"
            style={{
              color:
                dateFilter === chip.key ? 'hsl(42 60% 55%)' : 'hsl(var(--muted-foreground))',
              borderBottom:
                dateFilter === chip.key
                  ? '1px solid hsl(42 60% 55%)'
                  : '1px solid transparent',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="confirmed">
        <TabsList
          className="w-full"
          style={{
            backgroundColor: 'hsl(240 22% 7%)',
            border: '1px solid hsl(240 15% 11%)',
          }}
        >
          <TabsTrigger value="confirmed" className="flex-1 text-xs gap-1.5">
            Confirmados
            {!isLoading && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded px-1 text-[10px] font-bold"
                style={{
                  backgroundColor: 'hsl(42 60% 55% / 0.12)',
                  color: 'hsl(42 60% 55%)',
                }}
              >
                {confirmedOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 text-xs gap-1.5">
            Entregues
            {!isLoading && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded px-1 bg-emerald-950/60 text-emerald-400 text-[10px] font-bold">
                {deliveredOrders.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Confirmed tab */}
        <TabsContent value="confirmed" className="space-y-2.5 mt-3">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : confirmedOrders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum pedido confirmado"
              subtitle={search ? 'Tente outro termo de busca' : 'Clique em "Novo Pedido" para começar'}
            />
          ) : (
            confirmedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onMarkDelivered={() =>
                  updateStatus.mutate({ id: order.id, status: 'delivered' })
                }
              />
            ))
          )}
        </TabsContent>

        {/* Delivered tab */}
        <TabsContent value="delivered" className="space-y-2.5 mt-3">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : deliveredOrders.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhuma entrega registrada"
              subtitle={search ? 'Tente outro termo de busca' : 'Entregas concluídas aparecerão aqui'}
            />
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
