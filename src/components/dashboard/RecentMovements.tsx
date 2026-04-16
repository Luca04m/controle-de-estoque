import { ArrowRight, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ACTION_MAP, shortLocationName } from './_shared'
import type { StockMovement } from '@/types'

export function RecentMovements({ movements }: { movements: StockMovement[] | undefined }) {
  const navigate = useNavigate()

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
          Movimentações Recentes
        </p>
        <button
          onClick={() => navigate('/entrada')}
          className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
        >
          Ver todas <ArrowRight size={11} />
        </button>
      </div>

      <div className="space-y-0.5">
        {movements?.slice(0, 10).map(m => {
          const action = ACTION_MAP[m.action] ?? { label: m.action, color: 'text-muted-foreground', symbol: '·' }
          const when = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          const locName = (m.location as { name: string } | undefined)?.name
          const shortLoc = locName ? shortLocationName(locName) : null

          return (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className={`text-sm font-black w-4 text-center shrink-0 ${action.color}`}>
                {action.symbol}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {(m.product as { name: string } | undefined)?.name ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {shortLoc && (
                    <>
                      <MapPin size={9} className="shrink-0" />
                      <span className="truncate">{shortLoc}</span>
                      <span className="text-border">·</span>
                    </>
                  )}
                  {when} · {(m.profile as { full_name: string } | undefined)?.full_name ?? 'operador'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-semibold ${action.color}`}>{action.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{m.quantity} un</p>
              </div>
            </div>
          )
        })}
        {movements?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Sem movimentações</p>
        )}
      </div>
    </div>
  )
}
