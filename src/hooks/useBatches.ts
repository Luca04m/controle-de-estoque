import { useQuery } from '@tanstack/react-query'
import { MOCK_BATCHES } from '@/lib/mockDemoData'
import type { ExpiringBatch, BatchStatus } from '@/types'

// DEMO: retorna mock data. Migration real em supabase/migrations/20260416_est2_product_batches.sql.
export function useBatches() {
  return useQuery<ExpiringBatch[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 150))
      return MOCK_BATCHES
    },
  })
}

export function useExpiringBatches(withinDays: number = 30) {
  const { data, ...rest } = useBatches()
  const filtered = data?.filter(b => b.days_until_expiry <= withinDays)
  return { data: filtered, ...rest }
}

export function countByStatus(batches: ExpiringBatch[] | undefined): Record<BatchStatus, number> {
  const counts: Record<BatchStatus, number> = { expired: 0, critical: 0, warning: 0, ok: 0 }
  batches?.forEach(b => { counts[b.status] += 1 })
  return counts
}
