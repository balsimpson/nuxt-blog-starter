import type { UserRole } from '#shared/admin-access'

type ActiveAccessUser = {
  _id: string
  email: string
  role: UserRole
  allowedPages: string[]
  status: 'pending' | 'active' | 'disabled'
  clerkUserId?: string
  firstName?: string
  lastName?: string
}

export type AccessSessionState =
  | { status: 'loading' | 'syncing' | 'unauthenticated' }
  | { status: 'active', user: ActiveAccessUser }
  | { status: 'not_invited' | 'disabled' | 'conflict' }
  | { status: 'error', message: string }

export function useAccessSession() {
  return useState<AccessSessionState>('access-session', () => ({
    status: 'loading'
  }))
}
