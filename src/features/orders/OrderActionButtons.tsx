import { CheckCircle2, RotateCcw, Pencil, Trash2, X } from 'lucide-react'
import type { DeliveryOrder } from '@/types'

interface OrderActionButtonsProps {
  order: DeliveryOrder
  onMarkDelivered?: () => void
  onReorder?: () => void
  onEdit?: () => void
  onCancel?: () => void
  onDelete?: () => void
}

export function OrderActionButtons({
  order,
  onMarkDelivered,
  onReorder,
  onEdit,
  onCancel,
  onDelete,
}: OrderActionButtonsProps) {
  const isActive = order.status === 'confirmed' || order.status === 'pending'
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="space-y-2">
      {isActive && onMarkDelivered && (
        <button
          onClick={onMarkDelivered}
          className="w-full h-11 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'hsl(152 60% 35% / 0.1)',
            color: 'hsl(152 60% 50%)',
            border: '1px solid hsl(152 60% 35% / 0.25)',
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          Marcar como Entregue
        </button>
      )}

      {isDelivered && onReorder && (
        <button
          onClick={onReorder}
          className="w-full h-11 rounded-xl font-medium text-sm border text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
          style={{ borderColor: 'hsl(240 15% 13%)', backgroundColor: 'hsl(240 22% 7%)' }}
        >
          <RotateCcw className="w-4 h-4" />
          Repetir Pedido
        </button>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          className="w-full h-11 rounded-xl font-medium text-sm border text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
          style={{ borderColor: 'hsl(240 15% 13%)', backgroundColor: 'hsl(240 22% 7%)' }}
        >
          <Pencil className="w-4 h-4" />
          Editar Pedido
        </button>
      )}

      {isActive && onCancel && (
        <button
          onClick={onCancel}
          className="w-full h-11 rounded-xl font-medium text-sm border text-red-400/60 hover:text-red-400 hover:border-red-800/40 transition-colors flex items-center justify-center gap-2"
          style={{ borderColor: 'hsl(240 15% 13%)', backgroundColor: 'hsl(240 22% 7%)' }}
        >
          <X className="w-4 h-4" />
          Cancelar Pedido
        </button>
      )}

      {(isCancelled || isDelivered) && onDelete && (
        <button
          onClick={onDelete}
          className="w-full h-11 rounded-xl font-medium text-sm border text-red-400/60 hover:text-red-400 hover:border-red-800/40 transition-colors flex items-center justify-center gap-2"
          style={{ borderColor: 'hsl(240 15% 13%)', backgroundColor: 'hsl(240 22% 7%)' }}
        >
          <Trash2 className="w-4 h-4" />
          Excluir Registro
        </button>
      )}
    </div>
  )
}
