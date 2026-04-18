<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { api } from '~~/convex/_generated/api'

definePageMeta({
  layout: false,
  ssr: false
})

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

const { data: posts, isPending } = useConvexQuery(api.posts.list, {})
const { mutate: removePost } = useConvexMutation(api.posts.remove)

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
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <UCard variant="soft" class="overflow-hidden">
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-medium text-muted">
              Blog admin
            </p>
            <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
              Posts
            </h1>
            <p class="mt-1 text-sm text-muted">
              Browse saved posts and open the dedicated editor to create or update content.
            </p>
          </div>

          <div class="flex gap-2">
            <UButton
              to="/admin/editor"
              color="primary"
              icon="i-lucide-plus"
            >
              Add Post
            </UButton>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <UCard>
          <p class="text-sm text-muted">
            Total posts
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ stats.total }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            Drafts
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ stats.drafts }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            Published
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ stats.published }}
          </p>
        </UCard>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold">
              Content Management
            </h2>
            <p class="text-sm text-muted">
              Manage your articles and drafts.
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
          :to="`/admin/editor?id=${post._id}`"
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
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                @click.prevent
              />
              <UButton
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
          No {{ selectedTab === 'all' ? 'posts' : selectedTab + ' posts' }} found.
        </p>
        <UButton
          v-if="selectedTab === 'all'"
          to="/admin/editor"
          color="primary"
          icon="i-lucide-plus"
          class="mt-2"
        >
          Add your first post
        </UButton>
      </div>
    </UCard>
  </div>
</template>
