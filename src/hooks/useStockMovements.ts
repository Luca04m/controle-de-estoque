import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { saveLocalMovement } from '@/lib/db'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_MOVEMENTS, MOCK_LOCATIONS } from '@/lib/mockData'
import { updateMockLocationStock, getMockStockForLocation } from '@/hooks/useLocationStock'
import type { StockMovement, MovementAction } from '@/types'
import { toast } from 'sonner'

export interface TrendDataPoint {
  date: string   // 'dd/MM'
  in: number
  out: number
}

let _mockMovements = [...MOCK_MOVEMENTS]

/** Add restock movements to the mock store (used by useCancelOrder) */
export function addMockRestockMovements(movements: StockMovement[]): void {
  _mockMovements = [...movements, ..._mockMovements]
}

export interface MovementInput {
  product_id: string
  action: MovementAction
  quantity: number
  notes: string
  order_id?: string | null
  location_id: string
}

function enrichMockLocation(m: StockMovement): StockMovement {
  if (m.location || !m.location_id) return m
  const loc = MOCK_LOCATIONS.find(l => l.id === m.location_id)
  return loc ? { ...m, location: { name: loc.name } } : m
}

export function useStockMovements(filters?: { product_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ['stock_movements', filters],
    queryFn: async () => {
      if (IS_MOCK) {
        let result = [..._mockMovements]
        if (filters?.product_id) result = result.filter((m) => m.product_id === filters.product_id)
        if (filters?.limit) result = result.slice(0, filters.limit)
        return result.map(enrichMockLocation)
      }
      let q = supabase
        .from('stock_movements')
        .select('*, products(name, sku), profiles(full_name), locations(name)')
        .order('created_at', { ascending: false })
      if (filters?.product_id) q = q.eq('product_id', filters.product_id)
      if (filters?.limit) q = q.limit(filters.limit)
      const { data, error } = await q
      if (error) throw error
      return data as StockMovement[]
    },
  })
}

export function useProductMovements(productId: string | null, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['product_movements', productId, limit, offset],
    enabled: productId !== null,
    queryFn: async () => {
      if (!productId) return { data: [], count: 0 }

      if (IS_MOCK) {
        const all = _mockMovements.filter((m) => m.product_id === productId)
        return {
          data: all.slice(offset, offset + limit),
          count: all.length,
        }
      }

      const { data, error, count } = await supabase
        .from('stock_movements')
        .select('*, profiles(full_name)', { count: 'exact' })
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return { data: data as StockMovement[], count: count ?? 0 }
    },
  })
}

export function useRegisterMovement() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { connected } = useRealtimeStore()

  return useMutation({
    mutationFn: async (input: MovementInput) => {
      if (!user) throw new Error('Usuário não autenticado')

      if (IS_MOCK) {
        // Validate stock won't go negative for 'out' and 'loss'
        if (input.action === 'out' || input.action === 'loss') {
          const available = getMockStockForLocation(input.product_id, input.location_id)
          if (available < input.quantity) {
            throw new Error(`Estoque insuficiente nesta loja (disponível: ${available})`)
          }
        }

        const delta = input.action === 'in' ? input.quantity
          : input.action === 'adjustment' ? input.quantity
          : -input.quantity
        updateMockLocationStock(input.product_id, input.location_id, delta)

        const newMv: StockMovement = {
          id: `mock-mv-${crypto.randomUUID()}`,
          product_id: input.product_id,
          action: input.action,
          quantity: input.quantity,
          notes: input.notes,
          order_id: input.order_id ?? null,
          location_id: input.location_id,
          user_id: user.id,
          created_at: new Date().toISOString(),
          profile: { full_name: 'Você' },
        }
        _mockMovements = [newMv, ..._mockMovements]
        return newMv
      }

      // Validate stock won't go negative for 'out' and 'loss'
      if (input.action === 'out' || input.action === 'loss') {
        const { data: locStock } = await supabase
          .from('location_stock')
          .select('quantity')
          .eq('product_id', input.product_id)
          .eq('location_id', input.location_id)
          .single()

        if (!locStock || locStock.quantity < input.quantity) {
          throw new Error(
            `Estoque insuficiente nesta loja (disponível: ${locStock?.quantity ?? 0})`
          )
        }
      }

      const movement = {
        product_id: input.product_id,
        action: input.action,
        quantity: input.quantity,
        notes: input.notes,
        order_id: input.order_id ?? null,
        location_id: input.location_id,
        user_id: user.id,
        created_at: new Date().toISOString(),
      }

      if (!connected) {
        const localId = `local-${crypto.randomUUID()}`
        await saveLocalMovement({ ...movement, id: localId, synced: false })
        toast.warning('Salvo offline. Sincronizará ao reconectar.')
        return null
      }

      const { data, error } = await supabase
        .from('stock_movements')
        .insert([movement])
        .select()
        .single()
      if (error) throw error

      // Update location_stock + products.current_stock
      const delta = input.action === 'in' ? input.quantity
        : input.action === 'adjustment' ? input.quantity
        : -input.quantity

      await supabase.rpc('update_stock', {
        p_product_id: input.product_id,
        p_delta: delta,
        p_location_id: input.location_id,
      })

      return data as StockMovement
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['location_stock'] })
      qc.invalidateQueries({ queryKey: ['stock_matrix'] })
      toast.success('Movimentação registrada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAllMovements(filters?: {
  product_id?: string
  action?: MovementAction
  from?: string
  to?: string
  user_id?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['movements_report', filters],
    queryFn: async () => {
      if (IS_MOCK) {
        let result = [..._mockMovements]
        if (filters?.product_id) result = result.filter((m) => m.product_id === filters.product_id)
        if (filters?.action) result = result.filter((m) => m.action === filters.action)
        const offset = filters?.offset ?? 0
        const limit = filters?.limit ?? 50
        const paginated = result.slice(offset, offset + limit).map(enrichMockLocation)
        return { data: paginated, count: result.length }
      }
      let q = supabase
        .from('stock_movements')
        .select('*, products(name, sku), profiles(full_name), locations(name)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters?.product_id) q = q.eq('product_id', filters.product_id)
      if (filters?.action) q = q.eq('action', filters.action)
      if (filters?.user_id) q = q.eq('user_id', filters.user_id)
      if (filters?.from) q = q.gte('created_at', filters.from)
      if (filters?.to) q = q.lte('created_at', filters.to)
      if (filters?.limit) q = q.limit(filters.limit)
      if (filters?.offset) q = q.range(filters.offset, (filters.offset + (filters.limit ?? 50)) - 1)

      const { data, error, count } = await q
      if (error) throw error
      return { data: data as StockMovement[], count: count ?? 0 }
    },
  })
}

// ─── Movement Trend (last N days) ─────────────────────────────────────────────

export function useMovementTrend(days = 30) {
  return useQuery({
    queryKey: ['movement_trend', days],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      const now = Date.now()
      const msPerDay = 24 * 60 * 60 * 1000

      let movements: StockMovement[]

      if (IS_MOCK) {
        movements = [..._mockMovements].filter(m => {
          const age = (now - new Date(m.created_at).getTime()) / msPerDay
          return age <= days
        })
      } else {
        const from = new Date(now - days * msPerDay).toISOString()
        const { data, error } = await supabase
          .from('stock_movements')
          .select('action, quantity, created_at')
          .gte('created_at', from)
          .order('created_at', { ascending: true })
        if (error) throw error
        movements = data as StockMovement[]
      }

      // Build a map: dateKey → { in, out }
      const map = new Map<string, { in: number; out: number }>()

      // Pre-fill all days with zeros (so chart has continuous x-axis)
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * msPerDay)
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        if (!map.has(key)) map.set(key, { in: 0, out: 0 })
      }

      for (const m of movements) {
        const d = new Date(m.created_at)
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        const entry = map.get(key) ?? { in: 0, out: 0 }
        if (m.action === 'in') entry.in += m.quantity
        else if (m.action === 'out' || m.action === 'loss') entry.out += Math.abs(m.quantity)
        map.set(key, entry)
      }

      return Array.from(map.entries()).map(([date, vals]) => ({
        date,
        in: vals.in,
        out: vals.out,
      }))
    },
  })
}

// ─── Batch Movements ──────────────────────────────────────────────────────────

export interface BatchMovementInput {
  id: string
  product_id: string
  quantity: number
  notes: string
  location_id: string
}

export function useRegisterBatchMovements() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { connected } = useRealtimeStore()

  return useMutation({
    mutationFn: async (items: BatchMovementInput[]) => {
      if (!user) throw new Error('Usuário não autenticado')

      if (IS_MOCK) {
        const newMovements: StockMovement[] = items.map(item => ({
          id: `mock-mv-${crypto.randomUUID()}`,
          product_id: item.product_id,
          action: 'in' as MovementAction,
          quantity: item.quantity,
          notes: item.notes,
          order_id: null,
          location_id: item.location_id,
          user_id: user.id,
          created_at: new Date().toISOString(),
          profile: { full_name: 'Você' },
        }))
        for (const item of items) {
          updateMockLocationStock(item.product_id, item.location_id, item.quantity)
        }
        _mockMovements = [...newMovements, ..._mockMovements]
        return { succeeded: items.length, failed: 0 }
      }

      const results = await Promise.allSettled(
        items.map(async (item) => {
          const movement = {
            product_id: item.product_id,
            action: 'in' as MovementAction,
            quantity: item.quantity,
            notes: item.notes,
            order_id: null,
            location_id: item.location_id,
            user_id: user.id,
            created_at: new Date().toISOString(),
          }

          if (!connected) {
            const localId = `local-${crypto.randomUUID()}`
            await saveLocalMovement({ ...movement, id: localId, synced: false })
            return null
          }

          const { data, error } = await supabase
            .from('stock_movements')
            .insert([movement])
            .select()
            .single()
          if (error) throw error

          await supabase.rpc('update_stock', {
            p_product_id: item.product_id,
            p_delta: item.quantity,
            p_location_id: item.location_id,
          })

          return data
        })
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0 && succeeded === 0) throw new Error(`Todas as ${failed} entradas falharam`)
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      if (failed > 0) {
        toast.warning(`${succeeded} entradas registradas. ${failed} falharam.`)
      } else {
        toast.success(`${succeeded} entradas registradas com sucesso!`)
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
