import { useQuery } from '@tanstack/react-query'
import { MOCK_LOSSES, aggregateLosses } from '@/lib/mockDemoData'
import type { LossRecord, LossAggregates } from '@/lib/mockDemoData'

export interface LossFilters {
  windowDays?: number
  location?: string | 'all'
  reason?: string | 'all'
}

export interface LossAnalyticsResult {
  records: LossRecord[]
  aggregates: LossAggregates
}

export function useLossAnalytics(filters: LossFilters = {}) {
  const { windowDays = 30, location = 'all', reason = 'all' } = filters

  return useQuery<LossAnalyticsResult>({
    queryKey: ['loss-analytics', windowDays, location, reason],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 120))
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - windowDays)

      const records = MOCK_LOSSES.filter(l => {
        if (new Date(l.created_at) < cutoff) return false
        if (location !== 'all' && l.location_name !== location) return false
        if (reason !== 'all' && l.reason !== reason) return false
        return true
      })

      return {
        records,
        aggregates: aggregateLosses(records, windowDays),
      }
    },
  })
}
