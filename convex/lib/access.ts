import { v } from 'convex/values'
import type { UserRole } from '../../shared/admin-access'

export {
  canAccessAdminPath,
  getAdminLandingPath,
  getAllowedPages,
  isUserRole,
  normalizeEmail,
  USER_ROLES
} from '../../shared/admin-access'
export type { UserRole } from '../../shared/admin-access'

export const roleValidator = v.union(
  v.literal('viewer'),
  v.literal('editor'),
  v.literal('admin')
)

export const userStatusValidator = v.union(
  v.literal('pending'),
  v.literal('active'),
  v.literal('disabled')
)

export function canEditContent(role: UserRole) {
  return role === 'editor' || role === 'admin'
}
