<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">


        <header class="flex flex-col gap-4 rounded-3xl border border-default bg-muted/30 p-5 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1.5">
        <p class="text-[11px] font-medium uppercase tracking-[0.22em] text-dimmed">
          Admin area
        </p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          Welcome back
        </h1>
        <p class="max-w-xl text-sm text-muted">
          Review the journal, manage access, and keep publishing work moving.
        </p>
      </div>

      <div class="flex shrink-0 gap-2">
        <UButton
          v-if="canManageUsers"
          to="/admin/users"
          color="neutral"
          variant="soft"
          icon="i-lucide-users"
        >
          Users
        </UButton>
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-log-out"
          @click="handleLogout"
        >
          Sign out
        </UButton>
      </div>
    </header>


    <section class="border-y border-default py-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-medium text-muted">
            Journal admin
          </p>
          <h2 class="font-serif text-2xl tracking-tight text-highlighted">
            Entries
          </h2>
          <p class="mt-1 text-sm text-muted">
            Browse saved entries or open the editor to create and update content.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="canEditContent"
            to="/admin/generate"
            color="neutral"
            variant="soft"
            icon="i-lucide-sparkles"
          >
            Research + Generate
          </UButton>
          <UButton
            v-if="canEditContent"
            to="/admin/research-demo"
            color="neutral"
            variant="soft"
            icon="i-lucide-search"
          >
            Web Search Demo
          </UButton>
          <UButton
            v-if="canEditContent"
            to="/admin/editor"
            color="primary"
            icon="i-lucide-plus"
          >
            Add entry
          </UButton>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-3 divide-x divide-default border-y border-default">
        <div class="py-4 pr-4">
          <p class="text-sm text-muted">
            Total entries
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ stats.total }}
          </p>
        </div>
        <div class="px-4 py-4">
          <p class="text-sm text-muted">
            Drafts
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ stats.drafts }}
          </p>
        </div>
        <div class="py-4 pl-4">
          <p class="text-sm text-muted">
            Published
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ stats.published }}
          </p>
        </div>
      </div>
    </section>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold">
              Entry management
            </h2>
            <p class="text-sm text-muted">
              Manage published entries and drafts.
            </p>
          </div>
          <UTabs
            v-model="selectedTab"
            :items="items"
            class="w-full sm:w-auto"
          />
        </div>
      </template>

      <div
        v-if="filteredPosts.length"
        class="divide-y divide-default"
      >
        <NuxtLink
          v-for="post in filteredPosts"
          :key="post._id"
          :to="canEditContent ? `/admin/editor?id=${post._id}` : undefined"
          class="flex items-center justify-between gap-4 px-1 py-4 transition hover:opacity-80"
        >
          <div class="min-w-0 text-left">
            <div class="flex items-center gap-2">
              <p class="truncate font-medium text-highlighted">{{ post.title || post.slug }}</p>
              <UBadge
                :color="postStatusColor(post)"
                variant="soft"
                size="sm"
                class="capitalize"
              >
                {{ postStatus(post) }}
              </UBadge>
            </div>
            <p class="mt-1 truncate text-sm text-muted">/{{ post.slug }}</p>

            <div class="text-xs text-muted pt-2">
              <p>{{ postDisplayDate(post).date }} {{ postDisplayDate(post).time }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">

            <div class="flex items-center gap-1 border-l border-muted pl-3">
              <UButton
                v-if="canEditContent"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                @click.prevent
              />
              <UButton
                v-if="canEditContent"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click.stop.prevent="onDeletePost(post._id)"
              />
            </div>
          </div>
        </NuxtLink>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted"
      >
        <UIcon
          name="i-lucide-file-text"
          class="size-10"
        />
        <p class="text-sm">
          No {{ selectedTab === 'all' ? 'entries' : selectedTab + ' entries' }} found.
        </p>
        <UButton
          v-if="selectedTab === 'all' && canEditContent"
          to="/admin/editor"
          color="primary"
          icon="i-lucide-plus"
          class="mt-2"
        >
          Add your first entry
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '~~/convex/_generated/api'

type Post = {
  _id: string
  slug: string
  title?: string
  contentType: string
  publishStatus?: string
  publishedAt?: number
  createdAt: number
  updatedAt: number
}

const { data: posts } = useConvexQuery(
  api.posts.list,
  {},
  { server: false }
)
const { mutate: removePost } = useConvexMutation(api.posts.remove)
const { canEditContent, canManageUsers } = useAdminAccess()
const clerk = useClerk()

async function onDeletePost(id: string) {
  if (confirm('Are you sure you want to delete this post?')) {
    await removePost({ id: id as any })
  }
}

const items = [
  { label: 'All', icon: 'i-lucide-list', value: 'all' },
  { label: 'Published', icon: 'i-lucide-check-circle', value: 'published' },
  { label: 'Drafts', icon: 'i-lucide-file-text', value: 'draft' }
]

const selectedTab = ref('all')

const isDraft = (post: Post) => (post.publishStatus || post.contentType) === 'draft'
const isPublished = (post: Post) => !isDraft(post)

const filteredPosts = computed(() => {
  const list = posts.value || []
  const sorted = [...list].sort((a: Post, b: Post) => b.updatedAt - a.updatedAt)

  if (selectedTab.value === 'published') {
    return sorted.filter(isPublished)
  }
  if (selectedTab.value === 'draft') {
    return sorted.filter(isDraft)
  }
  return sorted
})

const stats = computed(() => {
  const list = posts.value || []

  return {
    total: list.length,
    drafts: list.filter(isDraft).length,
    published: list.filter(isPublished).length
  }
})

const handleLogout = async () => {
  if (!confirm('Are you sure you want to log out?')) return
  await clerk.value?.signOut({ redirectUrl: '/sign-in' })
}

const postStatus = (post: Post) => isDraft(post) ? 'Draft' : 'Published'

const postStatusColor = (post: Post) => isPublished(post) ? 'primary' : 'neutral'

const postDisplayDate = (post: Post) => {
  const date = post.publishedAt || post.updatedAt
  return {
    date: new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    time: new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

definePageMeta({
  layout: false,
  ssr: false
})
</script>
