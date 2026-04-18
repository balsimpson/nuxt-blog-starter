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
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <UHeader
      :toggle="false"
      :class="[
        'fixed top-0 left-0 right-0 z-50 transition-[padding,background-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-b',
        isScrolled 
          ? 'py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm' 
          : 'py-5 bg-transparent border-transparent'
      ]"
    >
      <template #left>
        <NuxtLink 
          to="/" 
          class="group relative flex items-center gap-2 transition-transform duration-500 ease-out active:scale-95"
          :class="{ 'scale-90': isScrolled }"
        >
          <img 
            src="/bloggr-logo.png" 
            class="h-10 sm:h-12 w-auto dark:invert transition-all duration-500 ease-in-out" 
            alt="Bloggr Logo"
          >
        </NuxtLink>
      </template>

      <template #right>
        <div class="flex items-center gap-3">

          <UButton
            to="/blog"
            label="Blog"
            icon="i-lucide-book"
            color="neutral"
            variant="ghost"
            :class="[
              'transition-all duration-300',
              isBlogActive ? 'text-slate-950 bg-slate-200 dark:text-white dark:bg-slate-800' : ''
            ]"
          />

          <UButton
            to="https://github.com/balsimpson/nuxt-blog-starter"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
            class=" sm:inline-flex hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-300"
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
/* Force GPU acceleration for smooth blur transitions */
header {
  will-change: padding, background-color, border-color, backdrop-filter;
  transform: translateZ(0);
}
</style>
