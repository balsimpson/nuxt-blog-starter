<script setup lang="ts">
const today = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})
</script>

<template>
  <div class="min-h-screen bg-[#ffffff] text-[#151515]">
    <header class="border-b border-[#e5e6e1] bg-[#ffffff]">
      <div class="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-5 sm:px-8">
        <NuxtLink
          to="/"
          class="font-mono text-[11px] uppercase tracking-[0.24em] text-[#151515]"
        >
          Bloggr
        </NuxtLink>

        <time
          :datetime="today"
          class="font-mono text-[11px] uppercase tracking-[0.24em] tabular-nums text-[#3a4444]"
        >
          {{ today }}
        </time>
      </div>
    </header>

    <UMain class="relative">
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>
