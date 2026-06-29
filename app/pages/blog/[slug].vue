<template>
  <main class="relative bg-default text-default">
    <ArticleLoadingSkeleton v-if="status === 'pending' || status === 'idle'" />

    <article v-else-if="post" class="mx-auto max-w-3xl px-6 sm:px-8">
      <header class="pt-6 pb-16 sm:pt-12 sm:pb-20">
        <!-- <UBreadcrumb :items="breadcrumbLinks" class="mb-10" /> -->

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
      </header>

      <div class="border-t border-default py-16 sm:py-20">
        <div
          class="prose prose-site max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-a:underline prose-a:decoration-[var(--ui-border-accented)] prose-a:underline-offset-4 hover:prose-a:decoration-[var(--ui-text-highlighted)] prose-blockquote:not-italic prose-blockquote:font-serif prose-blockquote:text-xl prose-code:rounded prose-code:bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.875em] prose-pre:rounded-md prose-pre:border prose-pre:border-default prose-img:rounded-md prose-img:border prose-img:border-default prose-hr:border-default"
        >
          <MDC v-if="processedContent" :value="processedContent" />
        </div>

        <div
          v-if="post.originalSource || post.originalPublishedAt"
          class="mt-16 border-t border-default pt-8 font-mono text-xs uppercase tracking-[0.16em] text-dimmed"
        >
          <p v-if="post.originalSource">
            Originally published on
            <a
              :href="post.originalSource"
              target="_blank"
              class="text-toned underline-offset-4 hover:text-highlighted"
            >{{ originalSourceHostname }}</a><template v-if="post.originalPublishedAt">
              &middot; {{ formatLongDate(post.originalPublishedAt) }}
            </template>
          </p>
          <p v-else-if="post.originalPublishedAt">
            Originally published {{ formatLongDate(post.originalPublishedAt) }}
          </p>
        </div>
      </div>

      <section v-if="otherPosts.length > 0" class="border-t border-default py-16 sm:py-20">
        <div class="flex items-baseline justify-between">
          <h2 class="font-serif text-2xl tracking-tight">
            Keep reading
          </h2>
          <NuxtLink
            to="/"
            class="text-sm text-muted underline-offset-4 transition-colors hover:text-highlighted"
          >
            All entries &rarr;
          </NuxtLink>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          <NuxtLink
            v-for="other in otherPosts"
            :key="other._id"
            :to="`/blog/${other.slug}`"
            class="group block"
          >
            <div class="font-mono text-[11px] uppercase tracking-[0.2em] text-dimmed">
              {{ formatShortDate(other.originalPublishedAt || other.publishedAt || other._creationTime) }}
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

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useConvexHttpClient } from 'convex-vue'
import { api } from '~~/convex/_generated/api'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const convex = useConvexHttpClient()

const { data: entry, error, status } = await useAsyncData(
  () => `published-entry-${slug.value}`,
  () => convex.query(api.posts.getPublishedBySlug, { slug: slug.value }),
  {
    lazy: true
  }
)

const post = computed(() => entry.value?.post ?? null)
const otherPosts = computed(() => entry.value?.related ?? [])
const loadingIndicator = useLoadingIndicator()

function unableToLoadError(cause?: unknown) {
  return createError({
    statusCode: 500,
    statusMessage: 'Unable to load the entry.',
    cause
  })
}

function entryNotFoundError() {
  return createError({
    statusCode: 404,
    statusMessage: 'Entry not found.'
  })
}

if (import.meta.server) {
  if (error.value) {
    throw unableToLoadError(error.value)
  }

  if (!post.value) {
    throw entryNotFoundError()
  }
}

watch(
  [status, error],
  ([currentStatus, currentError]) => {
    if (!import.meta.client) return

    if (currentStatus === 'pending') {
      loadingIndicator.start()
      return
    }

    loadingIndicator.finish({ error: currentStatus === 'error' })

    if (currentError) {
      showError(unableToLoadError(currentError))
      return
    }

    if (currentStatus === 'success' && !post.value) {
      showError(entryNotFoundError())
    }
  },
  { immediate: true }
)

useSeoMeta({
  title: () => post.value?.title || 'Journal',
  description: () => post.value?.excerpt || 'Read the latest entry.'
})

const breadcrumbLinks = computed(() => [
  { label: 'Home', to: '/' },
  { label: post.value?.title || 'Entry', class: 'text-dimmed' }
])

function formatLongDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const displayDate = computed(() => {
  const timestamp = post.value?.originalPublishedAt || post.value?.publishedAt
  return timestamp ? formatLongDate(timestamp) : ''
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
    const url = new URL(src)
    let videoId = ''

    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.slice(1)
    } else if (url.pathname.includes('/embed/')) {
      return src
    } else {
      videoId = url.searchParams.get('v') || ''
    }

    if (!videoId) return src

    const startQuery = Number(start) > 0 ? `?start=${start}` : ''
    return `https://www.youtube.com/embed/${videoId}${startQuery}`
  } catch {
    return src
  }
}

const processedContent = computed(() => {
  const raw = post.value?.content
  if (!raw) return ''

  return replaceLinkPreviews(
    raw.replace(
      /[:]{2,3}youtube\s*\{([^}]+)\}\s*[:]{0,3}/g,
      (_, attrs) => {
        const src = (attrs.match(/src="([^"]+)"/) || [])[1] || ''
        const start = (attrs.match(/start="(\d+)"/) || [])[1] || '0'
        if (!src) return ''

        const embedUrl = toYoutubeEmbedUrl(src, start)
        return `<div class="my-10 aspect-video w-full overflow-hidden rounded-md border border-default"><iframe src="${embedUrl}" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
      }
    )
  )
})

function replaceLinkPreviews(content: string): string {
  return content
    .replace(/<div\b([\s\S]*?\bdata-link-preview\b[\s\S]*?)><\/div>/gi, (_match, attrsString: string) => {
      return renderLinkPreviewCard(attrsString)
    })
    .replace(/&lt;div\b([\s\S]*?\bdata-link-preview\b[\s\S]*?)&gt;&lt;\/div&gt;/gi, (_match, attrsString: string) => {
      return renderLinkPreviewCard(attrsString)
    })
}

function attrValue(attrsString: string, dataAttr: string): string {
  const expression = new RegExp(`${dataAttr}\\s*=\\s*["']([^'"]*)["']`, 'i')
  const value = (attrsString.match(expression) || [])[1] || ''
  return decodeEntities(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function renderLinkPreviewCard(attrsString: string): string {
  const normalizedAttrs = decodeEntities(attrsString)
  const url = attrValue(normalizedAttrs, 'data-href')
  const title = attrValue(normalizedAttrs, 'data-title')
  const description = attrValue(normalizedAttrs, 'data-description')
  const image = attrValue(normalizedAttrs, 'data-image')
  const siteName = attrValue(normalizedAttrs, 'data-site')
  const favicon = attrValue(normalizedAttrs, 'data-favicon')

  if (!url) return ''

  let hostname = url
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    hostname = url
  }

  const site = siteName || hostname
  const heading = title || url
  const faviconHtml = favicon
    ? `<img src="${escapeHtml(favicon)}" alt="" class="size-4 shrink-0 rounded-sm object-contain">`
    : ''
  const imageHtml = image
    ? `<img src="${escapeHtml(image)}" alt="" class="hidden aspect-video h-20 w-32 shrink-0 rounded-lg object-cover sm:block">`
    : ''
  const descriptionHtml = description
    ? `<p class="mt-1 line-clamp-2 text-xs text-muted">${escapeHtml(description)}</p>`
    : ''

  return `\n\n<div class="not-prose my-4">\n  <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl border border-default bg-default shadow-sm transition hover:border-muted">\n    <div class="flex items-stretch gap-3 p-3">\n      <div class="min-w-0 flex-1">\n        <div class="flex items-center gap-2 text-xs text-muted">${faviconHtml}<span class="truncate">${escapeHtml(site)}</span></div>\n        <p class="mt-1.5 line-clamp-2 text-sm font-semibold text-highlighted">${escapeHtml(heading)}</p>\n        ${descriptionHtml}\n      </div>\n      ${imageHtml}\n    </div>\n  </a>\n</div>\n\n`
}
</script>
