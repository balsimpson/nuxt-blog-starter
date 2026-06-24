<script setup lang="ts">
import { computed } from 'vue'
import { useConvexHttpClient } from 'convex-vue'
import { api } from '~~/convex/_generated/api'
import { getYoutubeEmbedUrl } from '~/utils/postVideos'

const convex = useConvexHttpClient()
const { data: rawPosts, status } = await useAsyncData(
  'published-posts',
  () => convex.query(api.posts.listPublished, {})
)
const isPending = computed(() => status.value === 'pending')

const getPlaceholderImage = (_id: string) => '/bloggr-logo.png'

const posts = computed(() => {
  if (!rawPosts.value) return []

  const sorted = [...rawPosts.value].sort((a, b) => {
    const dateA = a.originalPublishedAt || a.publishedAt || (a as any)._creationTime || 0
    const dateB = b.originalPublishedAt || b.publishedAt || (b as any)._creationTime || 0
    return dateB - dateA
  })

  return sorted.map(post => {
    const ts = post.originalPublishedAt || post.publishedAt || (post as any)._creationTime
    const displayDate = ts
      ? new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''

    let videoEmbedUrl = ''
    const videoUrl = post.featuredVideo || post.videos?.[0]
    if (videoUrl) {
      videoEmbedUrl = getYoutubeEmbedUrl(videoUrl)
    } else if (post.content) {
      const contentMatch = post.content.match(/[:]{2,3}youtube\s*\{?\s*src="([^"]+)"/i)
      if (contentMatch && contentMatch[1]) {
        videoEmbedUrl = getYoutubeEmbedUrl(contentMatch[1])
      } else {
        const linkMatch = post.content.match(/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'\)\}\[\]\.,!]+)/i)
        if (linkMatch && linkMatch[1]) {
          videoEmbedUrl = getYoutubeEmbedUrl(linkMatch[1])
        }
      }
    }

    return {
      ...post,
      previewText: getPreviewText(post.content),
      displayImage: post.featuredImage || post.images?.[0] || getPlaceholderImage(post._id),
      displayDate,
      videoEmbedUrl
    }
  })
})
</script>

<template>
  <main class="relative bg-default text-default">
    <div class="mx-auto max-w-5xl px-6 sm:px-8">
      <!-- Masthead -->
      <header class="border-b border-default pt-40 pb-12 sm:pt-48 sm:pb-16">
        <p class="font-mono text-[11px] uppercase tracking-[0.24em] text-dimmed">
          The Journal
        </p>
        <h1 class="mt-6 font-serif text-4xl leading-[1.08] tracking-[-0.02em] sm:text-5xl">
          Everything published,
          <span class="italic text-muted">in order.</span>
        </h1>
        <p class="mt-6 max-w-xl text-base leading-relaxed text-toned">
          A quiet archive of essays, notes, and field reports. Read what interests you; skip what doesn't.
        </p>
      </header>

      <!-- Archive -->
      <section class="py-12 sm:py-16">
        <ol v-if="!isPending && posts.length" class="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:gap-x-14 lg:gap-y-16">
          <li v-for="(post, i) in posts" :key="post._id" class="group">
            <NuxtLink :to="`/blog/${post.slug}`" class="flex h-full flex-col">
                <!-- Media -->
                <div class="relative aspect-[16/10] overflow-hidden rounded-md border border-default bg-muted">
                  <template v-if="post.videoEmbedUrl">
                    <iframe
                      :src="`${post.videoEmbedUrl}?autoplay=0&mute=1&controls=1`"
                      class="absolute inset-0 h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    />
                  </template>

                  <template v-else>
                    <img
                      :src="post.displayImage"
                      :alt="post.title"
                      class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  </template>

                  <span class="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/90 mix-blend-difference">
                    {{ String(i + 1).padStart(2, '0') }}
                  </span>
                </div>

                <!-- Meta -->
                <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dimmed">
                  <time :datetime="post.displayDate" class="font-mono tabular-nums">{{ post.displayDate }}</time>
                  <span v-if="post.tags?.length" class="text-dimmed">&middot;</span>
                  <span v-if="post.tags?.length" class="capitalize">{{ post.tags[0] }}</span>
                </div>

                <!-- Title -->
                <h2 class="mt-3 font-serif text-2xl leading-snug tracking-tight text-highlighted transition-colors duration-300 group-hover:text-muted">
                  {{ post.title }}
                </h2>

                <!-- Lede -->
                <p v-if="post.previewText" class="mt-3 line-clamp-2 text-[15px] leading-relaxed text-toned">
                  {{ post.previewText }}
                </p>

                <span class="mt-5 inline-flex items-center gap-2 text-sm text-muted">
                  Read entry
                  <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                </span>
            </NuxtLink>
          </li>
        </ol>

        <div v-else-if="!isPending && !posts.length" class="py-24 text-center">
          <p class="font-serif text-2xl italic text-dimmed">Nothing published yet.</p>
          <p class="mt-3 text-sm text-muted">When the first post ships, it will appear here.</p>
        </div>

        <ol v-else class="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:gap-x-14 lg:gap-y-16">
          <li v-for="i in 4" :key="i" class="flex flex-col">
            <div class="aspect-[16/10] rounded-md bg-elevated" />
            <div class="mt-5 space-y-3">
              <div class="h-3 w-24 rounded bg-elevated" />
              <div class="h-6 w-3/4 rounded bg-elevated" />
              <div class="h-3 w-full rounded bg-elevated" />
            </div>
          </li>
        </ol>
      </section>
    </div>
  </main>
</template>
