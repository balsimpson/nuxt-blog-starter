<template>
  <footer class="relative overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_20%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.18),_transparent_24%)]" />
      <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
    </div>

    <div class="mx-auto max-w-6xl px-6 py-14 sm:px-8 lg:px-10">
      <div class="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.32em] text-warning">Still overkill</p>
          <h2 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            A clean footer that still feels elevated.
          </h2>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton
            size="md"
            color="warning"
            label="Start writing"
            icon="i-lucide-arrow-right"
            trailing-icon
            class="rounded-full px-6"
            to="#features"
          />
          <UButton
            size="md"
            color="neutral"
            variant="outline"
            label="View source"
            icon="i-simple-icons-github"
            trailing-icon
            class="rounded-full px-6"
            target="_blank"
            to="https://github.com/balsimpson/nuxt-blog-starter"
          />
        </div>
      </div>

      <div class="mt-10 flex flex-col gap-4 border-t border-slate-200/60 pt-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Nuxt Blog Starter</p>
        <div class="flex flex-wrap items-center gap-4">
          <a href="#features" class="transition hover:text-slate-950 dark:hover:text-white">Features</a>
          <a href="#editor" class="transition hover:text-slate-950 dark:hover:text-white">Editor demo</a>
        </div>
      </div>
    </div>
  </footer>
</template>
