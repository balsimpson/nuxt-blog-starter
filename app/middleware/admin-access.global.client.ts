import { watch } from 'vue'
import { api } from '~~/convex/_generated/api'
import {
  canAccessAdminPath,
  getAdminLandingPath
} from '#shared/admin-access'

function waitForClerkAuth(timeoutMs = 10000) {
  const { isLoaded } = useAuth()

  if (isLoaded.value) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      stop()
      resolve()
    }, timeoutMs)

    const stop = watch(isLoaded, (loaded) => {
      if (!loaded) return
      window.clearTimeout(timeout)
      stop()
      resolve()
    })
  })
}

function waitForAccessState(timeoutMs = 15000) {
  const accessSession = useAccessSession()

  if (!['loading', 'syncing'].includes(accessSession.value.status)) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      stop()
      resolve()
    }, timeoutMs)

    const stop = watch(
      () => accessSession.value.status,
      (status) => {
        if (status === 'loading' || status === 'syncing') return
        window.clearTimeout(timeout)
        stop()
        resolve()
      }
    )
  })
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const { isSignedIn, userId } = useAuth()
  await waitForClerkAuth()
  if (!isSignedIn.value || !userId.value) return

  const accessSession = useAccessSession()

  if (
    accessSession.value.status === 'unauthenticated'
    || (
      accessSession.value.status === 'active'
      && accessSession.value.user.clerkUserId !== userId.value
    )
  ) {
    accessSession.value = { status: 'loading' }
  }

  await waitForAccessState()

  if (accessSession.value.status === 'active') {
    try {
      const current = await useConvexClient().query(api.users.current, {})

      if (current.kind === 'active') {
        accessSession.value = { status: 'active', user: current.user }
      } else {
        accessSession.value = {
          status: current.kind === 'unlinked' ? 'not_invited' : current.kind
        }
      }
    } catch (error) {
      accessSession.value = {
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'Access could not be checked.'
      }
    }
  }

  if (to.path === '/admin/access') {
    if (accessSession.value.status === 'active') {
      return navigateTo(getAdminLandingPath(accessSession.value.user))
    }
    return
  }

  if (accessSession.value.status !== 'active') {
    return navigateTo('/admin/access')
  }

  if (!canAccessAdminPath(accessSession.value.user, to.path)) {
    return navigateTo(getAdminLandingPath(accessSession.value.user))
  }
})
