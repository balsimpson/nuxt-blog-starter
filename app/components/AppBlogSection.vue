<script setup lang="ts">
import { computed } from 'vue'
import { api } from '~~/convex/_generated/api'

const { data: rawPosts, isPending } = useConvexQuery(api.posts.listPublished, {})

const getPlaceholderImage = () => '/bloggr-logo.png'

const posts = computed(() => {
  if (!rawPosts.value) return []
  
  // Sort by date (publishedAt or _creationTime)
  const sorted = [...rawPosts.value].sort((a, b) => {
    const dateA = a.originalPublishedAt || a.publishedAt || (a as any)._creationTime || 0
    const dateB = b.originalPublishedAt || b.publishedAt || (b as any)._creationTime || 0
    return dateB - dateA
  })

  // Limit to 4 posts
  return sorted.slice(0, 4).map(post => {
    const displayDate = post.originalPublishedAt
      ? new Date(post.originalPublishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : post.publishedAt
        ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : ''

    return {
      ...post,
      previewText: getPreviewText(post.content),
      displayImage: post.image || getPlaceholderImage(),
      displayDate
    }
  })
})
</script>

<template>
  <section id="blog-preview" class="relative py-24 sm:py-32 overflow-hidden bg-white dark:bg-slate-950">
    <!-- Background Decor -->
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,_var(--color-primary-500)_0%,_transparent_40%)] opacity-[0.03] dark:opacity-[0.05]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)]" />
    </div>

    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <UBadge color="primary" variant="soft" class="rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest">
          Insights & Updates
        </UBadge>
        <h2 class="mt-8 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          Latest from the <span class="text-primary italic">journal.</span>
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
          Unfiltered updates on building at the edge of what's possible. No newsletters, just knowledge.
        </p>
      </div>

      <div class="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
        <ClientOnly>
          <template v-if="isPending">
            <div v-for="i in 4" :key="i" class="h-[420px] rounded-[2.5rem] bg-slate-100 dark:bg-white/5 animate-pulse" />
          </template>
          
          <template v-else-if="posts.length > 0">
            <NuxtLink 
              v-for="post in posts" 
              :key="post._id" 
              :to="`/blog/${post.slug}`"
              class="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 dark:border-white/10 dark:bg-slate-900/40 dark:shadow-none"
            >
              <!-- Image Section -->
              <div class="relative aspect-video overflow-hidden">
                <img 
                  :src="post.displayImage" 
                  :alt="post.title"
                  class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>

              <!-- Content Section -->
              <div class="flex flex-1 flex-col p-8 sm:p-10">
                <div class="flex items-center gap-x-4 text-xs">
                  <time :datetime="post.displayDate" class="text-slate-500 dark:text-slate-400">
                    {{ post.displayDate }}
                  </time>
                  <UBadge v-if="post.category" color="primary" variant="outline" size="xs" class="capitalize">
                    {{ post.category }}
                  </UBadge>
                </div>
                
                <div class="mt-4 flex-1">
                  <h3 class="text-2xl font-bold leading-tight text-slate-950 dark:text-white group-hover:text-primary transition-colors">
                    {{ post.title }}
                  </h3>
                  <p class="mt-4 line-clamp-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                    {{ post.previewText }}
                  </p>
                </div>

                <div class="mt-8 flex items-center gap-2 text-sm font-semibold text-primary">
                  Read full entry
                  <UIcon name="i-lucide-arrow-right" class="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </NuxtLink>
          </template>
          
          <div v-else class="col-span-full py-20 text-center">
            <p class="text-slate-500 dark:text-slate-400">Check back soon for new articles.</p>
          </div>
          <template #fallback>
            <div v-for="i in 4" :key="i" class="h-[420px] rounded-[2.5rem] bg-slate-100 dark:bg-white/5 animate-pulse" />
          </template>
        </ClientOnly>
      </div>

      <!-- Footer Action -->
      <div v-if="posts.length > 0" class="mt-16 flex justify-center">
        <UButton
          to="/blog"
          size="xl"
          variant="ghost"
          color="neutral"
          class="group rounded-full px-8 text-base font-medium transition-all hover:bg-slate-100 dark:hover:bg-white/5"
        >
          View all journal entries
          <template #trailing>
             <UIcon name="i-lucide-arrow-right" class="transition-transform group-hover:translate-x-1" />
          </template>
        </UButton>
      </div>
    </div>
  </section>
</template>
