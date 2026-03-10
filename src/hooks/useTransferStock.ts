import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IS_MOCK } from '@/lib/mockAuth'
import { useAuthStore } from '@/stores/authStore'
import { getMockStockForLocation, updateMockLocationStock } from '@/hooks/useLocationStock'
import { addMockRestockMovements } from '@/hooks/useStockMovements'
import { MOCK_LOCATIONS } from '@/lib/mockData'
import type { StockMovement } from '@/types'
import { toast } from 'sonner'

export interface TransferInput {
  from_location_id: string
  to_location_id: string
  product_id: string
  quantity: number
  notes?: string
}

export function useTransferStock() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (input: TransferInput) => {
      if (!user) throw new Error('Usuário não autenticado')

      if (input.from_location_id === input.to_location_id) {
        throw new Error('Origem e destino devem ser diferentes')
      }

      if (IS_MOCK) {
        const available = getMockStockForLocation(input.product_id, input.from_location_id)
        if (available < input.quantity) {
          throw new Error(`Estoque insuficiente na origem (disponível: ${available}, solicitado: ${input.quantity})`)
        }

        updateMockLocationStock(input.product_id, input.from_location_id, -input.quantity)
        updateMockLocationStock(input.product_id, input.to_location_id, input.quantity)

        const fromName = MOCK_LOCATIONS.find((l) => l.id === input.from_location_id)?.name ?? 'Origem'
        const toName = MOCK_LOCATIONS.find((l) => l.id === input.to_location_id)?.name ?? 'Destino'

        const movements: StockMovement[] = [
          {
            id: `mock-tf-out-${crypto.randomUUID()}`,
            product_id: input.product_id,
            action: 'transfer',
            quantity: -input.quantity,
            order_id: null,
            location_id: input.from_location_id,
            user_id: user.id,
            notes: input.notes ?? `Transferência para ${toName}`,
            created_at: new Date().toISOString(),
            profile: { full_name: 'Você' },
          },
          {
            id: `mock-tf-in-${crypto.randomUUID()}`,
            product_id: input.product_id,
            action: 'transfer',
            quantity: input.quantity,
            order_id: null,
            location_id: input.to_location_id,
            user_id: user.id,
            notes: input.notes ?? `Transferência de ${fromName}`,
            created_at: new Date().toISOString(),
            profile: { full_name: 'Você' },
          },
        ]
        addMockRestockMovements(movements)
        return
      }

      const { error } = await supabase.rpc('transfer_stock', {
        p_from_location: input.from_location_id,
        p_to_location: input.to_location_id,
        p_product_id: input.product_id,
        p_quantity: input.quantity,
        p_user_id: user.id,
        p_notes: input.notes ?? null,
      })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location_stock'] })
      qc.invalidateQueries({ queryKey: ['stock_matrix'] })
      qc.invalidateQueries({ queryKey: ['stock_movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Transferência realizada com sucesso!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
