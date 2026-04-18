<script setup lang="ts">

</script>

<template>
  <div class="relative overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.95),_rgba(248,250,252,0.96),_rgba(255,255,255,0.98))] dark:bg-[linear-gradient(to_bottom,_rgba(2,6,23,0.98),_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-70 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_15%,#000_72%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      <div class="absolute -left-24 top-24 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.12)_0%,_rgba(59,130,246,0.04)_28%,_transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(59,130,246,0.16)_0%,_rgba(59,130,246,0.06)_28%,_transparent_68%)]" />
      <div class="absolute right-[-5rem] top-[38rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.1)_0%,_rgba(236,72,153,0.035)_30%,_transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(236,72,153,0.12)_0%,_rgba(236,72,153,0.05)_30%,_transparent_70%)]" />
      <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent dark:from-slate-950/90" />
      <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-100/90 to-transparent dark:from-slate-950/90" />
    </div>

    <main class="relative isolate">
      <AppHero />

      <section class="relative py-4 sm:py-8">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
        </div>
      </section>

      <AppFeatures />

      <section class="relative py-4 sm:py-8">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
        </div>
      </section>

      <AppBlogSection />

      <section class="relative py-4 sm:py-8">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
        </div>
      </section>

      <ClientOnly>
        <UPageSection
          id="editor"
          title="Live Editor Demo"
          description="This is the actual editor. The one that ships with the template. Click around. Insert an image. Embed a YouTube video of a cat. Write a sentence, delete it, write it again slightly worse. Get a feel for things."
          variant="soft"
          class="relative overflow-hidden py-24 sm:py-32"
        >
          <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(236,72,153,0.1),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(236,72,153,0.12),_transparent_28%)]" />
            <div class="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.5),rgba(255,255,255,0.85),rgba(255,255,255,0.95))] dark:bg-[linear-gradient(to_bottom,rgba(15,23,42,0.6),rgba(15,23,42,0.82),rgba(15,23,42,0.96))]" />
            <div class="absolute left-[-10%] top-[-6rem] h-[16rem] w-[16rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.16),_transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(56,189,248,0.14),_transparent_65%)]" />
            <div class="absolute right-[-8%] bottom-[-5rem] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,_rgba(248,113,113,0.14),_transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(248,113,113,0.12),_transparent_65%)]" />
          </div>
          <AppEditor demo />
        </UPageSection>
      </ClientOnly>

      <section class="relative py-4 sm:py-8">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
        </div>
      </section>

      <UPageSection
        class="relative py-24 sm:py-32"
      >
        <UPageCTA
          title="Ready to bring your story to life?"
          description="Use this template as the foundation for your next product landing page, pitch deck, or agency site. Everything is already optimized for light and dark mode."
          variant="subtle"
          :links="[{
            label: 'Start building',
            to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
            target: '_blank',
            trailingIcon: 'i-lucide-arrow-right',
            color: 'neutral'
          }, {
            label: 'View on GitHub',
            to: 'https://github.com/balsimpson/nuxt-blog-starter',
            target: '_blank',
            icon: 'i-simple-icons-github',
            color: 'neutral',
            variant: 'outline'
          }]"
        />
      </UPageSection>
    </main>
  </div>
</template>
