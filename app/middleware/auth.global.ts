import { watch } from 'vue'

const isProtectedRoute = createRouteMatcher(['/admin(.*)'])
const isSignInRoute = createRouteMatcher(['/sign-in(.*)'])

export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoaded, isSignedIn } = useAuth()

  if (import.meta.client && !isLoaded.value) {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(() => {
        stop()
        resolve()
      }, 10000)

      const stop = watch(isLoaded, (loaded) => {
        if (!loaded) return
        window.clearTimeout(timeout)
        stop()
        resolve()
      })
    })
  }

  if (!isSignedIn.value && isProtectedRoute(to)) {
    return navigateTo('/sign-in')
  } else if (isSignedIn.value && isSignInRoute(to)) {
    return navigateTo('/admin')
  }
})
