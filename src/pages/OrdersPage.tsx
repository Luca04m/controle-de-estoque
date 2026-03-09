import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useDeliveryOrders, useCreateOrder, useUpdateOrderStatus } from '@/hooks/useDeliveryOrders'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { OrderItem } from '@/types'

interface PendingItem extends OrderItem { tempId: string }

function NewOrderForm({ onDone }: { onDone: () => void }) {
  const { data: products } = useProducts()
  const createOrder = useCreateOrder()
  const [items, setItems] = useState<PendingItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [reference, setReference] = useState('')
  const [step, setStep] = useState<'form' | 'confirm'>('form')

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
    })
    onDone()
  }

  const stockError = validateStock()

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
            <div key={item.tempId} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
              <span className="font-medium text-foreground">{item.product_name}</span>
              <span className="font-bold tabular-nums text-gold">{item.quantity} un</span>
            </div>
          ))}
          {reference && (
            <p className="text-xs text-muted-foreground pt-1">
              Ref: {reference}
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

      <div className="h-px bg-border" />

      {/* Add product */}
      <div className="space-y-3">
        <Label className="text-xs tracking-wider uppercase text-muted-foreground">
          Adicionar Produto
        </Label>
        <Select value={selectedProductId} onValueChange={(v) => { if (v) setSelectedProductId(v) }}>
          <SelectTrigger className="h-12 bg-card border-border">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {products?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground ml-2">({p.current_stock} un)</span>
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
                <p className="text-xs text-muted-foreground">{item.quantity} unidades</p>
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
        </div>
      )}

      <button
        type="button"
        disabled={items.length === 0}
        onClick={() => setStep('confirm')}
        className="w-full h-14 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm tracking-wider uppercase hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        Revisar Pedido ({items.length} {items.length === 1 ? 'item' : 'itens'}) →
      </button>
    </div>
  )
}

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
  const config = map[status] ?? { label: status, className: 'bg-secondary text-muted-foreground border-border' }
  return (
    <span className={`text-xs border rounded-md px-2 py-0.5 font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export function OrdersPage() {
  const { data: orders, isLoading } = useDeliveryOrders()
  const updateStatus = useUpdateOrderStatus()
  const [showNew, setShowNew] = useState(false)

  if (showNew) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNew(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
          <h1
            className="text-xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Novo Pedido
          </h1>
        </div>
        <NewOrderForm onDone={() => setShowNew(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 max-w-2xl mx-auto">
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
          onClick={() => setShowNew(true)}
          className="h-11 px-5 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm hover:opacity-90 transition-all"
        >
          + Novo Pedido
        </button>
      </div>

      <Tabs defaultValue="confirmed">
        <TabsList className="w-full bg-card border border-border">
          <TabsTrigger value="confirmed" className="flex-1 text-xs tracking-wide">Em andamento</TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 text-xs tracking-wide">Entregues</TabsTrigger>
        </TabsList>

        {(['confirmed', 'delivered'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Carregando...</p>
            ) : (
              orders
                ?.filter((o) => o.status === tab || (tab === 'confirmed' && o.status === 'pending'))
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono text-foreground">
                        {order.reference ?? order.id.slice(0, 8)}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </p>

                    <div className="space-y-1.5 border-t border-border pt-3">
                      {(order.items as OrderItem[]).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.product_name}</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {item.quantity} un
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.status === 'confirmed' && (
                      <button
                        className="w-full h-9 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all"
                        onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
                      >
                        Marcar como Entregue
                      </button>
                    )}
                  </div>
                ))
            )}
            {!isLoading && !orders?.filter((o) =>
              o.status === tab || (tab === 'confirmed' && o.status === 'pending')
            ).length && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhum pedido
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
