<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

definePageMeta({
  ssr: false
})

const route = useRoute()
const clerk = useClerk()
const { user } = useUser()
const { access, visiblePages } = useAdminAccess()

const pageIcons: Record<string, string> = {
  '/admin': 'i-lucide-file-text',
  '/admin/editor': 'i-lucide-pencil',
  '/admin/users': 'i-lucide-users'
}

const navItems = computed<NavigationMenuItem[]>(() =>
  visiblePages.value.map(page => ({
    label: page.label,
    icon: pageIcons[page.path] ?? 'i-lucide-circle',
    to: page.path,
    active: route.path === page.path
  }))
)

const secondaryItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'View journal',
    icon: 'i-lucide-external-link',
    to: '/blog',
    target: '_blank'
  } satisfies NavigationMenuItem
])

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
  <UDashboardGroup storage="cookie" storage-key="bloggr-admin-sidebar">
    <UDashboardSidebar
      collapsible
      resizable
      :min-size="16"
      :default-size="18"
      :max-size="26"
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2.5"
        >
          <img
            src="/bloggr-logo.png"
            class="h-7 w-auto shrink-0"
            alt="Bloggr"
          >
          <span
            v-if="!collapsed"
            class="font-serif text-lg tracking-tight text-highlighted"
          >
            Admin
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Sign out'"
          icon="i-lucide-log-out"
          color="neutral"
          variant="outline"
          block
          :square="collapsed"
          class="lg:hidden"
          @click="signOut"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems"
          orientation="vertical"
          tooltip
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="secondaryItems"
          orientation="vertical"
          class="mt-auto"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          v-if="!collapsed"
          :items="userMenuItems"
          :content="{ align: 'start' }"
          class="w-full"
        >
          <UButton
            :avatar="userAvatar"
            :label="userLabel"
            :trailing-icon="roleLabel ? undefined : 'i-lucide-chevrons-up-down'"
            color="neutral"
            variant="ghost"
            class="w-full"
          >
            <template v-if="roleLabel" #trailing>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ roleLabel }}
              </UBadge>
            </template>
          </UButton>
        </UDropdownMenu>

        <UButton
          v-else
          :avatar="userAvatar"
          color="neutral"
          variant="ghost"
          block
          @click="signOut"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="admin">
      <template #header>
        <UDashboardNavbar :ui="{ root: 'lg:hidden' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #title>
            <NuxtLink
              to="/admin"
              class="flex items-center gap-2"
            >
              <img
                src="/bloggr-logo.png"
                class="h-6 w-auto"
                alt="Bloggr"
              >
              <span class="font-serif text-base tracking-tight">Admin</span>
            </NuxtLink>
          </template>

          <template #right>
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              aria-label="Sign out"
              @click="signOut"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
