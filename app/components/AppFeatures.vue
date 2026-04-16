<script setup lang="ts">
const features = [
  {
    icon: 'i-lucide-rocket',
    title: 'Authentication — Clerk',
    description: `One login. One user. You. No comments section, because you've read the internet and made a mature decision. Visitors can read. They cannot respond. This is not a democracy, it's your blog.`,
    class: 'md:col-span-12 lg:col-span-8'
  },
  {
    icon: 'i-lucide-braces',
    title: 'Real-time Backend — Convex',
    description: `Like Supabase, but it actually sparks joy. Convex keeps your data in sync in real time, has a generous free tier with up to 40 projects.`,
    class: 'md:col-span-6 lg:col-span-4'
  },
  {
    icon: 'i-lucide-moon',
    title: 'Dark mode ready',
    description: 'Built with theme-aware utilities and Nuxt UI primitives so light and dark modes feel equally polished.',
    class: 'md:col-span-6 lg:col-span-4'
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'Rich Editor',
    description: `For when words aren't enough. Drop in images, embed YouTube videos, and pad your 80-word post to something that looks substantial. The embed button is right there.`,
    class: 'md:col-span-6 lg:col-span-4'
  },
  {
    icon: 'i-lucide-music',
    title: 'Zero-Effort Scalability',
    description: 'This stack can handle millions of concurrent users. It won’t have to, obviously—the only person hitting your API is you refreshing the page.',
    class: 'md:col-span-6 lg:col-span-4'
  },
  {
    icon: 'i-lucide-zap',
    title: 'Fast and responsive',
    description: 'GPU-friendly layouts and subtle motion make the experience feel polished on desktop and mobile.',
    class: 'md:col-span-12'
  }
]
</script>

<template>
  <section id="features" class="relative overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white py-24 sm:py-32">
    <!-- Premium Background Elements -->
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_var(--color-warning)_0%,_transparent_50%)] opacity-[0.03] dark:opacity-[0.05]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
      
      <!-- Animated Blobs -->
      <div class="absolute -left-[10%] top-[20%] h-[40rem] w-[40rem] rounded-full bg-warning/5 blur-[120px] animate-pulse" />
      <div class="absolute -right-[10%] bottom-[10%] h-[35rem] w-[35rem] rounded-full bg-fuchsia-500/5 blur-[120px]" />
    </div>

    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <UBadge color="warning" variant="soft" class="rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest">
          Engineered for excellence
        </UBadge>

        <h2 class="mt-8 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
          Massive overkill for your <span class="text-warning italic">tiny blog.</span>
        </h2>

        <p class="mt-8 text-lg leading-8 text-slate-600 dark:text-slate-400">
          Why use a simple <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">.txt</code> file when you can have a globally distributed, real-time backend? It's technically impressive and slightly intimidating.
        </p>
      </div>

      <!-- Bento Grid -->
      <div class="relative mt-20 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        <div
          v-for="(feature, index) in features"
          :key="feature.title"
          :class="[
            'group relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-warning/30 dark:border-white/10 dark:bg-slate-900/40 dark:hover:border-warning/30',
            feature.class
          ]"
          :style="{
            transitionDelay: `${index * 50}ms`
          }"
        >
          <div class="relative flex h-full flex-col p-8 sm:p-12">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-700 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-warning/10 group-hover:ring-warning/20 dark:bg-slate-800 dark:ring-white/10 dark:shadow-black/20">
              <UIcon :name="feature.icon" class="h-8 w-8 text-slate-800 transition-colors group-hover:text-warning dark:text-slate-200" />
            </div>

            <div class="mt-12 flex flex-grow flex-col">
              <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {{ feature.title }}
              </h3>
              <p class="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {{ feature.description }}
              </p>
            </div>

            <!-- Subtle Decorative Element -->
            <div class="absolute -right-8 -top-8 size-32 rounded-full bg-warning/5 blur-3xl transition-all duration-1000 group-hover:bg-warning/15" />
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="mt-24 flex flex-col items-center justify-center gap-6 sm:flex-row">
        <UButton
          size="xl"
          color="warning"
          label="Start writing"
          icon="i-lucide-sparkles"
          trailing
          class="group rounded-full px-12 py-4 text-base font-bold shadow-2xl shadow-warning/20 transition-all hover:scale-105 hover:shadow-warning/40 active:scale-95"
        >
          <template #trailing>
            <UIcon name="i-lucide-arrow-right" class="transition-transform group-hover:translate-x-1" />
          </template>
        </UButton>
        <UButton
          size="xl"
          color="neutral"
          variant="ghost"
          label="GitHub Repository"
          icon="i-lucide-github"
          class="rounded-full px-10 text-base font-medium text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
          to="https://github.com/balsimpson/nuxt-blog-starter"
          target="_blank"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.group:hover .group-hover\:text-warning {
  color: var(--color-warning-500);
}
</style>
