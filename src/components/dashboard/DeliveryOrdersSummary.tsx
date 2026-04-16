import { ArrowRight, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ORDER_STATUS_CFG, formatCurrency, shortLocationName } from './_shared'
import type { DeliveryOrder } from '@/types'

export function DeliveryOrdersSummary({ orders }: { orders: DeliveryOrder[] | undefined }) {
  const navigate = useNavigate()

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
          Pedidos Delivery
        </p>
        <button
          onClick={() => navigate('/pedidos')}
          className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
        >
          Ver todos <ArrowRight size={11} />
        </button>
      </div>

      {!orders || orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem pedidos</p>
      ) : (
        <div className="space-y-0.5">
          {orders.slice(0, 8).map(o => {
            const st = ORDER_STATUS_CFG[o.status] ?? { label: o.status, color: 'text-muted-foreground' }
            const locName = (o.location as { name: string } | undefined)?.name
            const shortLoc = locName ? shortLocationName(locName) : null
            const when = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            const itemCount = o.items.reduce((s, i) => s + i.quantity, 0)

            return (
              <div key={o.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {o.reference ?? o.address ?? `Pedido #${o.id.slice(-4)}`}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {shortLoc && (
                      <>
                        <MapPin size={9} className="shrink-0" />
                        <span className="truncate">{shortLoc}</span>
                        <span className="text-border">·</span>
                      </>
                    )}
                    {when} · {itemCount} un
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${st.color}`}>{st.label}</p>
                  {o.total_value != null && (
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(o.total_value)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
