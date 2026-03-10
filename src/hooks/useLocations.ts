import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IS_MOCK } from '@/lib/mockAuth'
import { MOCK_LOCATIONS } from '@/lib/mockData'
import type { Location, LocationType } from '@/types'
import { toast } from 'sonner'

let _mockLocations = [...MOCK_LOCATIONS]

export function useLocations(activeOnly = true) {
  return useQuery({
    queryKey: ['locations', activeOnly],
    queryFn: async () => {
      if (IS_MOCK) {
        return activeOnly ? _mockLocations.filter((l) => l.active) : [..._mockLocations]
      }
      let q = supabase.from('locations').select('*').order('name')
      if (activeOnly) q = q.eq('active', true)
      const { data, error } = await q
      if (error) throw error
      return data as Location[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export interface CreateLocationInput {
  name: string
  type: LocationType
  address?: string | null
  city?: string | null
  state?: string | null
  contact_name?: string | null
  contact_phone?: string | null
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateLocationInput) => {
      if (IS_MOCK) {
        const newLoc: Location = {
          ...input,
          id: `mock-loc-${crypto.randomUUID()}`,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          contact_name: input.contact_name ?? null,
          contact_phone: input.contact_phone ?? null,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        _mockLocations = [..._mockLocations, newLoc]
        return newLoc
      }
      const { data, error } = await supabase.from('locations').insert([input]).select().single()
      if (error) throw error
      return data as Location
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Local criado com sucesso')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Location> & { id: string }) => {
      if (IS_MOCK) {
        _mockLocations = _mockLocations.map((l) =>
          l.id === id ? { ...l, ...input, updated_at: new Date().toISOString() } : l
        )
        return _mockLocations.find((l) => l.id === id) as Location
      }
      const { data, error } = await supabase
        .from('locations')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Location
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Local atualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useToggleLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (IS_MOCK) {
        _mockLocations = _mockLocations.map((l) =>
          l.id === id ? { ...l, active, updated_at: new Date().toISOString() } : l
        )
        return
      }
      const { error } = await supabase.from('locations').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}
