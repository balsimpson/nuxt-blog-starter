<template>
  <article
    aria-busy="true"
    aria-label="Loading entry"
    class="mx-auto min-h-screen max-w-3xl px-6 sm:px-8"
  >
    <header class="pt-40 pb-16 sm:pt-48 sm:pb-20">
      <USkeleton class="h-4 w-36 rounded-full" />

      <div class="mt-10 flex gap-3">
        <USkeleton class="h-3 w-28 rounded-full" />
        <USkeleton class="h-3 w-20 rounded-full" />
      </div>

      <div class="mt-8 space-y-4">
        <USkeleton class="h-11 w-full rounded-md sm:h-14" />
        <USkeleton class="h-11 w-5/6 rounded-md sm:h-14" />
        <USkeleton class="h-11 w-3/5 rounded-md sm:h-14" />
      </div>

      <div class="mt-8 space-y-3">
        <USkeleton class="h-5 w-full rounded-full" />
        <USkeleton class="h-5 w-4/5 rounded-full" />
      </div>
    </header>

    <div class="border-t border-default py-16 sm:py-20">
      <div class="space-y-4">
        <USkeleton class="h-5 w-full rounded-full" />
        <USkeleton class="h-5 w-full rounded-full" />
        <USkeleton class="h-5 w-11/12 rounded-full" />
        <USkeleton class="h-5 w-4/5 rounded-full" />
        <div class="h-5" />
        <USkeleton class="h-5 w-full rounded-full" />
        <USkeleton class="h-5 w-5/6 rounded-full" />
      </div>
    </div>
  </article>
</template>
