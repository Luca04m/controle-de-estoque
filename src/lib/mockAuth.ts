/**
 * Mock auth — usado quando VITE_SUPABASE_URL é placeholder.
 * Remove quando Supabase real estiver configurado.
 */

export const IS_MOCK = import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')

const MOCK_USERS: Record<string, { role: 'operator' | 'manager'; full_name: string; location_id: string | null }> = {
  'joao': { role: 'manager', full_name: 'João Lamas', location_id: null },
  'angelo': { role: 'operator', full_name: 'Angelo', location_id: 'loc-degusto-barra' },
}
const MOCK_PASSWORD = '1234'
const STORAGE_KEY = 'mock_session'

export type MockSession = {
  username: string
  role: 'operator' | 'manager'
  full_name: string
  location_id: string | null
}

export function mockLogin(username: string, password: string): MockSession | null {
  if (password !== MOCK_PASSWORD) return null
  const user = MOCK_USERS[username.toLowerCase()]
  if (!user) return null
  const session: MockSession = { username: username.toLowerCase(), ...user }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function mockGetSession(): MockSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MockSession) : null
  } catch {
    return null
  }
}

export function mockLogout() {
  localStorage.removeItem(STORAGE_KEY)
}
