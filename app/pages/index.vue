<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConvexHttpClient } from 'convex-vue'
import { api } from '~~/convex/_generated/api'

const convex = useConvexHttpClient()
const { data: rawPosts, status } = await useAsyncData(
  'published-posts',
  () => convex.query(api.posts.listPublished, {})
)
const isPending = computed(() => status.value === 'pending')

const posts = computed(() => {
  if (!rawPosts.value) return []

  const sorted = [...rawPosts.value].sort((a, b) => {
    const dateA = a.originalPublishedAt || a.publishedAt || (a as any)._creationTime || 0
    const dateB = b.originalPublishedAt || b.publishedAt || (b as any)._creationTime || 0
    return dateB - dateA
  })

  return sorted.slice(0, 6).map(post => {
    const ts = post.originalPublishedAt || post.publishedAt || (post as any)._creationTime
    const displayDate = ts
      ? new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''

    return {
      ...post,
      previewText: getPreviewText(post.content),
      displayDate
    }
  })
})

const lead = computed(() => posts.value[0] ?? null)
const rest = computed(() => posts.value.slice(1))

const today = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const editorDemo = ref<HTMLElement | null>(null)
const isEditorDemoVisible = ref(false)
let editorDemoObserver: IntersectionObserver | undefined

onMounted(() => {
  if (!editorDemo.value || !('IntersectionObserver' in window)) {
    isEditorDemoVisible.value = true
    return
  }

  editorDemoObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return

    isEditorDemoVisible.value = true
    editorDemoObserver?.disconnect()
  }, { rootMargin: '300px 0px' })

  editorDemoObserver.observe(editorDemo.value)
})

onBeforeUnmount(() => editorDemoObserver?.disconnect())
</script>

<template>
  <main class="relative bg-default text-default">
    <div class="mx-auto max-w-3xl px-6 sm:px-8">
      <!-- Nameplate -->
      <div class="flex items-center justify-between pt-32 text-[11px] uppercase tracking-[0.24em] text-dimmed sm:pt-40">
        <span>Issue №01</span>
        <span class="hidden sm:inline">Nuxt Blog Starter</span>
        <time :datetime="today">{{ today }}</time>
      </div>
      <div class="mt-5 border-t border-default" />

      <!-- Masthead / hero -->
      <header class="pt-20 pb-28 sm:pt-28 sm:pb-36">
        <h1 class="font-serif text-[2.9rem] leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-[5rem] lg:leading-[0.98]">
          A quiet place to write
          <span class="italic text-muted">things worth reading.</span>
        </h1>

        <div class="mt-12 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-12">
          <p class="max-w-xl text-lg leading-relaxed text-toned">
            Essays, notes, and field reports — published when they're ready, not before.
            Built on Nuxt, Convex and Clerk, written by whoever has something to say.
          </p>

          <div class="flex items-center gap-8 text-sm">
            <NuxtLink
              to="/blog"
              class="group inline-flex items-center gap-2 font-medium text-highlighted"
            >
              Read the journal
              <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </NuxtLink>
            <a
              href="https://github.com/balsimpson/nuxt-blog-starter"
              target="_blank"
              class="text-muted underline-offset-4 transition-colors hover:text-highlighted"
            >
              View source
            </a>
          </div>
        </div>
      </header>

      <!-- Latest -->
      <section class="border-t border-default">
        <div class="flex items-baseline justify-between py-8">
          <h2 class="font-serif text-2xl tracking-tight sm:text-3xl">Latest</h2>
          <NuxtLink
            v-if="!isPending && posts.length"
            to="/blog"
            class="text-sm text-muted underline-offset-4 transition-colors hover:text-highlighted"
          >
            All entries
          </NuxtLink>
        </div>

        <!-- Featured lead entry -->
        <NuxtLink
          v-if="!isPending && lead"
          :to="`/blog/${lead.slug}`"
          class="group block border-t border-muted py-12 sm:py-16"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-dimmed">
            <span>Latest entry</span>
            <span class="text-dimmed">&middot;</span>
            <time :datetime="lead.displayDate">{{ lead.displayDate }}</time>
            <span v-if="lead.tags?.length" class="text-dimmed">&middot;</span>
            <span v-if="lead.tags?.length" class="capitalize">{{ lead.tags[0] }}</span>
          </div>

          <h3 class="mt-5 font-serif text-3xl leading-[1.05] tracking-tight text-highlighted transition-colors group-hover:text-muted sm:text-4xl lg:text-[2.75rem]">
            {{ lead.title }}
          </h3>

          <p v-if="lead.previewText" class="mt-5 max-w-2xl text-lg leading-relaxed text-toned">
            {{ lead.previewText }}
          </p>

          <span class="mt-7 inline-flex items-center gap-2 text-sm font-medium text-highlighted">
            Read entry
            <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </span>
        </NuxtLink>

        <!-- Index of the rest -->
        <ul v-if="!isPending && rest.length" class="border-t border-muted">
          <li v-for="(post, i) in rest" :key="post._id">
            <NuxtLink
              :to="`/blog/${post.slug}`"
              class="group grid grid-cols-[auto_1fr] gap-6 py-7 transition-colors"
            >
              <span class="pt-1.5 font-mono text-xs tabular-nums text-dimmed">
                {{ String(i + 2).padStart(2, '0') }}
              </span>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dimmed">
                  <time :datetime="post.displayDate">{{ post.displayDate }}</time>
                  <span v-if="post.tags?.length" class="text-dimmed">&middot;</span>
                  <span v-if="post.tags?.length" class="capitalize">{{ post.tags[0] }}</span>
                </div>

                <h3 class="mt-2 font-serif text-xl leading-snug tracking-tight text-highlighted transition-colors group-hover:text-muted sm:text-2xl">
                  {{ post.title }}
                </h3>

                <p v-if="post.previewText" class="mt-3 line-clamp-2 max-w-2xl text-[15px] leading-relaxed text-toned">
                  {{ post.previewText }}
                </p>
              </div>
            </NuxtLink>
          </li>
        </ul>

        <div v-else-if="!isPending && !posts.length" class="py-24 text-center">
          <p class="font-serif text-2xl italic text-dimmed">No entries yet.</p>
          <p class="mt-3 text-sm text-muted">Check back soon — the first post is being written.</p>
        </div>

        <div v-else class="border-t border-muted">
          <div class="py-12 sm:py-16">
            <div class="h-3 w-32 rounded bg-elevated" />
            <div class="mt-6 h-9 w-3/4 rounded bg-elevated" />
            <div class="mt-5 h-4 w-full max-w-2xl rounded bg-elevated" />
            <div class="mt-3 h-4 w-5/6 max-w-2xl rounded bg-elevated" />
          </div>
          <div class="border-t border-muted">
            <div v-for="i in 3" :key="i" class="grid grid-cols-[auto_1fr] gap-6 py-7">
              <div class="h-3 w-6 rounded bg-elevated" />
              <div class="space-y-3">
                <div class="h-3 w-24 rounded bg-elevated" />
                <div class="h-6 w-3/4 rounded bg-elevated" />
                <div class="h-3 w-full rounded bg-elevated" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- The desk -->
      <ClientOnly>
        <section class="border-t border-default py-24 sm:py-32">
          <div class="flex items-baseline justify-between">
            <h2 class="font-serif text-2xl tracking-tight sm:text-3xl">The desk</h2>
            <span class="font-mono text-xs uppercase tracking-[0.24em] text-dimmed">Try it — nothing is saved</span>
          </div>

          <p class="mt-6 max-w-2xl text-lg leading-relaxed text-toned">
            The same editor that writes every entry here. Drop in an image, embed a video,
            or just type a sentence and delete it.
          </p>

          <div class="mt-12 overflow-hidden rounded-md border border-default bg-muted">
            <div class="flex items-center gap-2 border-b border-muted px-5 py-3">
              <span class="h-2.5 w-2.5 rounded-full bg-accented" />
              <span class="h-2.5 w-2.5 rounded-full bg-accented" />
              <span class="h-2.5 w-2.5 rounded-full bg-accented" />
              <span class="ml-3 font-mono text-xs text-dimmed">~/draft.md</span>
            </div>
            <div ref="editorDemo" class="max-h-75 overflow-y-scroll">
              <LazyAppEditor v-if="isEditorDemoVisible" demo flat />
            </div>
          </div>
        </section>
      </ClientOnly>

      <!-- Closing note -->
      <section class="border-t border-default py-24 sm:py-32">
        <p class="font-serif text-2xl leading-relaxed tracking-tight text-default sm:text-3xl">
          Words arrive slowly here. If you'd like to know when the next one lands,
          <NuxtLink to="/blog" class="italic text-highlighted underline decoration-[var(--ui-border-accented)] underline-offset-8">browse the archive</NuxtLink>.
        </p>
        <p class="mt-10 font-mono text-xs uppercase tracking-[0.24em] text-dimmed">
          Made with Nuxt &middot; Convex &middot; Clerk
        </p>
      </section>
    </div>
  </main>
</template>
