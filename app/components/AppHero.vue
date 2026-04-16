<script setup lang="ts">
const isContactModalOpen = ref(false)
</script>

<template>
  <!-- inner: 'py-24 sm:py-28 lg:py-32', -->
  <UPageHero
    :ui="{
      container: 'overflow-visible pt-24 sm:pt-32',
      headline: 'justify-center text-center',
      title: 'max-w-4xl mx-auto text-center',
      description: 'max-w-3xl mx-auto text-center',
      links: 'mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center'
    }"
    class="relative overflow-visible bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white"
  >
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_20%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_22%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,_rgba(236,72,153,0.22),_transparent_24%)] dark:bg-[radial-gradient(circle_at_85%_10%,_rgba(236,72,153,0.18),_transparent_24%)]" />
      <div class="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-950/100 dark:via-slate-950/95 dark:to-slate-950/100" />
      <div class="absolute inset-0 opacity-35 bg-[linear-gradient(to_right,_rgba(15,23,42,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(15,23,42,0.08)_1px,_transparent_1px)] dark:bg-[linear-gradient(to_right,_rgba(255,255,255,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.08)_1px,_transparent_1px)] [background-size:7rem_7rem]" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_85%,_rgba(15,23,42,0.1),_transparent_20%)] dark:bg-transparent" />
      <div class="animate-pulse absolute right-[-18%] top-[6%] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,_rgba(248,113,113,0.32)_0%,_rgba(248,113,113,0.14)_25%,_transparent_60%)] dark:bg-[radial-gradient(circle,_rgba(248,113,113,0.28)_0%,_rgba(248,113,113,0.1)_25%,_transparent_60%)] blur-3xl sm:right-[-8%] lg:right-[8%] lg:top-[12%] lg:h-[28rem] lg:w-[28rem] motion-safe:animate-[pulse_12s_ease-in-out_infinite]" />
      <div class="animate-pulse absolute left-[-16%] bottom-[12%] h-[14rem] w-[14rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.22)_0%,_rgba(56,189,248,0.1)_30%,_transparent_62%)] dark:bg-[radial-gradient(circle,_rgba(56,189,248,0.18)_0%,_rgba(56,189,248,0.08)_30%,_transparent_62%)] blur-3xl sm:left-[-10%] lg:left-[4%] lg:bottom-[10%] lg:h-[24rem] lg:w-[24rem] motion-safe:animate-[pulse_12s_ease-in-out_infinite]" />
      <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
    </div>

    <template #headline>
      <UBadge color="warning" variant="soft" class="rounded-full px-4 py-2 text-xs uppercase tracking-[0.32em] text-slate-950 dark:text-white">
        Unnecessary pretentious tagline
      </UBadge>
    </template>

    <template #title>
      Ship a blog in minutes. <br />
      <span class="mt-4 block font-semibold text-slate-950 dark:text-white">
        Write your <span class="text-warning">first post </span> in months.
      </span>
    </template>

    <template #description>
      <div class="space-y-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
        <p>
          Why use a notepad when you can use a real-time, 
          <span class="font-semibold text-slate-950 dark:text-white">type-safe reactive backend?</span>
        </p>
        <p class="max-w-2xl mx-auto text-slate-500 dark:text-slate-400">
           We’ve wired up Convex and Clerk so your "Hello World" post is backed by more computing power than the Apollo 11 mission. It’s  <span class="font-semibold text-slate-950 dark:text-white">over-engineered,</span> and it’s  <span class="font-semibold text-slate-950 dark:text-white"> unnecessary,</span> and it’s exactly what you deserve.
        </p>
      </div>
    </template>

    <template #links>
      <UButton
        size="xl"
        color="warning"
        label="Talk to us"
        icon="i-carbon-chat"
        trailing-icon
        class="rounded-full px-12"
        @click="isContactModalOpen = true"
      />
      <UButton
        size="xl"
        color="neutral"
        variant="outline"
        label="Explore features"
        icon="i-lucide-arrow-right"
        trailing-icon
        class="rounded-full px-12"
        to="#features"
      />
    </template>
  </UPageHero>
</template>
