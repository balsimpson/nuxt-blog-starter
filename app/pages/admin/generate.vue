<script setup lang="ts">
definePageMeta({
  layout: false,
  ssr: false
})
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-muted">
          Blog admin
        </p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          Generate article
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-muted">
          Start with a topic, answer a few clarifying questions, review the generated draft, and open it in the editor when approved.
        </p>
      </div>

      <UButton
        to="/admin"
        color="neutral"
        variant="soft"
        icon="i-lucide-arrow-left"
      >
        Back to posts
      </UButton>
    </div>

    <ClientOnly>
      <ArticleGenerationWorkspace />
    </ClientOnly>
  </div>
</template>
