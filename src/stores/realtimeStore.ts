import { create } from 'zustand'

interface RealtimeState {
  connected: boolean
  lastSyncAt: Date | null
  pendingCount: number
  setConnected: (connected: boolean) => void
  setLastSyncAt: (date: Date) => void
  setPendingCount: (count: number) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  lastSyncAt: null,
  pendingCount: 0,
  setConnected: (connected) => set({ connected }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}))
