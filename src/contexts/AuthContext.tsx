import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { IS_MOCK, mockGetSession } from '@/lib/mockAuth'
import type { Profile } from '@/types'

const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) setProfile(data as Profile)
  }, [setProfile])

  useEffect(() => {
    // Mock mode — no Supabase
    if (IS_MOCK) {
      const session = mockGetSession()
      if (session) {
        setUser({ id: 'mock', email: session.email } as never)
        setProfile({
          id: 'mock',
          user_id: 'mock',
          role: session.role,
          full_name: session.full_name,
          location_id: null,
        } as Profile)
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading, fetchProfile])

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  useContext(AuthContext)
  return useAuthStore()
}
