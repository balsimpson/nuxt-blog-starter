<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-[#e5e6e1] bg-[#ffffff]">
    <div class="mx-auto max-w-[1200px] px-6 py-12 sm:px-8 sm:py-16">
      <div class="flex items-center justify-between gap-8 font-mono text-[11px] uppercase tracking-[0.16em] text-[#808080]">
        <NuxtLink to="/" class="text-[#151515]">
          Bloggr
        </NuxtLink>

        <span>&copy; {{ year }}</span>
      </div>
    </div>
  </footer>
</template>
