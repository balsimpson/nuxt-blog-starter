<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '~~/convex/_generated/api'

definePageMeta({
  layout: false,
  ssr: false
})

type TavilyResult = {
  title: string
  url: string
  snippet: string
  score?: number
  publishedDate?: string
}

type TavilySearchPayload = {
  query: string
  results: TavilyResult[]
}

const query = ref('Nuxt blog starter recent content workflow')
const topic = ref<'general' | 'news'>('general')
const includeDomains = ref('')
const searchState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const searchError = ref<string | null>(null)
const searchResult = ref<TavilySearchPayload | null>(null)
const convex = useConvexClient()

const canSearch = computed(() => query.value.trim().length >= 6)

const domainList = computed(() => includeDomains.value
  .split(',')
  .map(domain => domain.trim())
  .filter(Boolean)
  .slice(0, 10))

async function runSearch() {
  if (!canSearch.value) {
    return
  }

  searchState.value = 'loading'
  searchError.value = null

  try {
    const result = await convex.action(api.tavily.search, {
      query: query.value.trim(),
      topic: topic.value,
      includeDomains: domainList.value.length ? domainList.value : undefined
    })

    searchResult.value = result
    searchState.value = 'success'
  }
  catch (error) {
    searchState.value = 'error'
    searchError.value = error instanceof Error ? error.message : 'Search failed.'
  }
}

const resultCount = computed(() => searchResult.value?.results.length || 0)
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-sm font-medium text-muted">
          Blog admin
        </p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          Research demo
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-muted">
          Run a live Tavily search and inspect the returned sources before wiring it into an article session.
        </p>
      </div>

      <div class="flex gap-2">
        <UButton
          to="/admin/generate"
          color="primary"
          variant="soft"
          icon="i-lucide-sparkles"
        >
          Back to generator
        </UButton>
        <UButton
          to="/admin"
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
        >
          Back to posts
        </UButton>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold text-highlighted">
              Search controls
            </h2>
            <p class="mt-1 text-sm text-muted">
              Enter a focused query and optional domain filters.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UTextarea
            v-model="query"
            :rows="4"
            autoresize
            placeholder="Search the live web..."
            class="w-full"
          />

          <USelect
            v-model="topic"
            :items="[
              { label: 'General', value: 'general' },
              { label: 'News', value: 'news' }
            ]"
            label="Topic"
          />

          <UInput
            v-model="includeDomains"
            label="Include domains"
            placeholder="example.com, another.com"
          />

          <UButton
            block
            color="primary"
            icon="i-lucide-search"
            :loading="searchState === 'loading'"
            :disabled="!canSearch"
            @click="runSearch"
          >
            Run web search
          </UButton>
        </div>

        <template #footer>
          <div class="space-y-2 text-sm">
            <p class="text-muted">
              Status
            </p>
            <div class="flex items-center gap-2">
              <UBadge :color="searchState === 'success' ? 'success' : searchState === 'error' ? 'error' : 'primary'" variant="soft" class="capitalize">
                {{ searchState }}
              </UBadge>
              <span class="text-muted">
                {{ resultCount }} result{{ resultCount === 1 ? '' : 's' }} returned
              </span>
            </div>
            <p v-if="searchError" class="whitespace-pre-wrap text-error">
              {{ searchError }}
            </p>
          </div>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                Live results
              </h2>
              <p class="mt-1 text-sm text-muted">
                The returned sources are shown here for visual verification.
              </p>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ searchResult?.query || 'No search run yet' }}
            </UBadge>
          </div>
        </template>

        <div v-if="searchState === 'loading'" class="rounded-2xl border border-dashed border-default px-4 py-10 text-center text-sm text-muted">
          Searching the web and fetching sources...
        </div>

        <div v-else-if="searchResult?.results.length" class="space-y-3">
          <div
            v-for="result in searchResult.results"
            :key="result.url"
            class="rounded-2xl border border-default bg-default/30 px-4 py-4"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <a :href="result.url" target="_blank" rel="noreferrer" class="font-medium text-highlighted hover:underline">
                  {{ result.title }}
                </a>
                <p class="mt-1 break-all text-xs text-muted">
                  {{ result.url }}
                </p>
              </div>
              <div class="flex gap-2">
                <UBadge v-if="result.score !== undefined" color="primary" variant="soft" size="sm">
                  Score {{ result.score }}
                </UBadge>
                <UBadge v-if="result.publishedDate" color="neutral" variant="soft" size="sm">
                  {{ result.publishedDate }}
                </UBadge>
              </div>
            </div>
            <p class="mt-3 whitespace-pre-wrap text-sm text-toned">
              {{ result.snippet || 'No snippet was returned for this result.' }}
            </p>
          </div>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-default px-4 py-10 text-center text-sm text-muted">
          Run a search to preview live results here.
        </div>
      </UCard>
    </div>
  </div>
</template>
