import { watch } from 'vue'
import { api } from '~~/convex/_generated/api'

export default defineNuxtPlugin(() => {
  const convex = useConvexClient()
  const auth = useAuth()
  const accessSession = useAccessSession()
  let configuredUserId: string | null = null
  let syncingUserId: string | null = null
  let latestSyncGeneration = 0
  let syncPromise: Promise<void> | null = null

  async function reconcileAccess(userId: string) {
    if (syncPromise && syncingUserId === userId) return await syncPromise

    const syncGeneration = ++latestSyncGeneration
    const currentSync = (async () => {
      if (configuredUserId !== userId) return
      accessSession.value = { status: 'syncing' }

      try {
        const result = await convex.action(api.usersSync.syncCurrentUser, {})
        if (configuredUserId !== userId) return

        if (result.kind !== 'active') {
          accessSession.value = {
            status: result.kind === 'unlinked' ? 'not_invited' : result.kind
          }
          return
        }

        const current = await convex.query(api.users.current, {})
        if (configuredUserId !== userId) return

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
        if (configuredUserId !== userId) return

        accessSession.value = {
          status: 'error',
          message: error instanceof Error
            ? error.message
            : 'Access could not be checked.'
        }
      } finally {
        if (latestSyncGeneration === syncGeneration) {
          syncPromise = null
          syncingUserId = null
        }
      }
    })()

    syncingUserId = userId
    syncPromise = currentSync
    await currentSync
  }

  watch(
    [auth.isLoaded, auth.isSignedIn, auth.userId],
    ([isLoaded, isSignedIn, userId]) => {
      if (!isLoaded) return

      if (!isSignedIn || !userId) {
        configuredUserId = null
        convex.setAuth(async () => null)
        accessSession.value = { status: 'unauthenticated' }
        return
      }

      if (configuredUserId === userId) return
      configuredUserId = userId
      accessSession.value = { status: 'loading' }

      convex.setAuth(
        async () => await auth.getToken.value({
          template: 'convex',
          skipCache: true
        }),
        (isAuthenticated) => {
          if (isAuthenticated && configuredUserId === userId) {
            void reconcileAccess(userId)
          }
        }
      )
    },
    { immediate: true }
  )
})
