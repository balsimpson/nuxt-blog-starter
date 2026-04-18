<script setup lang="ts">
import { computed } from 'vue'
import { api } from '~~/convex/_generated/api'

const { data: rawPosts, isPending } = useConvexQuery(api.posts.listPublished, {})

// getPreviewText is auto-imported from utils/blog.ts

const getPlaceholderImage = (_id: string) => '/bloggr-logo.png'

// Extract YouTube video ID from common URL formats
const getYoutubeEmbedUrl = (url: string) => {
  try {
    // Clean URL from trailing characters often picked up by regex in markdown content
    const cleanUrl = url.replace(/[)\}.?,!]+$/, '')
    const u = new URL(cleanUrl)
    let videoId = ''
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1)
    } else {
      videoId = u.searchParams.get('v') || ''
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  } catch {
    return ''
  }
}

const posts = computed(() => {
  if (!rawPosts.value) return []
  
  const sorted = [...rawPosts.value].sort((a, b) => {
    const dateA = a.originalPublishedAt || a.publishedAt || (a as any)._creationTime || 0
    const dateB = b.originalPublishedAt || b.publishedAt || (b as any)._creationTime || 0
    return dateB - dateA
  })

  return sorted.map(post => {
    const displayDate = post.originalPublishedAt
      ? new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : post.publishedAt
        ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : ''

    let videoEmbedUrl = ''
    const videoUrl = (post as any).video
    if (videoUrl) {
      videoEmbedUrl = getYoutubeEmbedUrl(videoUrl)
    } else if (post.content) {
      // Check for :::youtube{src="..."} or ::youtube{src="..."}
      // Being more flexible with the braces and attributes
      const contentMatch = post.content.match(/[:]{2,3}youtube\s*\{?\s*src="([^"]+)"/i)
      if (contentMatch && contentMatch[1]) {
        videoEmbedUrl = getYoutubeEmbedUrl(contentMatch[1])
      } else {
        // Fallback: Just look for a youtube.com or youtu.be URL in the content
        // Exclude trailing characters that are common in punctuation or markdown links
        const linkMatch = post.content.match(/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'\)\}\[\]\.,!]+)/i)
        if (linkMatch && linkMatch[1]) {
          videoEmbedUrl = getYoutubeEmbedUrl(linkMatch[1])
        }
      }
    }

    return {
      ...post,
      previewText: getPreviewText(post.content),
      displayImage: post.image || getPlaceholderImage(post._id),
      displayDate,
      videoEmbedUrl
    }
  })
})
</script>

<template>
  <div class="relative overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98),_rgba(255,255,255,0.96))] dark:bg-[linear-gradient(to_bottom,_rgba(2,6,23,0.98),_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-70 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_12%,#000_68%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      <div class="absolute left-[-8rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.12)_0%,_rgba(59,130,246,0.04)_30%,_transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(59,130,246,0.16)_0%,_rgba(59,130,246,0.06)_30%,_transparent_70%)]" />
      <div class="absolute right-[-6rem] top-[28rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.1)_0%,_rgba(236,72,153,0.035)_32%,_transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(236,72,153,0.12)_0%,_rgba(236,72,153,0.05)_32%,_transparent_72%)]" />
      <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/80 to-transparent dark:from-slate-950/90" />
      <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-100/90 to-transparent dark:from-slate-950/90" />
    </div>

    <main class="relative isolate">
      <section class="relative overflow-hidden py-24 sm:py-32">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-3xl text-center">
            <UBadge color="primary" variant="soft" class="rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.28em]">
              Journal
            </UBadge>

            <h1 class="mt-8 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
              Stories, updates, and <span class="text-primary italic">small experiments.</span>
            </h1>

            <p class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
              A quieter archive of what’s been published. Built to feel cohesive with the rest of the site: subtle, legible, and intentional.
            </p>
          </div>
        </div>
      </section>

      <section class="relative py-4 sm:py-8">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
        </div>
      </section>

      <section class="relative pb-24 sm:pb-32">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <ClientOnly>
            <div v-if="isPending" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <div v-for="i in 6" :key="i" class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40">
                <USkeleton class="aspect-[16/10] w-full rounded-[1.5rem]" />
                <div class="mt-5 space-y-3 px-1 pb-2">
                  <USkeleton class="h-3 w-24" />
                  <USkeleton class="h-7 w-5/6" />
                  <USkeleton class="h-4 w-full" />
                  <USkeleton class="h-4 w-4/5" />
                </div>
              </div>
            </div>

            <div v-else-if="posts.length > 0" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <NuxtLink
                v-for="post in posts"
                :key="post._id"
                :to="`/blog/${post.slug}`"
                class="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/25 hover:shadow-2xl hover:shadow-primary/10 dark:border-white/10 dark:bg-slate-900/40"
              >
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.06),_transparent_30%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div class="relative aspect-[16/10] overflow-hidden">
                  <template v-if="post.videoEmbedUrl">
                    <iframe
                      :src="`${post.videoEmbedUrl}?autoplay=0&mute=1&controls=1`"
                      class="absolute inset-0 h-full w-full border-0 transition-transform duration-700 group-hover:scale-[1.03]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    />
                    <div class="absolute inset-0 bg-slate-950/35 transition-colors duration-500 group-hover:bg-slate-950/20" />
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform duration-500 group-hover:scale-110">
                        <UIcon name="i-lucide-play" class="h-6 w-6" />
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <img
                      :src="post.displayImage"
                      :alt="post.title"
                      class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/5 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-75" />
                  </template>

                  <div class="absolute left-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white backdrop-blur-md">
                    Entry
                  </div>
                </div>

                <div class="relative flex flex-1 flex-col p-6 sm:p-8">
                  <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <time :datetime="post.displayDate" class="font-medium uppercase tracking-[0.2em]">
                      {{ post.displayDate }}
                    </time>
                  </div>

                  <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-950 transition-colors group-hover:text-primary dark:text-white">
                    {{ post.title }}
                  </h2>

                  <p class="mt-4 line-clamp-3 text-base leading-7 text-slate-600 dark:text-slate-400">
                    {{ post.previewText }}
                  </p>

                  <div class="mt-8 flex items-center gap-2 text-sm font-semibold text-primary">
                    Read article
                    <UIcon name="i-lucide-arrow-right" class="transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </NuxtLink>
            </div>

            <div v-else class="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
              <UBadge color="neutral" variant="soft" class="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.24em]">
                Nothing yet
              </UBadge>
              <p class="mx-auto mt-6 max-w-md text-lg leading-8 text-slate-600 dark:text-slate-400">
                No posts are published yet. When something ships, it will appear here.
              </p>
            </div>

            <template #fallback>
              <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <USkeleton v-for="i in 6" :key="i" class="h-[30rem] rounded-[2rem]" />
              </div>
            </template>
          </ClientOnly>
        </div>
      </section>
    </main>
  </div>
</template>
