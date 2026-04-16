import { useQuery } from '@tanstack/react-query'
import { useProducts } from './useProducts'
import { useLocations } from './useLocations'
import { getMockLocationStock } from './useLocationStock'
import type { ReplenishmentItem } from '@/lib/mockDemoData'

// Calcula sugestões a partir de produtos com current_stock <= min_stock.
// DEMO: groups por loja (location_stock mock). Max real virá de products.max_stock quando migration rodar.
export function useReplenishmentSuggestions() {
  const { data: products, isLoading: loadingP } = useProducts()
  const { data: locations, isLoading: loadingL } = useLocations()

  return useQuery<ReplenishmentItem[]>({
    queryKey: ['replenishment', products?.length, locations?.length],
    enabled: !loadingP && !loadingL && !!products && !!locations,
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 100))
      if (!products || !locations) return []

      const allStock = getMockLocationStock()
      const managedLocs = locations.filter(l => l.type !== 'deposito')
      const items: ReplenishmentItem[] = []

      for (const loc of managedLocs) {
        for (const prod of products) {
          if (!prod.active) continue
          const entry = allStock.find(s => s.product_id === prod.id && s.location_id === loc.id)
          const current = entry?.quantity ?? 0
          if (current > prod.min_stock) continue

          const suggestedMax = prod.max_stock ?? prod.min_stock * 3
          const suggested = Math.max(1, suggestedMax - current)
          const deficitRatio = current === 0 ? 1 : (prod.min_stock - current) / prod.min_stock
          const priority: ReplenishmentItem['priority'] =
            current === 0 ? 'high' : deficitRatio >= 0.5 ? 'medium' : 'low'

          items.push({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            locationName: loc.name,
            currentStock: current,
            minStock: prod.min_stock,
            maxStock: prod.max_stock ?? null,
            suggestedQuantity: suggested,
            priority,
          })
        }
      }

      return items.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
      })
    },
  })
}
