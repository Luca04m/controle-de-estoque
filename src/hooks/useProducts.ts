import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_PRODUCTS } from '@/lib/mockData'
import type { Product } from '@/types'
import { toast } from 'sonner'

// In-memory store for mock mutations
let _mockProducts = [...MOCK_PRODUCTS]

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      if (IS_MOCK) return _mockProducts.filter((p) => p.active)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return data as Product[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      if (IS_MOCK) return [..._mockProducts]
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      if (IS_MOCK) {
        const newProduct: Product = {
          ...input,
          id: `mock-${crypto.randomUUID()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        _mockProducts = [..._mockProducts, newProduct]
        return newProduct
      }
      const { data, error } = await supabase.from('products').insert([input]).select().single()
      if (error) throw error
      return data as Product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produto criado com sucesso')
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Product> & { id: string }) => {
      if (IS_MOCK) {
        _mockProducts = _mockProducts.map((p) =>
          p.id === id ? { ...p, ...input, updated_at: new Date().toISOString() } : p
        )
        return _mockProducts.find((p) => p.id === id) as Product
      }
      const { data, error } = await supabase
        .from('products')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produto atualizado')
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  })
}

export function useToggleProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (IS_MOCK) {
        _mockProducts = _mockProducts.map((p) =>
          p.id === id ? { ...p, active, updated_at: new Date().toISOString() } : p
        )
        return
      }
      const { error } = await supabase.from('products').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
