import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_ORDERS } from '@/lib/mockData'
import type { DeliveryOrder, OrderItem } from '@/types'
import { toast } from 'sonner'

let _mockOrders = [...MOCK_ORDERS]

export interface CreateOrderInput {
  items: OrderItem[]
  reference: string | null
  notes: string | null
  address: string | null
  total_value: number | null
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
        const newOrder: DeliveryOrder = {
          id: `mock-ord-${crypto.randomUUID()}`,
          items: input.items,
          status: 'confirmed',
          user_id: user.id,
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

      // Validate stock for all items
      for (const item of input.items) {
        const { data: product } = await supabase
          .from('products')
          .select('current_stock, name')
          .eq('id', item.product_id)
          .single()

        if (!product || product.current_stock < item.quantity) {
          throw new Error(
            `Estoque insuficiente para ${item.product_name}. Disponível: ${product?.current_stock ?? 0}`
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
        user_id: user.id,
        notes: `Pedido ${input.reference ?? order.id}`,
      }))

      const { error: mvError } = await supabase.from('stock_movements').insert(movements)
      if (mvError) throw mvError

      // Update stock for each product
      for (const item of input.items) {
        await supabase.rpc('update_stock', {
          p_product_id: item.product_id,
          p_delta: -item.quantity,
        })
      }

      return order as DeliveryOrder
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery_orders'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
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
