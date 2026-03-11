import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_LOCATION_STOCK, MOCK_PRODUCTS, MOCK_LOCATIONS } from '@/lib/mockData'
import type { LocationStock } from '@/types'

const _mockLocationStock = [...MOCK_LOCATION_STOCK]

export function getMockLocationStock() {
  return _mockLocationStock
}

export function updateMockLocationStock(productId: string, locationId: string, delta: number) {
  const existing = _mockLocationStock.find(
    (ls) => ls.product_id === productId && ls.location_id === locationId
  )
  if (existing) {
    existing.quantity = Math.max(0, existing.quantity + delta)
    existing.updated_at = new Date().toISOString()
  } else if (delta > 0) {
    _mockLocationStock.push({
      id: `mock-ls-${crypto.randomUUID()}`,
      product_id: productId,
      location_id: locationId,
      quantity: delta,
      updated_at: new Date().toISOString(),
    })
  }
}

export function getMockStockForLocation(productId: string, locationId: string): number {
  const entry = _mockLocationStock.find(
    (ls) => ls.product_id === productId && ls.location_id === locationId
  )
  return entry?.quantity ?? 0
}

export function useLocationStock(locationId?: string | null) {
  return useQuery({
    queryKey: ['location_stock', locationId],
    queryFn: async () => {
      if (IS_MOCK) {
        let result = [..._mockLocationStock]
        if (locationId) result = result.filter((ls) => ls.location_id === locationId)

        return result.map((ls) => {
          const product = MOCK_PRODUCTS.find((p) => p.id === ls.product_id)
          const location = MOCK_LOCATIONS.find((l) => l.id === ls.location_id)
          return {
            ...ls,
            product: product
              ? { name: product.name, sku: product.sku, min_stock: product.min_stock, category: product.category }
              : undefined,
            location: location ? { name: location.name, type: location.type } : undefined,
          } as LocationStock
        })
      }

      let q = supabase
        .from('location_stock')
        .select('*, products(name, sku, min_stock, category), locations(name, type)')
        .order('product_id')

      if (locationId) q = q.eq('location_id', locationId)

      const { data, error } = await q
      if (error) throw error
      return data as LocationStock[]
    },
  })
}

export function useStockMatrix() {
  return useQuery({
    queryKey: ['stock_matrix'],
    queryFn: async () => {
      if (IS_MOCK) {
        const matrix: Record<string, Record<string, number>> = {}
        for (const ls of _mockLocationStock) {
          if (!matrix[ls.product_id]) matrix[ls.product_id] = {}
          matrix[ls.product_id][ls.location_id] = ls.quantity
        }
        return matrix
      }

      const { data, error } = await supabase
        .from('location_stock')
        .select('product_id, location_id, quantity')

      if (error) throw error

      const matrix: Record<string, Record<string, number>> = {}
      for (const row of data) {
        if (!matrix[row.product_id]) matrix[row.product_id] = {}
        matrix[row.product_id][row.location_id] = row.quantity
      }
      return matrix
    },
  })
}
