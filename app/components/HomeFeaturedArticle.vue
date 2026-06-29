<template>
  <NuxtLink :to="`/blog/${post.slug}`" class="group block min-w-0">
    <article class="overflow-hidden rounded-[8px] border border-[#333333] bg-[#e5e6e1]">
      <div v-if="post.display.primaryImage || post.display.videoEmbedUrl" class="bg-[#ffffff]">
        <div v-if="post.display.primaryImage" class="aspect-[16/9] overflow-hidden">
          <img
            :src="post.display.primaryImage"
            :alt="post.title || ''"
            class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>

        <iframe
          v-else
          :src="`${post.display.videoEmbedUrl}?autoplay=0&mute=1&controls=1`"
          class="aspect-[16/9] h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        />
      </div>

      <div class="p-6 sm:p-8">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3a4444]">
          <span>{{ post.display.typeLabel }}</span>
          <span class="text-[#d0d0ca]">&middot;</span>
          <time :datetime="post.displayDate">{{ post.displayDate }}</time>
          <template v-if="post.tags?.length">
            <span class="text-[#d0d0ca]">&middot;</span>
            <span class="capitalize">{{ post.tags[0] }}</span>
          </template>
        </div>

        <p
          v-if="post.display.type === 'quote'"
          class="mt-5 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-[#151515] sm:text-4xl"
        >
          {{ post.display.quoteText }}
        </p>

        <h1
          v-else
          class="mt-5 max-w-3xl font-serif text-3xl leading-[1.05] tracking-tight text-[#151515] sm:text-5xl"
        >
          {{ post.title || post.display.plainText }}
        </h1>

        <p
          v-if="post.display.type === 'article' && post.display.previewText"
          class="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#3a4444] sm:text-lg"
        >
          {{ post.display.previewText }}
        </p>

        <p
          v-else-if="post.display.type === 'short'"
          class="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#3a4444] sm:text-lg"
        >
          {{ post.display.plainText }}
        </p>

        <span class="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#151515]">
          Read entry
          <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </span>
      </div>
    </article>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { PostDisplay } from '~/utils/postType'

interface HomePost {
  _id: string
  slug: string
  title?: string
  tags?: string[]
  displayDate: string
  display: PostDisplay
}

defineProps<{
  post: HomePost
}>()
</script>
