import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useProducts } from '@/hooks/useProducts'
import {
  useDeliveryOrders,
  useCreateOrder,
  useUpdateOrderStatus,
  useCancelOrder,
} from '@/hooks/useDeliveryOrders'
import { CancelOrderDialog } from '@/components/CancelOrderDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Download,
  MoreVertical,
} from 'lucide-react'
import type { OrderItem, DeliveryOrder, Product, ProductCategory } from '@/types'
import type { CreateOrderInput } from '@/hooks/useDeliveryOrders'
import { getProductImage } from '@/lib/productImages'

// ─── Map product_id (mock IDs) to SKU for image lookup ───────────────────────

const ID_TO_SKU: Record<string, string> = {
  'honey-sg':  'ML-HONEY-SG',
  'honey-cmp': 'ML-HONEY-CMP',
  'honey-png': 'ML-HONEY-PNG',
  'capu-sg':   'ML-CAPU-SG',
  'capu-cmp':  'ML-CAPU-CMP',
  'capu-png':  'ML-CAPU-PNG',
  'blend-sg':  'ML-BLEND-SG',
  'blend-cmp': 'ML-BLEND-CMP',
  'blend-png': 'ML-BLEND-PNG',
}

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

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportOrdersToCSV(orders: DeliveryOrder[], filename = 'pedidos.csv') {
  const rows = [
    ['ID', 'Referência', 'Endereço', 'Status', 'Total (R$)', 'Itens', 'Criado em', 'Entregue por', 'Entregue em'],
    ...orders.map(o => [
      o.id.slice(0, 8),
      o.reference ?? '',
      o.address ?? '',
      o.status,
      (o.total_value ?? 0).toFixed(2).replace('.', ','),
      (o.items as OrderItem[]).map(i => `${i.product_name} x${i.quantity}`).join(' | '),
      new Date(o.created_at).toLocaleString('pt-BR'),
      o.delivered_by ?? '',
      o.delivered_at ? new Date(o.delivered_at).toLocaleString('pt-BR') : '',
    ])
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Date filters ─────────────────────────────────────────────────────────────

type DateFilter = 'today' | 'week' | 'month' | 'all'
type StatusFilter = 'all' | 'confirmed' | 'delivered' | 'cancelled'

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

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
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
    cancelled: {
      label: 'Cancelado',
      className: 'bg-red-950/50 text-red-400 border-red-800/40',
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
          const img = getProductImage(product.sku)

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
                {img && (
                  <div className="w-full h-20 rounded-lg overflow-hidden mb-2" style={{ background: 'hsl(240 20% 8%)' }}>
                    <img src={img} alt={product.name} className="w-full h-full object-contain" />
                  </div>
                )}
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
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onUpdateNotes?: (id: string, notes: string) => void
  onCancelOrder?: (id: string) => void
}

function OrderCard({
  order,
  onMarkDelivered,
  onReorder,
  selectionMode,
  selected,
  onToggleSelect,
  onUpdateNotes,
  onCancelOrder,
}: OrderCardProps) {
  const items = order.items as OrderItem[]
  const totalValue =
    order.total_value ?? items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0)
  const operator = (order.profile as { full_name?: string } | undefined)?.full_name ?? '—'
  const displayName = order.reference || order.id.slice(0, 8).toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(order.notes ?? '')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleSaveNotes() {
    onUpdateNotes?.(order.id, notesValue)
    setEditingNotes(false)
    setMenuOpen(false)
  }

  function handleConfirmCancel() {
    onCancelOrder?.(order.id)
    setCancelConfirm(false)
    setMenuOpen(false)
  }

  return (
    <div
      className="rounded-xl border overflow-hidden transition-colors duration-150"
      style={{
        backgroundColor: 'hsl(240 22% 7%)',
        borderColor: selected
          ? 'hsl(42 60% 55% / 0.6)'
          : order.status === 'delivered'
          ? 'hsl(152 60% 25% / 0.3)'
          : 'hsl(240 15% 11%)',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Checkbox in selection mode */}
            {selectionMode && (
              <button
                type="button"
                onClick={onToggleSelect}
                className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                style={{
                  borderColor: selected ? 'hsl(42 60% 55%)' : 'hsl(240 15% 20%)',
                  backgroundColor: selected ? 'hsl(42 60% 55%)' : 'transparent',
                }}
              >
                {selected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="hsl(240 25% 4%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
            <span className="text-sm font-semibold text-white truncate">{displayName}</span>
            <span className="text-white/35 text-xs shrink-0">{formatDateShort(order.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={order.status} />
            {/* Three-dot menu */}
            {!selectionMode && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => { setMenuOpen((v) => !v); setCancelConfirm(false); setEditingNotes(false) }}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white/35 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-8 z-50 rounded-lg border shadow-xl min-w-[160px] overflow-hidden"
                    style={{
                      backgroundColor: 'hsl(240 20% 10%)',
                      borderColor: 'hsl(240 15% 15%)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setEditingNotes(true); setCancelConfirm(false); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                    >
                      Editar notas
                    </button>
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button
                        type="button"
                        onClick={() => { setCancelConfirm(true); setEditingNotes(false); setMenuOpen(false) }}
                        className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        Cancelar pedido
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inline edit notes */}
        {editingNotes && (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Observações do pedido..."
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-white/35 resize-none focus:outline-none transition-all"
              style={{
                backgroundColor: 'hsl(240 22% 9%)',
                borderColor: 'hsl(42 60% 55% / 0.4)',
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="h-8 px-3 rounded-md text-xs font-semibold transition-colors"
                style={{ backgroundColor: 'hsl(42 60% 55%)', color: 'hsl(240 25% 4%)' }}
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => { setEditingNotes(false); setNotesValue(order.notes ?? '') }}
                className="h-8 px-3 rounded-md text-xs text-white/40 border hover:text-white transition-colors"
                style={{ borderColor: 'hsl(240 15% 15%)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Inline cancel confirmation */}
        {cancelConfirm && (
          <div
            className="rounded-lg border px-3 py-2.5 space-y-2"
            style={{ borderColor: 'hsl(0 60% 35% / 0.4)', backgroundColor: 'hsl(0 40% 8%)' }}
          >
            <p className="text-xs text-red-400 font-medium">Cancelar este pedido?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirm(false)}
                className="h-8 px-3 rounded-md text-xs text-white/40 border hover:text-white transition-colors"
                style={{ borderColor: 'hsl(240 15% 15%)' }}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

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
          {items.map((item, i) => {
            const itemSku = ID_TO_SKU[item.product_id]
            const itemImg = itemSku ? getProductImage(itemSku) : undefined
            return (
              <div
                key={i}
                className="px-3 py-2 grid text-xs items-center gap-2"
                style={{
                  gridTemplateColumns: 'auto 1fr auto auto auto',
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'hsl(240 22% 8%)',
                }}
              >
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0" style={{ background: 'hsl(240 20% 8%)' }}>
                  {itemImg && (
                    <img src={itemImg} alt={item.product_name} className="w-full h-full object-contain" />
                  )}
                </div>
                <span className="text-white/80 pr-2 truncate">{item.product_name}</span>
                <span className="text-white/35 tabular-nums text-right pr-2.5">×{item.quantity}</span>
                <span className="text-white/35 tabular-nums text-right pr-2.5">
                  {fmt(item.unit_price ?? 0)}
                </span>
                <span className="text-white font-semibold tabular-nums text-right">
                  {fmt(item.quantity * (item.unit_price ?? 0))}
                </span>
              </div>
            )
          })}
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
      {!selectionMode && (onMarkDelivered || onReorder) && (
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

// ─── Pill button helper ───────────────────────────────────────────────────────

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-3.5 rounded-full text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? 'hsl(42 60% 55%)' : 'hsl(240 22% 9%)',
        color: active ? 'hsl(240 25% 4%)' : 'hsl(var(--muted-foreground))',
        border: active ? '1px solid transparent' : '1px solid hsl(240 15% 13%)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Main OrdersPage ──────────────────────────────────────────────────────────

export function OrdersPage() {
  const { data: orders, isLoading } = useDeliveryOrders()
  const { data: products } = useProducts()
  const updateStatus = useUpdateOrderStatus()
  const cancelOrder = useCancelOrder()

  const [showWizard, setShowWizard] = useState(false)
  const [prefillItems, setPrefillItems] = useState<PendingItem[] | undefined>()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [orderToCancel, setOrderToCancel] = useState<DeliveryOrder | null>(null)

  // ── Selection mode state ───────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedOrders(new Set())
  }

  // ── In-memory notes override (for mock mode) ───────────────────────────────
  const [notesOverrides, setNotesOverrides] = useState<Record<string, string>>({})

  function handleUpdateNotes(id: string, notes: string) {
    setNotesOverrides((prev) => ({ ...prev, [id]: notes }))
  }

  // ── Cancel order — opens dialog ────────────────────────────────────────────
  function handleCancelOrder(id: string) {
    const order = orders?.find(o => o.id === id)
    if (order) setOrderToCancel(order)
  }

  function handleConfirmCancel() {
    if (!orderToCancel) return
    cancelOrder.mutate(
      { orderId: orderToCancel.id, order: orderToCancel },
      { onSettled: () => setOrderToCancel(null) }
    )
  }

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
  const filteredOrders = useMemo(() => {
    if (!orders) return []
    let result = orders

    // Date filter
    if (dateFilter === 'today') result = result.filter((o) => isToday(o.created_at))
    else if (dateFilter === 'week') result = result.filter((o) => isThisWeek(o.created_at))
    else if (dateFilter === 'month') result = result.filter((o) => isThisMonth(o.created_at))

    // Status filter
    if (statusFilter === 'confirmed') {
      result = result.filter((o) => o.status === 'confirmed' || o.status === 'pending')
    } else if (statusFilter === 'delivered') {
      result = result.filter((o) => o.status === 'delivered')
    } else if (statusFilter === 'cancelled') {
      result = result.filter((o) => o.status === 'cancelled')
    } else {
      // 'all' — exclude cancelled from default view (they're in the separate tab)
      result = result.filter((o) => o.status !== 'cancelled')
    }

    // Search
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
  }, [orders, dateFilter, statusFilter, search])

  const confirmedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'confirmed' || o.status === 'pending'),
    [filteredOrders]
  )

  const deliveredOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'delivered'),
    [filteredOrders]
  )

  const cancelledOrders = useMemo(
    () => (orders ?? []).filter((o) => o.status === 'cancelled'),
    [orders]
  )

  // Orders currently visible (for bulk export)
  const visibleOrders = statusFilter === 'confirmed'
    ? confirmedOrders
    : statusFilter === 'delivered'
    ? deliveredOrders
    : statusFilter === 'cancelled'
    ? cancelledOrders
    : filteredOrders

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

  // ── Bulk actions ──────────────────────────────────────────────────────────
  function handleBulkExport() {
    const toExport = visibleOrders.filter((o) => selectedOrders.has(o.id))
    if (toExport.length === 0) return
    exportOrdersToCSV(toExport, `pedidos-selecionados-${Date.now()}.csv`)
  }

  function handleBulkMarkDelivered() {
    selectedOrders.forEach((id) => {
      updateStatus.mutate({ id, status: 'delivered' })
    })
    exitSelectionMode()
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
    { key: 'month', label: 'Este Mês' },
    { key: 'all', label: 'Todos' },
  ]

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'confirmed', label: 'Confirmados' },
    { key: 'delivered', label: 'Entregues' },
    { key: 'cancelled', label: `Cancelados${cancelledOrders.length > 0 ? ` · ${cancelledOrders.length}` : ''}` },
  ]

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-4 p-4 pb-24">
      {/* Cancel dialog */}
      <CancelOrderDialog
        order={orderToCancel}
        onConfirm={handleConfirmCancel}
        onClose={() => setOrderToCancel(null)}
        isPending={cancelOrder.isPending}
      />
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <div className="flex items-center gap-2">
          {/* Select toggle */}
          <button
            type="button"
            onClick={() => {
              if (selectionMode) exitSelectionMode()
              else setSelectionMode(true)
            }}
            className="h-9 px-3 rounded-lg border text-xs font-medium transition-all"
            style={{
              borderColor: selectionMode ? 'hsl(42 60% 55% / 0.5)' : 'hsl(240 15% 13%)',
              backgroundColor: selectionMode ? 'hsl(42 60% 55% / 0.08)' : 'hsl(240 22% 7%)',
              color: selectionMode ? 'hsl(42 60% 55%)' : 'hsl(var(--muted-foreground))',
            }}
          >
            {selectionMode ? 'Cancelar' : 'Selecionar'}
          </button>

          {/* Export all visible */}
          <button
            type="button"
            onClick={() => exportOrdersToCSV(visibleOrders)}
            disabled={visibleOrders.length === 0}
            className="h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
            style={{
              borderColor: 'hsl(240 15% 13%)',
              backgroundColor: 'hsl(240 22% 7%)',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>

          {/* New order */}
          <button
            onClick={handleNewOrder}
            className="h-9 px-3.5 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.97]"
            style={{
              backgroundColor: 'hsl(42 60% 55%)',
              color: 'hsl(240 25% 4%)',
            }}
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        </div>
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

      {/* Filter bar */}
      <div className="space-y-2.5">
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

        {/* Date chips + Status chips */}
        <div className="flex flex-wrap gap-2">
          {dateChips.map((chip) => (
            <PillButton
              key={chip.key}
              active={dateFilter === chip.key}
              onClick={() => setDateFilter(chip.key)}
            >
              {chip.label}
            </PillButton>
          ))}
          <div className="w-px self-stretch" style={{ backgroundColor: 'hsl(240 15% 13%)' }} />
          {statusChips.map((chip) => (
            <PillButton
              key={chip.key}
              active={statusFilter === chip.key}
              onClick={() => setStatusFilter(chip.key)}
            >
              {chip.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Order lists */}
      {isLoading ? (
        <div className="space-y-2.5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum pedido encontrado"
          subtitle={search ? 'Tente outro termo de busca' : 'Ajuste os filtros ou clique em "Novo Pedido"'}
        />
      ) : (
        <div className="space-y-2.5">
          {statusFilter === 'all' && confirmedOrders.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 px-0.5">
                Confirmados · {confirmedOrders.length}
              </p>
              {confirmedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={{ ...order, notes: notesOverrides[order.id] !== undefined ? notesOverrides[order.id] : order.notes }}
                  onMarkDelivered={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
                  selectionMode={selectionMode}
                  selected={selectedOrders.has(order.id)}
                  onToggleSelect={() => toggleSelect(order.id)}
                  onUpdateNotes={handleUpdateNotes}
                  onCancelOrder={handleCancelOrder}
                />
              ))}
            </>
          )}

          {statusFilter === 'confirmed' && confirmedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={{ ...order, notes: notesOverrides[order.id] !== undefined ? notesOverrides[order.id] : order.notes }}
              onMarkDelivered={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
              selectionMode={selectionMode}
              selected={selectedOrders.has(order.id)}
              onToggleSelect={() => toggleSelect(order.id)}
              onUpdateNotes={handleUpdateNotes}
              onCancelOrder={handleCancelOrder}
            />
          ))}

          {statusFilter === 'all' && deliveredOrders.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 px-0.5 mt-4">
                Entregues · {deliveredOrders.length}
              </p>
              {deliveredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={{ ...order, notes: notesOverrides[order.id] !== undefined ? notesOverrides[order.id] : order.notes }}
                  onReorder={() => handleReorder(order)}
                  selectionMode={selectionMode}
                  selected={selectedOrders.has(order.id)}
                  onToggleSelect={() => toggleSelect(order.id)}
                  onUpdateNotes={handleUpdateNotes}
                  onCancelOrder={handleCancelOrder}
                />
              ))}
            </>
          )}

          {statusFilter === 'delivered' && deliveredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={{ ...order, notes: notesOverrides[order.id] !== undefined ? notesOverrides[order.id] : order.notes }}
              onReorder={() => handleReorder(order)}
              selectionMode={selectionMode}
              selected={selectedOrders.has(order.id)}
              onToggleSelect={() => toggleSelect(order.id)}
              onUpdateNotes={handleUpdateNotes}
              onCancelOrder={handleCancelOrder}
            />
          ))}

          {/* Cancelled orders tab */}
          {statusFilter === 'cancelled' && cancelledOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border p-4 space-y-3 opacity-60"
              style={{
                backgroundColor: 'hsl(240 22% 7%)',
                borderColor: 'hsl(0 60% 25% / 0.4)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {order.reference || order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </p>
                </div>
                <span className="text-[10px] border border-red-800/40 bg-red-950/50 text-red-400 rounded-md px-2 py-0.5 font-semibold uppercase tracking-wide shrink-0">
                  Cancelado
                </span>
              </div>
              <div className="space-y-1">
                {(order.items as OrderItem[]).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1">{item.product_name}</span>
                    <span className="text-muted-foreground/60 tabular-nums ml-3">× {item.quantity}</span>
                  </div>
                ))}
              </div>
              {order.total_value && (
                <p className="text-xs text-muted-foreground/60 text-right tabular-nums">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_value)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selection bar (bottom) */}
      {selectionMode && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3"
          style={{
            background: 'linear-gradient(to top, hsl(240 25% 4%) 60%, transparent)',
          }}
        >
          <div
            className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
            style={{
              backgroundColor: 'hsl(240 20% 10%)',
              borderColor: 'hsl(240 15% 16%)',
            }}
          >
            <span className="text-sm font-medium text-white/60">
              {selectedOrders.size} selecionado{selectedOrders.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkExport}
                disabled={selectedOrders.size === 0}
                className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{
                  borderColor: 'hsl(240 15% 18%)',
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                <Download className="w-3 h-3" />
                Exportar
              </button>
              <button
                type="button"
                onClick={handleBulkMarkDelivered}
                disabled={selectedOrders.size === 0}
                className="h-8 px-3 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  backgroundColor: 'hsl(152 60% 35% / 0.15)',
                  color: 'hsl(152 60% 50%)',
                  border: '1px solid hsl(152 60% 35% / 0.3)',
                }}
              >
                Marcar entregues
              </button>
              <button
                type="button"
                onClick={exitSelectionMode}
                className="h-8 px-3 rounded-lg border text-xs font-medium transition-all"
                style={{
                  borderColor: 'hsl(240 15% 18%)',
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
