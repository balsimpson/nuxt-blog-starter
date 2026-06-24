<script setup lang="ts">
import { computed } from 'vue'
import { useConvexHttpClient } from 'convex-vue'
import { api } from '~~/convex/_generated/api'

const route = useRoute()
const slug = route.params.slug as string

const convex = useConvexHttpClient()
const { data: allPosts, error } = await useAsyncData(
  'published-posts',
  () => convex.query(api.posts.listPublished, {})
)

if (error.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Unable to load the entry.',
    cause: error.value
  })
}

const post = computed(() => allPosts.value?.find(candidate => candidate.slug === slug) ?? null)

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Entry not found.'
  })
}

const shouldShowPostShell = computed(() => false)
const shouldShowContentShell = computed(() => false)
const shouldShowRelatedPostsShell = computed(() => false)

useSeoMeta({
  title: () => post.value?.title || 'Journal',
  description: () => post.value?.excerpt || 'Read the latest entry.'
})

const otherPosts = computed(() => {
  if (!allPosts.value || !post.value) return []
  return allPosts.value
    .filter(candidate => candidate._id !== post.value?._id)
    .sort((a, b) => {
      const dateA = a.originalPublishedAt || a.publishedAt || a._creationTime
      const dateB = b.originalPublishedAt || b.publishedAt || b._creationTime
      return dateB - dateA
    })
    .slice(0, 2)
})

const breadcrumbLinks = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Journal', to: '/blog' },
  { label: post.value?.title || 'Entry', class: 'text-dimmed' }
])

const displayDate = computed(() => {
  const ts = post.value?.originalPublishedAt || post.value?.publishedAt
  if (!ts) return 'DRAFT'
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
})

const readingTime = computed(() => {
  const text = post.value?.content || ''
  const words = text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
})

const originalSourceHostname = computed(() => {
  if (!post.value?.originalSource) return ''
  try {
    return new URL(post.value.originalSource).hostname
  } catch {
    return post.value.originalSource
  }
})

function toYoutubeEmbedUrl(src: string, start: string) {
  try {
    const u = new URL(src)
    let videoId = ''
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1)
    } else if (u.pathname.includes('/embed/')) {
      return src
    } else {
      videoId = u.searchParams.get('v') || ''
    }
    if (!videoId) return src
    const startQ = Number(start) > 0 ? `?start=${start}` : ''
    return `https://www.youtube.com/embed/${videoId}${startQ}`
  } catch {
    return src
  }
}

const processedContent = computed(() => {
  const raw = post.value?.content
  if (!raw) return ''
  return raw.replace(
    /[:]{2,3}youtube\s*\{([^}]+)\}\s*[:]{0,3}/g,
    (_, attrs) => {
      const src = (attrs.match(/src="([^"]+)"/) || [])[1] || ''
      const start = (attrs.match(/start="(\d+)"/) || [])[1] || '0'
      if (!src) return ''
      const embedUrl = toYoutubeEmbedUrl(src, start)
      return `<div class="my-10 aspect-video w-full overflow-hidden rounded-md border border-default"><iframe src="${embedUrl}" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
    }
  )
})
</script>

<template>
  <main class="relative bg-default text-default">
    <article class="mx-auto max-w-3xl px-6 sm:px-8">
      <!-- Header -->
      <header class="pt-40 pb-16 sm:pt-48 sm:pb-20">
        <UBreadcrumb :items="breadcrumbLinks" class="mb-10" />

        <template v-if="post">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-dimmed">
            <time :datetime="displayDate">{{ displayDate }}</time>
            <span class="text-dimmed">&middot;</span>
            <span>{{ readingTime }} min read</span>
          </div>

          <h1 class="mt-8 font-serif text-4xl leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            {{ post.title }}
          </h1>

          <p v-if="post.excerpt" class="mt-8 max-w-2xl text-lg leading-relaxed text-toned sm:text-xl">
            {{ post.excerpt }}
          </p>

          <div v-if="post.tags && post.tags.length > 0" class="mt-8 flex flex-wrap gap-2">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
            >
              #{{ tag }}
            </span>
          </div>
        </template>

        <template v-else>
          <div class="space-y-6 min-h-[32rem]">
            <div class="h-3 w-40 rounded bg-elevated" />
            <div class="space-y-4">
              <div class="h-12 w-full rounded bg-elevated" />
              <div class="h-12 w-5/6 rounded bg-elevated" />
              <div class="h-12 w-3/5 rounded bg-elevated" />
            </div>
            <div class="space-y-3">
              <div class="h-5 w-full rounded bg-elevated" />
              <div class="h-5 w-full rounded bg-elevated" />
              <div class="h-5 w-3/4 rounded bg-elevated" />
            </div>
          </div>
        </template>
      </header>

      <!-- Body -->
      <div class="border-t border-default py-16 sm:py-20">
        <template v-if="shouldShowContentShell">
          <div class="min-h-[40rem] space-y-4">
            <div class="h-5 w-full rounded bg-elevated" />
            <div class="h-5 w-full rounded bg-elevated" />
            <div class="h-5 w-full rounded bg-elevated" />
            <div class="h-5 w-4/5 rounded bg-elevated" />
            <div class="h-8" />
            <div class="h-5 w-full rounded bg-elevated" />
            <div class="h-5 w-full rounded bg-elevated" />
            <div class="h-5 w-3/4 rounded bg-elevated" />
          </div>
        </template>

        <template v-else>
          <div
            class="prose prose-site max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-a:underline prose-a:decoration-[var(--ui-border-accented)] prose-a:underline-offset-4 hover:prose-a:decoration-[var(--ui-text-highlighted)] prose-blockquote:not-italic prose-blockquote:font-serif prose-blockquote:text-xl prose-code:rounded prose-code:bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.875em] prose-pre:rounded-md prose-pre:border prose-pre:border-default prose-img:rounded-md prose-img:border prose-img:border-default prose-hr:border-default"
          >
            <MDC v-if="processedContent" :value="processedContent" />
          </div>

          <div v-if="post && !shouldShowContentShell && (post.originalSource || post.originalPublishedAt)" class="mt-16 border-t border-default pt-8 font-mono text-xs uppercase tracking-[0.16em] text-dimmed">
            <p v-if="post.originalSource">
              Originally published on
              <a :href="post.originalSource" target="_blank" class="text-toned underline-offset-4 hover:text-highlighted">{{ originalSourceHostname }}</a><template v-if="post.originalPublishedAt">
                &middot; {{ new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) }}
              </template>
            </p>
            <p v-else-if="post.originalPublishedAt">
              Originally published {{ new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) }}
            </p>
          </div>
        </template>
      </div>

      <!-- Keep reading -->
      <section v-if="shouldShowRelatedPostsShell || otherPosts.length > 0" class="border-t border-default py-16 sm:py-20">
        <div class="flex items-baseline justify-between">
          <h2 class="font-serif text-2xl tracking-tight">Keep reading</h2>
          <NuxtLink to="/blog" class="text-sm text-muted underline-offset-4 transition-colors hover:text-highlighted">
            All entries &rarr;
          </NuxtLink>
        </div>

        <template v-if="shouldShowRelatedPostsShell">
          <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div v-for="i in 2" :key="i" class="space-y-3">
              <div class="h-3 w-28 rounded bg-elevated" />
              <div class="h-6 w-4/5 rounded bg-elevated" />
              <div class="h-3 w-full rounded bg-elevated" />
            </div>
          </div>
        </template>

        <div v-else class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          <NuxtLink v-for="other in otherPosts" :key="other._id" :to="`/blog/${other.slug}`" class="group block">
            <div class="font-mono text-[11px] uppercase tracking-[0.2em] text-dimmed">
              {{ new Date(other.publishedAt || other._creationTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </div>
            <h3 class="mt-3 font-serif text-xl leading-snug tracking-tight text-highlighted transition-colors duration-300 group-hover:text-muted">
              {{ other.title }}
            </h3>
            <p v-if="other.excerpt" class="mt-3 line-clamp-2 text-[15px] leading-relaxed text-toned">
              {{ other.excerpt }}
            </p>
          </NuxtLink>
        </div>
      </section>
    </article>

  </main>
</template>
