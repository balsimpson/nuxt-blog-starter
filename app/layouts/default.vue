<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWindowScroll } from '@vueuse/core'

const { y } = useWindowScroll()
const route = useRoute()
const isScrolled = computed(() => y.value > 20)
const isBlogActive = computed(() => route.path.startsWith('/blog'))
</script>

<template>
  <div class="min-h-screen bg-default">
    <UHeader
      :toggle="false"
      :class="[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-b',
        isScrolled
          ? 'py-4 bg-default/80 backdrop-blur-xl border-default'
          : 'py-6 bg-transparent border-transparent'
      ]"
    >
      <template #left>
        <NuxtLink
          to="/"
          class="group relative flex items-center gap-2 transition-transform duration-500 ease-out active:scale-95"
          :class="{ 'scale-95': isScrolled }"
        >
          <img
            src="/bloggr-logo.png"
            class="site-logo h-8 w-auto transition-all duration-500 ease-in-out sm:h-9"
            alt="Bloggr Logo"
          >
        </NuxtLink>
      </template>

      <template #right>
        <div class="flex items-center gap-1">
          <SiteThemePicker />

          <NuxtLink
            to="/blog"
            class="relative rounded-full px-4 py-2 text-sm transition-colors duration-300"
            :class="isBlogActive ? 'text-highlighted bg-accented/70' : 'text-muted hover:text-highlighted'"
          >
            Journal
          </NuxtLink>

          <UButton
            to="https://github.com/balsimpson/nuxt-blog-starter"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
            class="rounded-full transition-all duration-300 hover:bg-accented/50 sm:inline-flex"
          />
        </div>
      </template>
    </UHeader>

    <UMain class="relative">
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>

<style scoped>
header {
  will-change: background-color, border-color, backdrop-filter;
  transform: translateZ(0);
}
</style>
