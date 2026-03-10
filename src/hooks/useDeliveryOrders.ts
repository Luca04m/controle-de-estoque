import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_ORDERS } from '@/lib/mockData'
import { addMockRestockMovements } from '@/hooks/useStockMovements'
import { getMockStockForLocation, updateMockLocationStock } from '@/hooks/useLocationStock'
import { formatOrderNumber } from '@/lib/utils'
import type { DeliveryOrder, OrderItem, StockMovement } from '@/types'
import { toast } from 'sonner'

let _mockOrders = [...MOCK_ORDERS]

export interface UpdateOrderInput {
  id: string
  reference: string | null
  address: string | null
  notes: string | null
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateOrderInput) => {
      if (IS_MOCK) {
        _mockOrders = _mockOrders.map((o) =>
          o.id === input.id
            ? { ...o, reference: input.reference, address: input.address, notes: input.notes }
            : o
        )
        return
      }
      const { error } = await supabase
        .from('delivery_orders')
        .update({ reference: input.reference, address: input.address, notes: input.notes })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      toast.success('Pedido atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (IS_MOCK) {
        _mockOrders = _mockOrders.filter((o) => o.id !== orderId)
        return
      }
      const { error } = await supabase.from('delivery_orders').delete().eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      toast.success('Pedido excluído')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export interface CreateOrderInput {
  items: OrderItem[]
  reference: string | null
  notes: string | null
  address: string | null
  total_value: number | null
  location_id: string
}

export function useDeliveryOrders(status?: string) {
  return useQuery({
    queryKey: ['delivery_orders', status],
    queryFn: async () => {
      if (IS_MOCK) {
        return status
          ? _mockOrders.filter((o) => o.status === status)
          : [..._mockOrders]
      }
      let q = supabase
        .from('delivery_orders')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return data as DeliveryOrder[]
    },
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      if (!user) throw new Error('Usuário não autenticado')

      if (IS_MOCK) {
        // Validate stock at location for all items
        for (const item of input.items) {
          const available = getMockStockForLocation(item.product_id, input.location_id)
          if (available < item.quantity) {
            throw new Error(`Estoque insuficiente para ${item.product_name} nesta loja (disponível: ${available})`)
          }
        }

        // Deduct stock from location
        for (const item of input.items) {
          updateMockLocationStock(item.product_id, input.location_id, -item.quantity)
        }

        const newOrder: DeliveryOrder = {
          id: `mock-ord-${crypto.randomUUID()}`,
          items: input.items,
          status: 'confirmed',
          user_id: user.id,
          location_id: input.location_id,
          reference: input.reference,
          notes: input.notes,
          address: input.address,
          total_value: input.total_value,
          delivered_by: null,
          delivered_at: null,
          created_at: new Date().toISOString(),
          profile: { full_name: 'Você' },
        }
        _mockOrders = [newOrder, ..._mockOrders]
        return newOrder
      }

      // Validate stock at location for all items
      for (const item of input.items) {
        const { data: locStock } = await supabase
          .from('location_stock')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('location_id', input.location_id)
          .single()

        if (!locStock || locStock.quantity < item.quantity) {
          throw new Error(
            `Estoque insuficiente para ${item.product_name} nesta loja (disponível: ${locStock?.quantity ?? 0})`
          )
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('delivery_orders')
        .insert([{
          items: input.items,
          status: 'confirmed' as const,
          user_id: user.id,
          location_id: input.location_id,
          reference: input.reference,
          notes: input.notes,
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Register stock movements for each item
      const movements = input.items.map((item) => ({
        product_id: item.product_id,
        action: 'out' as const,
        quantity: item.quantity,
        order_id: order.id,
        location_id: input.location_id,
        user_id: user.id,
        notes: `Pedido ${input.reference ?? order.id}`,
      }))

      const { error: mvError } = await supabase.from('stock_movements').insert(movements)
      if (mvError) throw mvError

      // Update stock for each product at location
      for (const item of input.items) {
        await supabase.rpc('update_stock', {
          p_product_id: item.product_id,
          p_delta: -item.quantity,
          p_location_id: input.location_id,
        })
      }

      return order as DeliveryOrder
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
      qc.invalidateQueries({ queryKey: ['location_stock'] })
      qc.invalidateQueries({ queryKey: ['stock_matrix'] })
      toast.success('Pedido confirmado e estoque atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'delivered' }) => {
      if (IS_MOCK) {
        _mockOrders = _mockOrders.map((o) =>
          o.id === id ? { ...o, status, delivered_at: new Date().toISOString(), delivered_by: 'Você' } : o
        )
        return
      }
      const { error } = await supabase.from('delivery_orders').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      toast.success('Status atualizado')
    },
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ orderId, order }: { orderId: string; order: DeliveryOrder }) => {
      const orderNumber = formatOrderNumber(orderId)

      if (IS_MOCK) {
        // Update order status
        _mockOrders = _mockOrders.map((o) =>
          o.id === orderId ? { ...o, status: 'cancelled' as const } : o
        )
        // Restore stock at the original location
        const locationId = order.location_id ?? 'loc-degusto-tijuca'
        for (const item of order.items as OrderItem[]) {
          updateMockLocationStock(item.product_id, locationId, item.quantity)
        }
        // Create restock movements for each item
        const restockMovements: StockMovement[] = (order.items as OrderItem[]).map((item) => ({
          id: `mock-restock-${crypto.randomUUID()}`,
          product_id: item.product_id,
          action: 'in' as const,
          quantity: item.quantity,
          notes: `Devolução por cancelamento do pedido ${orderNumber}`,
          order_id: orderId,
          location_id: locationId,
          user_id: user?.id ?? 'mock-user',
          created_at: new Date().toISOString(),
          product: { name: item.product_name, sku: '' },
          profile: { full_name: 'Sistema' },
        }))
        addMockRestockMovements(restockMovements)
        return { restocked: order.items.length }
      }

      // Supabase: run atomically using a transaction-like approach
      // 1. Update order status
      const { error: orderError } = await supabase
        .from('delivery_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
      if (orderError) throw orderError

      // 2. Create restock movements + update stock for each item
      const items = order.items as OrderItem[]
      const results = await Promise.allSettled(
        items.map(async (item) => {
          const { error: mvError } = await supabase.from('stock_movements').insert([{
            product_id: item.product_id,
            action: 'in',
            quantity: item.quantity,
            notes: `Devolução por cancelamento do pedido ${orderNumber}`,
            order_id: orderId,
            user_id: user?.id,
            created_at: new Date().toISOString(),
          }])
          if (mvError) throw mvError

          const { error: stockError } = await supabase.rpc('update_stock', {
            p_product_id: item.product_id,
            p_delta: item.quantity,
          })
          if (stockError) throw stockError
        })
      )

      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} item(ns) não puderam ser revertidos ao estoque`)

      return { restocked: items.length }
    },
    onSuccess: ({ restocked }) => {
      qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
      qc.invalidateQueries({ queryKey: ['movement_trend'] })
      toast.success(`Pedido cancelado. ${restocked} produto${restocked !== 1 ? 's' : ''} devolvido${restocked !== 1 ? 's' : ''} ao estoque.`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
