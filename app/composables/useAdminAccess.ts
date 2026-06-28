import { computed } from 'vue'
import { api } from '~~/convex/_generated/api'
import {
  ADMIN_PAGE_DEFS,
  canAccessAdminPath
} from '../../shared/admin-access'

export function useAdminAccess() {
  const accessSession = useAccessSession()
  const { data: current, isPending, error } = useConvexQuery(
    api.users.current,
    {},
    { server: false }
  )

  const access = computed(() => {
    if (current.value?.kind === 'active') {
      return {
        role: current.value.user.role,
        allowedPages: current.value.user.allowedPages
      }
    }

    if (!current.value && accessSession.value.status === 'active') {
      return {
        role: accessSession.value.user.role,
        allowedPages: accessSession.value.user.allowedPages
      }
    }

    return null
  })

  const canManageUsers = computed(() => access.value?.role === 'admin')
  const canEditContent = computed(() =>
    access.value?.role === 'editor' || access.value?.role === 'admin'
  )
  const visiblePages = computed(() => {
    if (!access.value) return []

    return ADMIN_PAGE_DEFS.filter(page =>
      canAccessAdminPath(access.value!, page.path)
    )
  })

  return {
    current,
    isPending,
    error,
    access,
    canManageUsers,
    canEditContent,
    visiblePages
  }
}
