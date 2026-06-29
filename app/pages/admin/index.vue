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
const { canEditContent } = useAdminAccess()

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

const postStatus = (post: Post) => (isDraft(post) ? 'Draft' : 'Published')

const postStatusTone = (post: Post) => (isPublished(post) ? 'text-highlighted' : 'text-dimmed')

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
  layout: 'admin',
  ssr: false
})
</script>

<template>
  <section class="space-y-10">
    <header class="border-b border-default pb-8">
      <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-dimmed">
        Admin area
      </p>

      <div class="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <h1 class="font-serif text-4xl leading-[1.08] tracking-[-0.02em] text-highlighted sm:text-5xl lg:text-6xl">
            Welcome back
          </h1>
          <p class="mt-4 text-[15px] leading-relaxed text-muted">
            Review entries, manage access, and keep publishing work moving.
          </p>
        </div>
      </div>
    </header>

    <section class="border-b border-default py-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-dimmed">
            Journal admin
          </p>
          <h2 class="mt-3 font-serif text-2xl tracking-tight text-highlighted">
            Entries
          </h2>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            Browse saved entries or open the editor to create and update content.
          </p>
        </div>

        <UButton
          v-if="canEditContent"
          to="/admin/editor"
          color="neutral"
          variant="ghost"
          icon="i-lucide-plus"
          class="rounded-full"
        >
          Add entry
        </UButton>
      </div>

      <div class="mt-8 grid grid-cols-1 divide-y divide-default border-y border-default sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div class="py-5 pr-4">
          <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-dimmed">
            Total entries
          </p>
          <p class="mt-3 font-serif text-3xl tracking-tight text-highlighted">
            {{ stats.total }}
          </p>
        </div>
        <div class="py-5 px-4">
          <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-dimmed">
            Drafts
          </p>
          <p class="mt-3 font-serif text-3xl tracking-tight text-highlighted">
            {{ stats.drafts }}
          </p>
        </div>
        <div class="py-5 pl-4">
          <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-dimmed">
            Published
          </p>
          <p class="mt-3 font-serif text-3xl tracking-tight text-highlighted">
            {{ stats.published }}
          </p>
        </div>
      </div>
    </section>

    <section class="border-b border-default py-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-serif text-2xl tracking-tight text-highlighted">
            Entry management
          </h2>
          <p class="mt-2 text-[15px] leading-relaxed text-muted">
            Manage published entries and drafts.
          </p>
        </div>

        <UTabs
          v-model="selectedTab"
          :items="items"
          class="w-full sm:w-auto"
        />
      </div>

      <div
        v-if="filteredPosts.length"
        class="mt-8 divide-y divide-default border-y border-default"
      >
        <div
          v-for="post in filteredPosts"
          :key="post._id"
          class="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p class="truncate font-medium text-highlighted">
                {{ post.title || post.slug }}
              </p>
              <span
                :class="['font-mono text-[11px] uppercase tracking-[0.16em]', postStatusTone(post)]"
              >
                {{ postStatus(post) }}
              </span>
            </div>

            <p class="mt-1 truncate text-sm text-muted">
              /{{ post.slug }}
            </p>

            <p class="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-dimmed tabular-nums">
              {{ postDisplayDate(post).date }} {{ postDisplayDate(post).time }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-1 sm:justify-end">
            <UButton
              v-if="canEditContent"
              :to="`/admin/editor?id=${post._id}`"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-pencil"
              class="rounded-full"
            >
              Edit
            </UButton>
            <UButton
              v-if="canEditContent"
              color="error"
              variant="ghost"
              size="sm"
              icon="i-lucide-trash-2"
              class="rounded-full"
              @click="onDeletePost(post._id)"
            >
              Delete
            </UButton>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center gap-2 py-14 text-center text-muted"
      >
        <UIcon
          name="i-lucide-file-text"
          class="size-10"
        />
        <p class="font-serif text-2xl italic text-dimmed">
          No {{ selectedTab === 'all' ? 'entries' : selectedTab + ' entries' }} found.
        </p>
        <p class="text-sm text-muted">
          Create the first entry or switch tabs to inspect drafts and published work.
        </p>
        <UButton
          v-if="selectedTab === 'all' && canEditContent"
          to="/admin/editor"
          color="neutral"
          variant="ghost"
          icon="i-lucide-plus"
          class="mt-2 rounded-full"
        >
          Add your first entry
        </UButton>
      </div>
    </section>
  </section>
</template>
