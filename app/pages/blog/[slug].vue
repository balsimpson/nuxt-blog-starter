<script setup lang="ts">
import { computed } from 'vue'
import { api } from '~~/convex/_generated/api'

const route = useRoute()
const slug = route.params.slug as string

const { data: post, isPending } = useConvexQuery(api.posts.getBySlug, { slug })
const { data: allPosts } = useConvexQuery(api.posts.list, {})

const isPostLoading = computed(() => isPending.value || post.value === undefined)
const isRelatedPostsLoading = computed(() => allPosts.value === undefined)
const shouldShowPostShell = computed(() => isPostLoading.value)
const shouldShowContentShell = computed(() => isPostLoading.value)
const shouldShowRelatedPostsShell = computed(() => Boolean(post.value) && isRelatedPostsLoading.value)

useSeoMeta({
  title: () => post.value?.title || 'Blog Post',
  description: () => post.value?.excerpt || 'Read our latest blog post.'
})

const otherPosts = computed(() => {
  if (!allPosts.value || !post.value) return []
  return allPosts.value
    .filter((p: any) => p._id !== post.value?._id && p.publishStatus === 'published')
    .sort(() => 0.5 - Math.random()) // Randomize
    .slice(0, 2)
})

const breadcrumbLinks = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Blog', to: '/blog' },
  { label: post.value?.title || 'Post', class: 'text-slate-400' }
])

const originalSourceHostname = computed(() => {
  if (!post.value?.originalSource) return ''
  try {
    return new URL(post.value.originalSource).hostname
  } catch {
    return post.value.originalSource
  }
})

// Convert a YouTube watch URL to an embed URL
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

// TipTap serialises YouTube nodes as :::youtube {src="..." ...} :::
// MDC doesn't parse this format, so we replace it with a plain iframe block.
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
      return `<div class="my-8 aspect-video w-full overflow-hidden rounded-xl"><iframe src="${embedUrl}" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
    }
  )
})
</script>

<template>
  <div class="relative min-h-screen overflow-visible bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white transition-colors duration-500">
    <UPage v-if="post || shouldShowPostShell">
      <UPageHero :ui="{
        container: 'max-w-4xl sm:pb-8 lg:pt-24 lg:pb-12 pb-6 pt-20',
        headline: 'justify-start',
        title: 'sr-only',
        description: 'sr-only',
        links: 'mt-0',
        body: 'space-y-0'
      }">
        <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_20%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_22%)]" />
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,_rgba(236,72,153,0.22),_transparent_24%)] dark:bg-[radial-gradient(circle_at_85%_10%,_rgba(236,72,153,0.18),_transparent_24%)]" />
          <div class="absolute inset-0 opacity-35 bg-[linear-gradient(to_right,_rgba(15,23,42,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(15,23,42,0.08)_1px,_transparent_1px)] dark:bg-[linear-gradient(to_right,_rgba(255,255,255,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.08)_1px,_transparent_1px)] [background-size:7rem_7rem]" />
          <div class="animate-pulse absolute right-[-18%] top-[6%] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,_rgba(248,113,113,0.32)_0%,_rgba(248,113,113,0.14)_25%,_transparent_60%)] dark:bg-[radial-gradient(circle,_rgba(248,113,113,0.28)_0%,_rgba(248,113,113,0.1)_25%,_transparent_60%)] blur-3xl sm:right-[-8%] lg:right-[8%] lg:top-[12%] lg:h-[28rem] lg:w-[28rem] motion-safe:animate-[pulse_12s_ease-in-out_infinite]" />
          <div class="animate-pulse absolute left-[-16%] bottom-[12%] h-[14rem] w-[14rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.22)_0%,_rgba(56,189,248,0.1)_30%,_transparent_62%)] dark:bg-[radial-gradient(circle,_rgba(56,189,248,0.18)_0%,_rgba(56,189,248,0.08)_30%,_transparent_62%)] blur-3xl sm:left-[-10%] lg:left-[4%] lg:bottom-[10%] lg:h-[24rem] lg:w-[24rem] motion-safe:animate-[pulse_12s_ease-in-out_infinite]" />
          <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
        </div>

        <div v-if="post" class="relative z-10 w-full space-y-8">
          <UBreadcrumb :items="breadcrumbLinks" class="mb-4" />

          <UBadge
            color="warning"
            variant="soft"
            class="rounded-full px-4 py-2 text-[10px] font-medium uppercase tracking-[0.32em] text-slate-950 dark:text-white"
          >
            <span class="mr-2 size-1.5 rounded-full bg-[color:var(--ui-warning)] shadow-[0_0_8px_rgba(var(--ui-warning),0.4)]" />
            {{ post.originalPublishedAt ? new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-GB', {
              day: 'numeric', month:
                'long', year: 'numeric'
            }) : 'DRAFT' }}
          </UBadge>

          <div class="max-w-4xl">
            <h1
              class="text-balance text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
              {{ post.title }}
            </h1>
          </div>

          <div v-if="post.excerpt"
            class="max-w-2xl text-pretty text-lg leading-7 tracking-[-0.01em] text-slate-600 dark:text-slate-400 sm:text-xl sm:leading-[1.75]">
            <p>{{ post.excerpt }}</p>
          </div>

          <div v-if="post.tags && post.tags.length > 0" class="flex flex-wrap gap-2">
            <UBadge v-for="tag in post.tags" :key="tag" color="neutral" variant="soft" size="md">
              {{ tag }}
            </UBadge>
          </div>
        </div>

        <div v-else class="relative z-10 w-full space-y-8 min-h-[36rem]">
          <USkeleton class="h-4 w-24 bg-white/10" />
          <USkeleton class="h-3 w-32 bg-white/10" />
          <div class="max-w-4xl space-y-3">
            <USkeleton class="h-12 w-full bg-white/10" />
            <USkeleton class="h-12 w-5/6 bg-white/10" />
            <USkeleton class="h-12 w-4/6 bg-white/10" />
          </div>
          <div class="max-w-2xl space-y-2">
            <USkeleton class="h-5 w-full bg-white/10" />
            <USkeleton class="h-5 w-full bg-white/10" />
            <USkeleton class="h-5 w-3/4 bg-white/10" />
          </div>
          <div class="flex gap-2">
            <USkeleton class="h-6 w-16 bg-white/10 rounded-full" />
            <USkeleton class="h-6 w-20 bg-white/10 rounded-full" />
          </div>
        </div>
      </UPageHero>

      <UPageBody class="relative z-10">
        <UContainer class="max-w-4xl">
          <template v-if="shouldShowContentShell">
            <div class="space-y-4 min-h-[40rem]">
              <USkeleton class="h-5 w-full bg-white/10" />
              <USkeleton class="h-5 w-full bg-white/10" />
              <USkeleton class="h-5 w-full bg-white/10" />
              <USkeleton class="h-5 w-4/5 bg-white/10" />
              <div class="h-8" />
              <USkeleton class="h-5 w-full bg-white/10" />
              <USkeleton class="h-5 w-full bg-white/10" />
              <USkeleton class="h-5 w-3/4 bg-white/10" />
            </div>
          </template>

          <template v-else>
            <div
              class="prose prose-slate dark:prose-invert max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-headings:text-slate-950 dark:prose-headings:text-white prose-strong:text-slate-950 dark:prose-strong:text-white prose-a:text-[color:var(--ui-warning)] prose-blockquote:border-[color:var(--ui-warning)] prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400">
              <MDC v-if="processedContent" :value="processedContent" />
            </div>
          </template>

          <template v-if="post && !shouldShowContentShell && (post.originalSource || post.originalPublishedAt)">
            <USeparator class="my-12" />
            <div class="text-sm text-white/40 italic">
              <p v-if="post.originalSource">
                Originally published on <a :href="post.originalSource" target="_blank"
                  class="underline hover:text-white">{{ originalSourceHostname }}</a><template v-if="post.originalPublishedAt">
                  on {{ new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                </template>
              </p>
              <p v-else-if="post.originalPublishedAt">
                Originally published on {{ new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}
              </p>
            </div>
          </template>

          <template v-if="shouldShowRelatedPostsShell">
            <USeparator class="my-24" />
            <div class="space-y-12 mb-24">
              <div class="flex items-center justify-between">
                <div class="space-y-3">
                  <USkeleton class="h-7 w-40 bg-white/10" />
                </div>
                <USkeleton class="h-5 w-24 bg-white/10" />
              </div>

              <div class="grid grid-cols-1 gap-8 mt-8 md:grid-cols-2">
                <div v-for="index in 2" :key="index" class="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-none">
                  <div class="flex h-full flex-col space-y-4">
                    <USkeleton class="h-3 w-28 bg-white/10" />
                    <USkeleton class="h-7 w-4/5 bg-white/10" />
                    <USkeleton class="h-4 w-full bg-white/10" />
                    <USkeleton class="h-4 w-5/6 bg-white/10" />
                  </div>
                  <div class="absolute -right-6 -top-6 size-24 rounded-full bg-warning/5 blur-2xl" />
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="otherPosts.length > 0">
            <USeparator class="my-24" />
            <div class="space-y-12 mb-24">
              <div class="flex items-center justify-between">
                <h3 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white/90">Keep reading</h3>
                <UButton to="/blog" variant="link" color="neutral" class="text-sm text-slate-500 hover:text-[color:var(--ui-warning)] transition-colors">
                  View all posts →
                </UButton>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <NuxtLink v-for="other in otherPosts" :key="other._id" :to="`/blog/${other.slug}`" class="group block h-full">
                  <div class="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-warning/30 dark:border-white/10 dark:bg-slate-900/40 dark:hover:border-warning/30 p-8 shadow-sm dark:shadow-none">
                    <div class="flex flex-col h-full space-y-4">
                      <div class="text-[10px] font-bold tracking-[0.2em] text-slate-500 dark:text-slate-500 uppercase">
                        {{ new Date(other.publishedAt || other._creationTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                      </div>
                      <h4 class="text-xl font-bold text-slate-950 dark:text-white group-hover:text-[color:var(--ui-warning)] transition-colors duration-300">
                        {{ other.title }}
                      </h4>
                      <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {{ other.excerpt }}
                      </p>
                    </div>
                    <!-- Decorative Orb -->
                    <div class="absolute -right-6 -top-6 size-24 rounded-full bg-warning/5 blur-2xl transition-all duration-1000 group-hover:bg-warning/15" />
                  </div>
                </NuxtLink>
              </div>
            </div>
          </template>
        </UContainer>
      </UPageBody>
    </UPage>
    <UPage v-else>
      <div class="flex flex-col items-center justify-center py-48 text-white">
        <h2 class="text-3xl font-bold">
          Post not found
        </h2>
        <UButton to="/blog" variant="link" color="neutral" class="mt-4 text-white hover:text-white/80">
          Back to blog
        </UButton>
      </div>
    </UPage>
  </div>
</template>
