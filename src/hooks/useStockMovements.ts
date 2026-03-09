import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { saveLocalMovement } from '@/lib/db'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_MOVEMENTS } from '@/lib/mockData'
import type { StockMovement, MovementAction } from '@/types'
import { toast } from 'sonner'

let _mockMovements = [...MOCK_MOVEMENTS]

export interface MovementInput {
  product_id: string
  action: MovementAction
  quantity: number
  notes: string
  order_id?: string | null
}

export function useStockMovements(filters?: { product_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ['stock_movements', filters],
    queryFn: async () => {
      if (IS_MOCK) {
        let result = [..._mockMovements]
        if (filters?.product_id) result = result.filter((m) => m.product_id === filters.product_id)
        if (filters?.limit) result = result.slice(0, filters.limit)
        return result
      }
      let q = supabase
        .from('stock_movements')
        .select('*, products(name, sku), profiles(full_name)')
        .order('created_at', { ascending: false })
      if (filters?.product_id) q = q.eq('product_id', filters.product_id)
      if (filters?.limit) q = q.limit(filters.limit)
      const { data, error } = await q
      if (error) throw error
      return data as StockMovement[]
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
        const newMv: StockMovement = {
          id: `mock-mv-${crypto.randomUUID()}`,
          product_id: input.product_id,
          action: input.action,
          quantity: input.quantity,
          notes: input.notes,
          order_id: input.order_id ?? null,
          user_id: user.id,
          created_at: new Date().toISOString(),
          profile: { full_name: 'Você' },
        }
        _mockMovements = [newMv, ..._mockMovements]
        return newMv
      }

      // Validate stock won't go negative for 'out' and 'loss'
      if (input.action === 'out' || input.action === 'loss') {
        const { data: product } = await supabase
          .from('products')
          .select('current_stock, name')
          .eq('id', input.product_id)
          .single()

        if (product && product.current_stock < input.quantity) {
          throw new Error(
            `Estoque insuficiente. Disponível: ${product.current_stock} unidades de ${product.name}`
          )
        }
      }

      const movement = {
        product_id: input.product_id,
        action: input.action,
        quantity: input.quantity,
        notes: input.notes,
        order_id: input.order_id ?? null,
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

      // Update current_stock
      const delta = input.action === 'in' ? input.quantity
        : input.action === 'adjustment' ? input.quantity
        : -input.quantity

      await supabase.rpc('update_stock', {
        p_product_id: input.product_id,
        p_delta: delta,
      })

      return data as StockMovement
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
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
        const paginated = result.slice(offset, offset + limit)
        return { data: paginated, count: result.length }
      }
      let q = supabase
        .from('stock_movements')
        .select('*, products(name, sku), profiles(full_name)', { count: 'exact' })
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
