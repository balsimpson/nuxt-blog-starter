<script setup lang="ts">
import { computed } from 'vue'
import { useConvexHttpClient } from 'convex-vue'
import { api } from '~~/convex/_generated/api'
import { getPostDisplay, type PostDisplay } from '~/utils/postType'

interface EnrichedPost {
  _id: string
  slug: string
  title?: string
  author?: string
  tags?: string[]
  displayDate: string
  display: PostDisplay
  [key: string]: unknown
}

const convex = useConvexHttpClient()
const { data: rawPosts, status } = await useAsyncData(
  'published-posts',
  () => convex.query(api.posts.listPublished, {})
)
const isPending = computed(() => status.value === 'pending')

function formatDate(timestamp?: number): string {
  if (!timestamp) return ''

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const posts = computed<EnrichedPost[]>(() => {
  if (!rawPosts.value) return []

  const sorted = [...rawPosts.value].sort((a, b) => {
    const dateA = a.originalPublishedAt || a.publishedAt || (a as any)._creationTime || 0
    const dateB = b.originalPublishedAt || b.publishedAt || (b as any)._creationTime || 0
    return dateB - dateA
  })

  return sorted.map(post => {
    const ts = post.originalPublishedAt || post.publishedAt || (post as any)._creationTime
    const displayDate = formatDate(ts)

    return {
      ...post,
      displayDate,
      display: getPostDisplay(post as any)
    } as EnrichedPost
  })
})

const FEED_LIMIT = 8

const featuredPost = computed(() => posts.value.find(post => post.display.type === 'article') ?? posts.value[0] ?? null)
const feed = computed(() => posts.value.filter(post => post._id !== featuredPost.value?._id).slice(0, FEED_LIMIT))
</script>

<template>
  <main class="bg-[#ffffff] text-[#151515]">
    <div class="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16 lg:py-20">
      <section>
        <div class="flex items-baseline justify-between gap-4 border-b border-[#e5e6e1] pb-3">
          <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-[#3a4444]">
            Latest article
          </p>

          <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-[#808080]">
            {{ posts.length }} entries
          </p>
        </div>

        <div v-if="isPending" class="mt-6 rounded-[8px] border border-[#333333] bg-[#e5e6e1] p-6 sm:p-8">
          <div class="h-3 w-24 rounded bg-[#ffffff]/70" />
          <div class="mt-6 aspect-[16/9] rounded-[6px] bg-[#ffffff]/70" />
          <div class="mt-6 h-10 w-3/4 rounded bg-[#ffffff]/70" />
          <div class="mt-4 h-4 w-full rounded bg-[#ffffff]/70" />
          <div class="mt-3 h-4 w-5/6 rounded bg-[#ffffff]/70" />
        </div>

        <div v-else-if="featuredPost" class="mt-6">
          <HomeFeaturedArticle :post="featuredPost" />
        </div>

        <div v-else class="mt-6 rounded-[8px] border border-[#333333] bg-[#e5e6e1] p-6">
          <p class="font-serif text-2xl leading-tight tracking-tight text-[#151515]">
            No published entries yet.
          </p>
        </div>
      </section>

      <section v-if="!isPending && feed.length" class="mt-16 border-t border-[#e5e6e1] pt-12 sm:mt-20 sm:pt-16">
        <div class="flex items-baseline justify-between gap-4">
          <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-[#3a4444]">
            Archive
          </p>

          <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-[#808080]">
            Masonry
          </p>
        </div>

        <div class="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
          <HomeMasonryCard
            v-for="(post, index) in feed"
            :key="post._id"
            :post="post"
            :index="index + 1"
          />
        </div>
      </section>
    </div>
  </main>
</template>
