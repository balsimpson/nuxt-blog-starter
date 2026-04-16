<script setup lang="ts">

</script>

<template>
  <div>
    <AppHero />
    <AppFeatures />
    <ClientOnly>
      <UPageSection id="editor" title="Live Editor Demo"
        description="This is the actual editor. The one that ships with the template. Click around. Insert an image. Embed a YouTube video of a cat. Write a sentence, delete it, write it again slightly worse. Get a feel for things."
        variant="soft">
        <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            class="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div
            class="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.12),_transparent_22%)] dark:opacity-10" />
          <div
            class="absolute right-[-12%] top-0 h-[16rem] w-[16rem] rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.16),_transparent_60%)] dark:bg-[radial-gradient(circle,_rgba(248,113,113,0.14),_transparent_60%)] blur-3xl" />
          <div
            class="absolute left-[-14%] top-[4rem] h-[14rem] w-[14rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.16),_transparent_60%)] dark:bg-[radial-gradient(circle,_rgba(59,130,246,0.12),_transparent_60%)] blur-3xl" />
          <!-- <div class="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_45%)] dark:bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.08),_transparent_45%)]" /> -->
        </div>
        <AppEditor demo />
      </UPageSection>
    </ClientOnly>
    <UPageSection>
      <UPageCTA title="Ready to bring your story to life?"
        description="Use this template as the foundation for your next product landing page, pitch deck, or agency site. Everything is already optimized for light and dark mode."
        variant="subtle" :links="[{
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
        }]" />

    </UPageSection>
  </div>
</template>
