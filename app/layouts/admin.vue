<script setup lang="ts">
import { computed } from 'vue'
import { useWindowScroll } from '@vueuse/core'
import type { DropdownMenuItem } from '@nuxt/ui'

definePageMeta({
  ssr: false
})

const route = useRoute()
const clerk = useClerk()
const { user } = useUser()
const { access, visiblePages } = useAdminAccess()

const { y } = useWindowScroll()
const isScrolled = computed(() => y.value > 20)

const navItems = computed(() =>
  visiblePages.value.map(page => ({
    label: page.label,
    to: page.path,
    active: route.path === page.path
  }))
)

const currentPage = computed(() =>
  visiblePages.value.find(page => page.path === route.path) || visiblePages.value[0]
)

const userLabel = computed(() =>
  user.value?.fullName
  || user.value?.primaryEmailAddress?.emailAddress
  || 'Signed in'
)

const userAvatar = computed(() => ({
  src: user.value?.imageUrl,
  alt: user.value?.fullName || 'Account',
  loading: 'lazy' as const
}))

const roleLabel = computed(() => {
  const role = access.value?.role
  if (!role) return undefined
  return role.charAt(0).toUpperCase() + role.slice(1)
})

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    onSelect: () => signOut()
  }]
])

async function signOut() {
  await clerk.value?.signOut({ redirectUrl: '/sign-in' })
}
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header
      :class="[
        'fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
        isScrolled
          ? 'border-default bg-default/80 py-4 backdrop-blur-xl'
          : 'border-transparent bg-transparent py-5'
      ]"
    >
      <div class="mx-auto flex max-w-5xl flex-col gap-4 px-6 sm:px-8">
        <div class="flex items-start justify-between gap-6">
          <NuxtLink
            to="/admin"
            class="flex items-center gap-3"
          >
            <img
              src="/bloggr-logo.png"
              class="h-7 w-auto shrink-0"
              alt="Bloggr"
            >
            <div class="min-w-0">
              <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-dimmed">
                Admin area
              </p>
              <h1 class="font-serif text-lg tracking-tight text-highlighted">
                {{ currentPage?.label || 'Dashboard' }}
              </h1>
            </div>
          </NuxtLink>

          <div class="flex items-center gap-2 sm:gap-3">
            <span
              v-if="roleLabel"
              class="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-dimmed sm:inline"
            >
              {{ roleLabel }}
            </span>

            <UDropdownMenu
              :items="userMenuItems"
              :content="{ align: 'end' }"
            >
              <UButton
                :avatar="userAvatar"
                :label="userLabel"
                trailing-icon="i-lucide-chevrons-up-down"
                color="neutral"
                variant="ghost"
                class="rounded-full"
              />
            </UDropdownMenu>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3">
          <nav class="flex flex-wrap gap-x-5 gap-y-2">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="font-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
              :class="item.active ? 'text-highlighted' : 'text-dimmed hover:text-highlighted'"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>

          <NuxtLink
            to="/"
            target="_blank"
            class="font-mono text-[11px] uppercase tracking-[0.16em] text-dimmed transition-colors hover:text-highlighted"
          >
            View journal
          </NuxtLink>
        </div>
      </div>
    </header>

    <UMain class="relative pt-32 sm:pt-40">
      <div class="mx-auto max-w-5xl px-6 pb-16 sm:px-8">
        <slot />
      </div>
    </UMain>
  </div>
</template>
