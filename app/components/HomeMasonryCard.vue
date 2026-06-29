<template>
  <NuxtLink :to="`/blog/${post.slug}`" class="mb-4 block break-inside-avoid group">
    <article :class="['overflow-hidden rounded-[8px] border border-[#333333] transition-transform duration-300 group-hover:-translate-y-0.5', toneClass]">
      <div v-if="post.display.primaryImage || post.display.videoEmbedUrl" class="overflow-hidden bg-[#ffffff]">
        <div v-if="post.display.primaryImage" :class="mediaAspectClass">
          <img
            :src="post.display.primaryImage"
            :alt="post.title || ''"
            class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>

        <iframe
          v-else
          :src="`${post.display.videoEmbedUrl}?autoplay=0&mute=1&controls=1`"
          class="aspect-[4/5] h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        />
      </div>

      <div class="p-5">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-current/70">
          <span>{{ post.display.typeLabel }}</span>
          <span class="text-current/35">&middot;</span>
          <time :datetime="post.displayDate">{{ post.displayDate }}</time>
        </div>

        <p
          v-if="post.display.type === 'quote'"
          class="mt-4 font-serif text-2xl leading-tight tracking-tight text-current sm:text-[1.9rem]"
        >
          {{ post.display.quoteText }}
        </p>

        <h3
          v-else
          class="mt-4 font-serif text-[22px] leading-[1.1] tracking-tight text-current sm:text-3xl"
        >
          {{ post.title || post.display.plainText }}
        </h3>

        <p
          v-if="post.display.type === 'article' && post.display.previewText"
          class="mt-3 text-[15px] leading-relaxed text-current/75"
        >
          {{ post.display.previewText }}
        </p>

        <p
          v-else-if="post.display.type === 'short'"
          class="mt-3 text-[15px] leading-relaxed text-current/75"
        >
          {{ post.display.plainText }}
        </p>

        <span class="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-current">
          Read entry
          <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </span>
      </div>
    </article>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PostDisplay } from '~/utils/postType'

interface HomePost {
  _id: string
  slug: string
  title?: string
  tags?: string[]
  displayDate: string
  display: PostDisplay
}

const props = defineProps<{
  post: HomePost
  index: number
}>()

const toneClass = computed(() => {
  switch (props.post.display.type) {
    case 'image':
      return 'bg-[#d3e5e9] text-[#151515]'
    case 'quote':
      return 'bg-[#cb9da2] text-[#151515]'
    case 'short':
      return 'bg-[#bbb2ce] text-[#453b60]'
    default:
      return 'bg-[#e5e6e1] text-[#151515]'
  }
})

const mediaAspectClass = computed(() => {
  switch (props.index % 3) {
    case 0:
      return 'aspect-[4/5]'
    case 1:
      return 'aspect-[16/10]'
    default:
      return 'aspect-[3/4]'
  }
})
</script>
