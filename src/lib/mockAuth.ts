/**
 * Mock auth — usado quando VITE_SUPABASE_URL é placeholder.
 * Remove quando Supabase real estiver configurado.
 */

export const IS_MOCK = import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')

const MOCK_USERS: Record<string, { role: 'operator' | 'manager'; full_name: string }> = {
  'angelo@mrlion.com': { role: 'manager', full_name: 'Angelo' },
  'joao@mrlion.com':   { role: 'manager', full_name: 'João Lamas' },
}
const MOCK_PASSWORD = '1234'
const STORAGE_KEY = 'mock_session'

export type MockSession = {
  email: string
  role: 'operator' | 'manager'
  full_name: string
}

export function mockLogin(email: string, password: string): MockSession | null {
  if (password !== MOCK_PASSWORD) return null
  const user = MOCK_USERS[email.toLowerCase()] ?? { role: 'operator' as const, full_name: email.split('@')[0] }
  const session: MockSession = { email: email.toLowerCase(), ...user }
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
