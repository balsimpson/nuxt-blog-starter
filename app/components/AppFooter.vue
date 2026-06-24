<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-default bg-default text-highlighted">
    <div class="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-20">
      <div class="flex items-baseline justify-between text-[11px] uppercase tracking-[0.24em] text-dimmed">
        <span>Colophon</span>
        <span>End of issue</span>
      </div>
      <div class="mt-5 border-t border-default" />

      <div class="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-sm">
          <p class="font-serif text-2xl tracking-tight">Bloggr</p>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            A quiet place to write things worth reading.
          </p>
        </div>

        <nav class="flex items-center gap-6 text-sm">
          <NuxtLink
            to="/blog"
            class="text-muted underline-offset-4 transition-colors hover:text-highlighted"
          >
            Journal
          </NuxtLink>
          <a
            href="https://github.com/balsimpson/nuxt-blog-starter"
            target="_blank"
            class="text-muted underline-offset-4 transition-colors hover:text-highlighted"
          >
            GitHub
          </a>
        </nav>
      </div>

      <div class="mt-12 flex flex-col gap-2 border-t border-muted pt-6 text-xs text-dimmed sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {{ year }} Nuxt Blog Starter</p>
        <p class="font-mono uppercase tracking-[0.24em]">Set in Fraunces &amp; Inter</p>
      </div>
    </div>
  </footer>
</template>
