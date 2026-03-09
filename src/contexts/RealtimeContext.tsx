import { useEffect, type ReactNode } from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { IS_MOCK } from '@/lib/mockAuth'
import { useRealtimeStore } from '@/stores/realtimeStore'

function MockRealtimeProvider({ children }: { children: ReactNode }) {
  const { setConnected } = useRealtimeStore()
  useEffect(() => { setConnected(true) }, [setConnected])
  return <>{children}</>
}

function LiveRealtimeProvider({ children }: { children: ReactNode }) {
  useRealtime()
  return <>{children}</>
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  if (IS_MOCK) return <MockRealtimeProvider>{children}</MockRealtimeProvider>
  return <LiveRealtimeProvider>{children}</LiveRealtimeProvider>
}
