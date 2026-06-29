<template>
  <main class="min-h-screen bg-default px-6 pt-32 pb-20 sm:px-8 sm:pt-40">
    <section class="mx-auto max-w-3xl border-y border-default py-12 sm:py-16">
      <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-dimmed">
        Admin access
      </p>
      <h1 class="mt-4 font-serif text-4xl leading-[1.08] tracking-[-0.02em] text-highlighted sm:text-5xl">
        {{ title }}
      </h1>
      <p class="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        {{ message }}
      </p>

      <div class="mt-8 flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          class="rounded-full"
          @click="reload"
        >
          Check access again
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          class="rounded-full"
          @click="signOut"
        >
          Sign out
        </UButton>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const accessSession = useAccessSession()
const clerk = useClerk()

const title = computed(() => {
  if (accessSession.value.status === 'disabled') return 'Access is disabled'
  if (accessSession.value.status === 'conflict') return 'Access needs attention'
  if (accessSession.value.status === 'error') return 'Access could not be checked'
  return 'No invitation found'
})

const message = computed(() => {
  if (accessSession.value.status === 'disabled') {
    return 'Your account is signed in, but an administrator has disabled its access.'
  }
  if (accessSession.value.status === 'conflict') {
    return 'Your signed-in identity could not be matched safely. Ask an administrator to review your user record.'
  }
  if (accessSession.value.status === 'error') {
    return accessSession.value.message
  }
  return 'The verified email on this Clerk account has not been granted access to the admin area.'
})

function reload() {
  window.location.reload()
}

async function signOut() {
  await clerk.value?.signOut({ redirectUrl: '/sign-in' })
}

definePageMeta({
  layout: false,
  ssr: false
})
</script>
