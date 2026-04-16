import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './OrderCard'
import type { DeliveryOrder } from '@/types'
import { formatOrderNumber } from '@/lib/utils'

interface OrderDetailHeaderProps {
  order: DeliveryOrder
}

export function OrderDetailHeader({ order }: OrderDetailHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        type="button"
        onClick={() => navigate('/pedidos')}
        className="w-9 h-9 rounded-lg border flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0"
        style={{ borderColor: 'hsl(240 15% 13%)', backgroundColor: 'hsl(240 22% 7%)' }}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-white truncate">
          {order.reference ?? formatOrderNumber(order.id)}
        </h1>
        <p className="text-xs text-white/40">
          {new Date(order.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
      <StatusBadge status={order.status} />
    </div>
  )
}
