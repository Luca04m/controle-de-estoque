import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useExpiringBatches, countByStatus } from '@/hooks/useBatches'

export function ExpiryBanner() {
  const { data: batches } = useExpiringBatches(30)
  const navigate = useNavigate()

  if (!batches || batches.length === 0) return null
  const c = countByStatus(batches)
  if (c.expired === 0 && c.critical === 0) return null

  const severity = c.expired > 0 ? 'danger' : 'warn'
  const bg = severity === 'danger' ? 'bg-destructive/10' : 'bg-warning/10'
  const border = severity === 'danger' ? 'border-destructive/40' : 'border-warning/40'
  const icon = severity === 'danger' ? 'text-destructive' : 'text-warning'

  return (
    <button
      onClick={() => navigate('/lotes')}
      className={`w-full ${bg} border ${border} rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:opacity-90 transition`}
    >
      <AlertTriangle size={18} className={icon} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">
          {c.expired > 0 && `${c.expired} lote${c.expired > 1 ? 's' : ''} vencido${c.expired > 1 ? 's' : ''}`}
          {c.expired > 0 && c.critical > 0 && ' · '}
          {c.critical > 0 && `${c.critical} vencendo em ≤ 7 dias`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Clique para gerir {batches.length} lote{batches.length > 1 ? 's' : ''} com atenção
        </p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </button>
  )
}
