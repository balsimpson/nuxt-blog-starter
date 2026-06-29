export const USER_ROLES = ['viewer', 'editor', 'admin'] as const

export type UserRole = typeof USER_ROLES[number]

export const ADMIN_PAGE_DEFS = [
  {
    label: 'Posts',
    path: '/admin',
    roles: ['viewer', 'editor', 'admin'] as UserRole[]
  },
  {
    label: 'Editor',
    path: '/admin/editor',
    roles: ['editor', 'admin'] as UserRole[]
  },
  {
    label: 'Users',
    path: '/admin/users',
    roles: ['admin'] as UserRole[]
  }
] as const

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string'
    && USER_ROLES.includes(value as UserRole)
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getAllowedPages(role: UserRole) {
  return ADMIN_PAGE_DEFS
    .filter(page => page.roles.includes(role))
    .map(page => page.path)
}

export function canAccessAdminPath(
  access: { role: UserRole, allowedPages: string[] },
  path: string
) {
  if (path === '/admin/access') return true

  return access.allowedPages.some((allowedPath) => {
    if (allowedPath === '/admin') return path === '/admin'
    return path === allowedPath || path.startsWith(`${allowedPath}/`)
  })
}

export function getAdminLandingPath(
  access: { role: UserRole, allowedPages: string[] }
) {
  return access.allowedPages[0] || '/admin/access'
}
