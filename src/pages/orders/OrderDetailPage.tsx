import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, User } from 'lucide-react'
import {
  useDeliveryOrders,
  useUpdateOrderStatus,
  useCancelOrder,
  useUpdateOrder,
  useDeleteOrder,
} from '@/hooks/useDeliveryOrders'
import type { UpdateOrderInput } from '@/hooks/useDeliveryOrders'
import { useLocations } from '@/hooks/useLocations'
import { CancelOrderDialog } from '@/components/CancelOrderDialog'
import { OrderDetailHeader } from '@/features/orders/OrderDetailHeader'
import { OrderItemsTable } from '@/features/orders/OrderItemsTable'
import { OrderActionButtons } from '@/features/orders/OrderActionButtons'
import { ConfirmDeliveryDialog } from '@/features/orders/ConfirmDeliveryDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { X } from 'lucide-react'
import type { OrderItem, DeliveryOrder } from '@/types'
import { formatOrderNumber } from '@/lib/utils'

// ─── EditOrderModal (inline, detalhe only) ────────────────────────────────────

interface EditOrderModalProps {
  order: DeliveryOrder | null
  onClose: () => void
  onSave: (input: UpdateOrderInput) => void
  isPending: boolean
}

function EditOrderModal({ order, onClose, onSave, isPending }: EditOrderModalProps) {
  const [reference, setReference] = useState(order?.reference ?? '')
  const [address, setAddress] = useState(order?.address ?? '')
  const [notes, setNotes] = useState(order?.notes ?? '')

  if (!order) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[61] rounded-2xl border shadow-2xl p-5 space-y-4 w-full max-w-sm mx-auto"
        style={{ backgroundColor: 'hsl(240 20% 8%)', borderColor: 'hsl(240 15% 15%)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-base">Editar Pedido</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-white/35 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Referência / Nome
            </label>
            <input
              type="text"
              placeholder="Nome do cliente ou referência"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-white/35 focus:outline-none transition-all"
              style={{ backgroundColor: 'hsl(240 22% 7%)', borderColor: 'hsl(240 15% 11%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(42 60% 55% / 0.5)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(240 15% 11%)' }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-white/35 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Endereço
            </label>
            <textarea
              rows={2}
              placeholder="Endereço de entrega"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-white/35 resize-none focus:outline-none transition-all"
              style={{ backgroundColor: 'hsl(240 22% 7%)', borderColor: 'hsl(240 15% 11%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(42 60% 55% / 0.5)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(240 15% 11%)' }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-white/35">
              Observações
            </label>
            <input
              type="text"
              placeholder="Ex: deixar na portaria, ligar antes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-white/35 focus:outline-none transition-all"
              style={{ backgroundColor: 'hsl(240 22% 7%)', borderColor: 'hsl(240 15% 11%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(42 60% 55% / 0.5)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(240 15% 11%)' }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave({ id: order.id, reference: reference || null, address: address || null, notes: notes || null })}
            disabled={isPending}
            className="flex-1 h-11 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
            style={{ backgroundColor: 'hsl(42 60% 55%)', color: 'hsl(240 25% 4%)' }}
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-lg text-sm border text-white/50 hover:text-white transition-colors"
            style={{ borderColor: 'hsl(240 15% 15%)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── OrderDetailPage ──────────────────────────────────────────────────────────

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: orders, isLoading } = useDeliveryOrders()
  const { data: locations } = useLocations()
  const updateStatus = useUpdateOrderStatus()
  const cancelOrder = useCancelOrder()
  const updateOrder = useUpdateOrder()
  const deleteOrder = useDeleteOrder()

  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const order = orders?.find((o) => o.id === id)

  if (isLoading) {
    return (
      <div className="w-full p-4 space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="w-full p-4 flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-white/40">Pedido não encontrado</p>
        <button
          onClick={() => navigate('/pedidos')}
          className="h-10 px-4 rounded-lg text-sm border text-white/50 hover:text-white transition-colors"
          style={{ borderColor: 'hsl(240 15% 13%)', backgroundColor: 'hsl(240 22% 7%)' }}
        >
          Voltar para lista
        </button>
      </div>
    )
  }

  const items = order.items as OrderItem[]
  const totalValue = order.total_value ?? items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0)
  const locationName = locations?.find((l) => l.id === order.location_id)?.name

  function handleMarkDelivered() {
    setShowConfirmDelivery(true)
  }

  function handleConfirmDelivery() {
    updateStatus.mutate(
      { id: order!.id, status: 'delivered' },
      { onSettled: () => setShowConfirmDelivery(false) }
    )
  }

  function handleConfirmCancel() {
    cancelOrder.mutate(
      { orderId: order!.id, order: order! },
      { onSettled: () => { setShowCancelDialog(false); navigate('/pedidos') } }
    )
  }

  function handleDelete() {
    deleteOrder.mutate(order!.id, {
      onSuccess: () => navigate('/pedidos'),
    })
  }

  function handleSaveEdit(input: UpdateOrderInput) {
    updateOrder.mutate(input, { onSuccess: () => setShowEditModal(false) })
  }

  return (
    <div className="w-full space-y-4 p-4 pb-24">
      {/* Dialogs */}
      <ConfirmDeliveryDialog
        order={showConfirmDelivery ? order : null}
        onConfirm={handleConfirmDelivery}
        onClose={() => setShowConfirmDelivery(false)}
        isPending={updateStatus.isPending}
      />

      <CancelOrderDialog
        order={showCancelDialog ? order : null}
        onConfirm={handleConfirmCancel}
        onClose={() => setShowCancelDialog(false)}
        isPending={cancelOrder.isPending}
      />

      <EditOrderModal
        order={showEditModal ? order : null}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        isPending={updateOrder.isPending}
      />

      {/* Header */}
      <OrderDetailHeader order={order} />

      {/* Info block */}
      {(order.reference || order.address || order.notes || locationName) && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ backgroundColor: 'hsl(240 22% 7%)', borderColor: 'hsl(240 15% 11%)' }}
        >
          {order.reference && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-white/35 shrink-0" />
              <span className="text-white font-medium">{order.reference}</span>
            </div>
          )}
          {order.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-[hsl(42_60%_55%)] shrink-0 mt-0.5" />
              <span className="text-white/80 leading-snug">{order.address}</span>
            </div>
          )}
          {order.notes && (
            <p className="text-xs text-white/35 pl-5">{order.notes}</p>
          )}
          {locationName && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/40 pt-1">
              <MapPin className="w-3 h-3 text-[hsl(42_60%_55%/0.5)]" />
              <span>{locationName}</span>
            </div>
          )}
          <div className="text-xs text-white/30 pt-1">
            {formatOrderNumber(order.id)}
          </div>
        </div>
      )}

      {/* Items */}
      <OrderItemsTable items={items} totalValue={totalValue} />

      {/* Actions */}
      <OrderActionButtons
        order={order}
        onMarkDelivered={handleMarkDelivered}
        onReorder={() => navigate('/pedidos', { state: { reorderFrom: order.id } })}
        onEdit={() => setShowEditModal(true)}
        onCancel={() => setShowCancelDialog(true)}
        onDelete={handleDelete}
      />
    </div>
  )
}
