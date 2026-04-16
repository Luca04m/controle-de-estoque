import { useRealtimeStore } from '@/stores/realtimeStore'

export function RealtimeIndicator() {
  const { connected, lastSyncAt, pendingCount } = useRealtimeStore()
  const syncLabel = lastSyncAt
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(lastSyncAt)
    : null

  return (
    <div className="flex items-center gap-2 text-xs bg-card border border-border rounded-full px-3 py-1.5 shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
      <span className={connected ? 'text-emerald-400' : 'text-white/30'}>
        {connected ? (syncLabel ? `Atualizado ${syncLabel}` : 'Tempo real') : 'Demonstração'}
      </span>
      {pendingCount > 0 && (
        <span className="text-gold">· {pendingCount} pend.</span>
      )}
    </div>
  )
}
