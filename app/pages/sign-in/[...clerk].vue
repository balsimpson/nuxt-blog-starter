<template>
  <div class="flex min-h-screen items-center justify-center bg-default px-4 py-8">
    <SignIn
      path="/sign-in"
      routing="path"
    />
  </div>
</template>

<script setup lang="ts">
const { isLoaded, isSignedIn } = useAuth()

watch(
  [isLoaded, isSignedIn],
  async ([loaded, signedIn]) => {
    if (!loaded || !signedIn) return
    await navigateTo('/admin', { replace: true })
  },
  { immediate: true }
)
</script>
