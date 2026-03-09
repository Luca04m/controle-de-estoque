import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { getPendingMovements, markMovementSynced } from '@/lib/db'

export function useRealtime() {
  const qc = useQueryClient()
  const { setConnected, setLastSyncAt, setPendingCount } = useRealtimeStore()
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const realtimeActiveRef = useRef(false)

  const syncOfflineQueue = useCallback(async () => {
    const pending = await getPendingMovements()
    setPendingCount(pending.length)

    for (const mv of pending) {
      const { synced: _synced, sync_error: _err, ...payload } = mv
      const { error } = await supabase.from('stock_movements').insert([payload])
      if (!error) {
        await markMovementSynced(mv.id)
      }
    }

    const remaining = await getPendingMovements()
    setPendingCount(remaining.length)
  }, [setPendingCount])

  useEffect(() => {
    const channel = supabase
      .channel('mr-lion-stock')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_movements' }, () => {
        qc.invalidateQueries({ queryKey: ['stock_movements'] })
        qc.invalidateQueries({ queryKey: ['products'] })
        setLastSyncAt(new Date())
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        qc.invalidateQueries({ queryKey: ['products'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_orders' }, () => {
        qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      })
      .subscribe((status) => {
        const isConnected = status === 'SUBSCRIBED'
        realtimeActiveRef.current = isConnected
        setConnected(isConnected)

        if (isConnected) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          syncOfflineQueue()
        } else {
          // Fallback polling every 30s
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(() => {
              qc.invalidateQueries({ queryKey: ['products'] })
              qc.invalidateQueries({ queryKey: ['stock_movements'] })
            }, 30_000)
          }
        }
      })

    return () => {
      channel.unsubscribe()
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [qc, setConnected, setLastSyncAt, syncOfflineQueue])
}
