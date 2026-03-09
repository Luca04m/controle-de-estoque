import { useState, useMemo } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useDeliveryOrders, useCreateOrder, useUpdateOrderStatus } from '@/hooks/useDeliveryOrders'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Package, MapPin, User, RotateCcw } from 'lucide-react'
import type { OrderItem, DeliveryOrder } from '@/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface PendingItem extends OrderItem {
  tempId: string
}

// ─── Date filter helpers ────────────────────────────────────────────────────

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

// ─── NewOrderForm ────────────────────────────────────────────────────────────

interface NewOrderFormProps {
  onDone: () => void
  prefillItems?: PendingItem[]
}

function NewOrderForm({ onDone, prefillItems }: NewOrderFormProps) {
  const { data: products } = useProducts()
  const createOrder = useCreateOrder()
  const [items, setItems] = useState<PendingItem[]>(prefillItems ?? [])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [reference, setReference] = useState('')
  const [address, setAddress] = useState('')
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  const totalValue = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * (i.unit_price ?? 0), 0),
    [items]
  )

  function addItem() {
    const product = products?.find((p) => p.id === selectedProductId)
    if (!product) return
    const existing = items.find((i) => i.product_id === selectedProductId)
    if (existing) {
      setItems(items.map((i) =>
        i.product_id === selectedProductId ? { ...i, quantity: i.quantity + qty } : i
      ))
    } else {
      setItems([...items, {
        tempId: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price_sale ?? 0,
      }])
    }
    setSelectedProductId('')
    setQty(1)
  }

  function removeItem(tempId: string) {
    setItems(items.filter((i) => i.tempId !== tempId))
  }

  function validateStock(): string | null {
    for (const item of items) {
      const product = products?.find((p) => p.id === item.product_id)
      if (!product || product.current_stock < item.quantity) {
        return `Estoque insuficiente: ${item.product_name} (disponível: ${product?.current_stock ?? 0})`
      }
    }
    return null
  }

  async function onConfirm() {
    await createOrder.mutateAsync({
      items: items.map(({ tempId: _t, ...item }) => item),
      reference: reference || null,
      notes: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      address: address || null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total_value: totalValue || null as any,
    } as any)
    onDone()
  }

  const stockError = validateStock()
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  // ── Confirm step ──────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="space-y-5">
        <h2
          className="text-xl text-foreground"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Confirmar Pedido
        </h2>

        <div className="bg-card border border-gold/30 rounded-xl p-5 space-y-3 gold-glow">
          {items.map((item) => (
            <div
              key={item.tempId}
              className="flex justify-between items-center py-1.5 border-b border-border last:border-0"
            >
              <span className="font-medium text-foreground">{item.product_name}</span>
              <div className="flex items-center gap-3 text-right">
                <span className="text-xs text-muted-foreground">{item.quantity} un</span>
                <span className="font-bold tabular-nums text-gold text-sm">
                  {fmt(item.quantity * (item.unit_price ?? 0))}
                </span>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-gold/20">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-black tabular-nums text-gold">{fmt(totalValue)}</span>
          </div>

          {reference && (
            <p className="text-xs text-muted-foreground">
              Ref: {reference}
            </p>
          )}
          {address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {address}
            </p>
          )}
        </div>

        {stockError && (
          <div className="bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-3">
            <p className="text-sm text-red-400 font-medium">⚠ {stockError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep('form')}
            className="h-14 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            Voltar
          </button>
          <button
            disabled={!!stockError || createOrder.isPending}
            onClick={onConfirm}
            className="h-14 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {createOrder.isPending ? 'Confirmando...' : '✓ Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Form step ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Reference */}
      <div className="space-y-1.5">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground">
          Referência (WhatsApp / código)
        </Label>
        <Input
          placeholder="Ex: +55 21 99999-0000"
          className="h-12 bg-card border-border"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground">
          Endereço / Destinatário <span className="text-red-400">*</span>
        </Label>
        <Input
          placeholder="Ex: Rua das Flores 123, São Paulo — João Silva"
          className="h-12 bg-card border-border"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div className="h-px bg-border" />

      {/* Add product */}
      <div className="space-y-3">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground">
          Adicionar Produto
        </Label>
        <Select
          value={selectedProductId}
          onValueChange={(v) => { if (v) setSelectedProductId(v) }}
        >
          <SelectTrigger className="h-12 bg-card border-border">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {products?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({p.current_stock} un · {fmt(p.price_sale)})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="h-12 w-12 rounded-xl border border-border bg-card text-xl font-bold text-foreground hover:bg-secondary transition-all"
          >
            −
          </button>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-12 text-center text-xl font-black flex-1 bg-card border-border text-gold"
          />
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            className="h-12 w-12 rounded-xl border border-border bg-card text-xl font-bold text-foreground hover:bg-secondary transition-all"
          >
            +
          </button>
          <button
            type="button"
            onClick={addItem}
            disabled={!selectedProductId}
            className="h-12 px-5 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Itens do Pedido
          </p>
          {items.map((item) => (
            <div
              key={item.tempId}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
            >
              <div>
                <p className="font-medium text-foreground text-sm">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} un · {fmt(item.unit_price ?? 0)} cada ={' '}
                  <span className="text-gold font-semibold">
                    {fmt(item.quantity * (item.unit_price ?? 0))}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.tempId)}
                className="text-muted-foreground hover:text-destructive transition-colors text-sm px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Running total */}
          <div className="flex justify-between items-center px-3 py-2 bg-gold/5 border border-gold/20 rounded-lg">
            <span className="text-xs text-muted-foreground">
              {totalItems} {totalItems === 1 ? 'unidade' : 'unidades'} · {items.length}{' '}
              {items.length === 1 ? 'produto' : 'produtos'}
            </span>
            <span className="font-black text-gold tabular-nums">{fmt(totalValue)}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={items.length === 0 || !address.trim()}
        onClick={() => setStep('confirm')}
        className="w-full h-14 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm tracking-wider uppercase hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        Revisar Pedido ({items.length} {items.length === 1 ? 'item' : 'itens'}) →
      </button>

      {!address.trim() && items.length > 0 && (
        <p className="text-xs text-amber-400 text-center -mt-2">
          Preencha o endereço para continuar
        </p>
      )}
    </div>
  )
}

// ─── OrderStatusBadge ────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pendente',
      className: 'bg-amber-950/40 text-amber-400 border-amber-800/30',
    },
    confirmed: {
      label: 'Confirmado',
      className: 'bg-gold/10 text-gold border-gold/20',
    },
    delivered: {
      label: 'Entregue',
      className: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30',
    },
  }
  const config = map[status] ?? {
    label: status,
    className: 'bg-secondary text-muted-foreground border-border',
  }
  return (
    <span className={`text-xs border rounded-md px-2 py-0.5 font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ─── OrderCard ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: DeliveryOrder
  onMarkDelivered?: () => void
  onReorder?: () => void
}

function OrderCard({ order, onMarkDelivered, onReorder }: OrderCardProps) {
  const items = order.items as OrderItem[]
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalValue =
    order.total_value ??
    items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0)
  const operator =
    (order.profile as { full_name?: string } | undefined)?.full_name ?? '—'

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-gold/20 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-mono text-foreground truncate flex-1">
          {order.reference ?? order.id.slice(0, 8)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-secondary text-muted-foreground border border-border rounded-md px-2 py-0.5 tabular-nums">
            {totalItems} un
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Value + meta row */}
      <div className="flex items-center justify-between">
        <span className="font-black tabular-nums text-gold text-lg">{fmt(totalValue)}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Address */}
      {order.address && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gold/60" />
          <span className="truncate" title={order.address}>
            {order.address}
          </span>
        </div>
      )}

      {/* Operator */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="w-3 h-3 shrink-0" />
        <span>{operator}</span>
      </div>

      {/* Items */}
      <div className="space-y-1 border-t border-border pt-3">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.product_name}</span>
            <span className="font-semibold tabular-nums text-foreground">{item.quantity} un</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onMarkDelivered && (
          <button
            className="flex-1 h-9 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all"
            onClick={onMarkDelivered}
          >
            Marcar como Entregue
          </button>
        )}
        {onReorder && (
          <button
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gold/30 text-xs text-gold hover:bg-gold/10 transition-all"
            onClick={onReorder}
          >
            <RotateCcw className="w-3 h-3" />
            Repetir Pedido
          </button>
        )}
      </div>
    </div>
  )
}

// ─── OrdersPage ──────────────────────────────────────────────────────────────

export function OrdersPage() {
  const { data: orders, isLoading } = useDeliveryOrders()
  const { data: products } = useProducts()
  const updateStatus = useUpdateOrderStatus()

  const [showNew, setShowNew] = useState(false)
  const [prefillItems, setPrefillItems] = useState<PendingItem[] | undefined>()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  function handleReorder(order: DeliveryOrder) {
    // Map delivered order items back into PendingItems, refreshing unit_price from current catalogue
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
    setShowNew(true)
  }

  function handleNewOrder() {
    setPrefillItems(undefined)
    setShowNew(true)
  }

  function handleDone() {
    setShowNew(false)
    setPrefillItems(undefined)
  }

  if (showNew) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleDone}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
          <h1
            className="text-xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            {prefillItems ? 'Repetir Pedido' : 'Novo Pedido'}
          </h1>
        </div>
        <NewOrderForm onDone={handleDone} prefillItems={prefillItems} />
      </div>
    )
  }

  // Filter helpers
  function applyDateFilter(list: DeliveryOrder[]) {
    if (dateFilter === 'today') return list.filter((o) => isToday(o.created_at))
    if (dateFilter === 'week') return list.filter((o) => isThisWeek(o.created_at))
    return list
  }

  function applySearch(list: DeliveryOrder[]) {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (o) =>
        o.reference?.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q)
    )
  }

  const confirmedOrders = applySearch(
    applyDateFilter(
      orders?.filter((o) => o.status === 'confirmed' || o.status === 'pending') ?? []
    )
  )

  const deliveredOrders = applySearch(
    applyDateFilter(orders?.filter((o) => o.status === 'delivered') ?? [])
  )

  const dateChips: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Esta semana' },
    { key: 'all', label: 'Todos' },
  ]

  return (
    <div className="space-y-5 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Pedidos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Delivery Mr. Lion</p>
        </div>
        <button
          onClick={handleNewOrder}
          className="h-11 px-5 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm hover:opacity-90 transition-all"
        >
          + Novo Pedido
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por referência ou endereço..."
          className="pl-9 h-10 bg-card border-border text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Date filter chips */}
      <div className="flex gap-2">
        {dateChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setDateFilter(chip.key)}
            className={`h-7 px-3 rounded-full text-xs font-medium border transition-all ${
              dateFilter === chip.key
                ? 'bg-gold/10 text-gold border-gold/30'
                : 'bg-secondary text-muted-foreground border-border hover:border-gold/20 hover:text-foreground'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="confirmed">
        <TabsList className="w-full bg-card border border-border">
          <TabsTrigger value="confirmed" className="flex-1 text-xs tracking-wide gap-1.5">
            Confirmados
            {!isLoading && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold/10 text-gold text-[10px] font-bold">
                {confirmedOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 text-xs tracking-wide gap-1.5">
            Entregues
            {!isLoading && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] font-bold">
                {deliveredOrders.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Confirmed tab */}
        <TabsContent value="confirmed" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>
          ) : confirmedOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Package className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhum pedido confirmado</p>
            </div>
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
        <TabsContent value="delivered" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>
          ) : deliveredOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Package className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhum pedido entregue</p>
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
