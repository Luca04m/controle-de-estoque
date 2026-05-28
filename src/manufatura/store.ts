// Estado reativo da plataforma (mock-first, persistido no navegador).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ITENS, ORDENS } from './mock'
import type { Item, OrdemProducao, TipoMovimento } from './types'

interface EstoqueState {
  itens: Item[]
  ordens: OrdemProducao[]
  /** define o saldo absoluto de um item. */
  setEstoque: (id: string, valor: number) => void
  /** aplica um delta (+/−) — entrada, saída, perda, ajuste. */
  ajustar: (id: string, delta: number, _tipo?: TipoMovimento) => void
  resetar: () => void
}

export const useEstoque = create<EstoqueState>()(
  persist(
    (set) => ({
      itens: ITENS.map(i => ({ ...i })),
      ordens: ORDENS.map(o => ({ ...o })),
      setEstoque: (id, valor) =>
        set((s) => ({
          itens: s.itens.map(i => i.id === id ? { ...i, estoque: Math.max(0, valor) } : i),
        })),
      ajustar: (id, delta) =>
        set((s) => ({
          itens: s.itens.map(i => i.id === id ? { ...i, estoque: Math.max(0, +(i.estoque + delta).toFixed(3)) } : i),
        })),
      resetar: () => set({ itens: ITENS.map(i => ({ ...i })), ordens: ORDENS.map(o => ({ ...o })) }),
    }),
    {
      name: 'mrlion-estoque-v2',
      partialize: (s) => ({ itens: s.itens.map(i => ({ id: i.id, estoque: i.estoque })) }),
      merge: (persisted, current) => {
        const saved = (persisted as { itens?: { id: string; estoque: number }[] })?.itens ?? []
        const byId = new Map(saved.map(p => [p.id, p.estoque]))
        return {
          ...current,
          itens: current.itens.map(i => byId.has(i.id) ? { ...i, estoque: byId.get(i.id)! } : i),
        }
      },
    },
  ),
)
