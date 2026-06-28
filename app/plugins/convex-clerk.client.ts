import { watch } from 'vue'
import { api } from '~~/convex/_generated/api'

export default defineNuxtPlugin(() => {
  const convex = useConvexClient()
  const auth = useAuth()
  const accessSession = useAccessSession()
  let authConfigured = false
  let syncPromise: Promise<void> | null = null

  async function reconcileAccess() {
    if (syncPromise) return await syncPromise

    syncPromise = (async () => {
      accessSession.value = { status: 'syncing' }

      try {
        const result = await convex.action(api.usersSync.syncCurrentUser, {})

        if (result.kind !== 'active') {
          accessSession.value = {
            status: result.kind === 'unlinked' ? 'not_invited' : result.kind
          }
          return
        }

        const current = await convex.query(api.users.current, {})

        if (current.kind === 'active') {
          accessSession.value = {
            status: 'active',
            user: current.user
          }
          return
        }

        accessSession.value = {
          status: current.kind === 'unlinked' ? 'not_invited' : current.kind
        }
      } catch (error) {
        accessSession.value = {
          status: 'error',
          message: error instanceof Error
            ? error.message
            : 'Access could not be checked.'
        }
      } finally {
        syncPromise = null
      }
    })()

    await syncPromise
  }

  watch(
    [auth.isLoaded, auth.isSignedIn],
    ([isLoaded, isSignedIn]) => {
      if (!isLoaded) return

      if (!isSignedIn) {
        authConfigured = false
        convex.setAuth(async () => null)
        accessSession.value = { status: 'unauthenticated' }
        return
      }

      if (authConfigured) return
      authConfigured = true
      accessSession.value = { status: 'loading' }

      convex.setAuth(
        async () => await auth.getToken.value({
          template: 'convex',
          skipCache: true
        }),
        (isAuthenticated) => {
          if (isAuthenticated) {
            void reconcileAccess()
          }
        }
      )
    },
    { immediate: true }
  )
})
