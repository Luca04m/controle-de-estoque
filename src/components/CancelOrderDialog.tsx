import { AlertTriangle, XCircle } from 'lucide-react'
import { formatOrderNumber } from '@/lib/utils'
import type { DeliveryOrder, OrderItem } from '@/types'

// ─── CancelOrderDialog ────────────────────────────────────────────────────────

interface CancelOrderDialogProps {
  order: DeliveryOrder | null
  onConfirm: () => void
  onClose: () => void
  isPending?: boolean
}

export function CancelOrderDialog({ order, onConfirm, onClose, isPending }: CancelOrderDialogProps) {
  if (!order) return null

  const items = order.items as OrderItem[]
  const orderNumber = formatOrderNumber(order.id)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl"
        style={{
          background: 'hsl(240 22% 7%)',
          borderColor: 'hsl(0 70% 28% / 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'hsl(0 60% 20% / 0.4)' }}>
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground">Cancelar Pedido {orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Os itens abaixo serão devolvidos ao estoque automaticamente.
            </p>
          </div>
        </div>

        {/* Items list */}
        <div className="rounded-xl border border-border divide-y divide-border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm text-foreground truncate flex-1 min-w-0 pr-3">
                {item.product_name}
              </span>
              <span className="text-xs font-semibold text-emerald-400 shrink-0 tabular-nums">
                +{item.quantity} un
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Esta ação não pode ser desfeita. O pedido ficará visível na aba &quot;Cancelados&quot;.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-all disabled:opacity-50"
            style={{ borderColor: 'hsl(240 15% 14%)' }}
          >
            Manter Pedido
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
            style={{
              background: 'hsl(0 65% 40%)',
              color: 'white',
            }}
          >
            <XCircle size={15} />
            {isPending ? 'Cancelando...' : 'Cancelar Pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
