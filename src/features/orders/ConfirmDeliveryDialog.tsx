import { CheckCircle2 } from 'lucide-react'
import type { DeliveryOrder } from '@/types'
import { formatOrderNumber } from '@/lib/utils'

interface ConfirmDeliveryDialogProps {
  order: DeliveryOrder | null
  onConfirm: () => void
  onClose: () => void
  isPending?: boolean
}

export function ConfirmDeliveryDialog({ order, onConfirm, onClose, isPending }: ConfirmDeliveryDialogProps) {
  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4"
        style={{ backgroundColor: 'hsl(240 20% 8%)', borderColor: 'hsl(240 15% 15%)' }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'hsl(152 60% 35% / 0.1)',
              border: '1px solid hsl(152 60% 35% / 0.3)',
            }}
          >
            <CheckCircle2 className="w-6 h-6" style={{ color: 'hsl(152 60% 50%)' }} />
          </div>
          <div>
            <h2 className="font-bold text-white text-base">Confirmar Entrega</h2>
            <p className="text-sm text-white/40 mt-1">
              Marcar {formatOrderNumber(order.id)} como entregue?
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg text-sm border text-white/50 hover:text-white transition-colors"
            style={{ borderColor: 'hsl(240 15% 15%)', backgroundColor: 'hsl(240 22% 7%)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-11 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'hsl(152 60% 35%)',
              color: 'white',
            }}
          >
            {isPending ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
