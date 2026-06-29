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
  featured?: boolean
}>()

const indexLabel = computed(() => String(props.index + 1).padStart(2, '0'))

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

const hasMedia = computed(() => Boolean(props.post.display.primaryImage || props.post.display.videoEmbedUrl))
</script>

<template>
  <NuxtLink :to="`/blog/${post.slug}`" class="group block min-w-0">
    <div
      :class="[
        'rounded-[8px] border border-[#333333] p-6 transition-transform duration-300 group-hover:-translate-y-0.5',
        featured ? 'p-7 sm:p-8' : '',
        toneClass
      ]"
    >
      <div class="flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.2em]">
        <span>{{ post.display.typeLabel }}</span>
        <span class="text-current/60">{{ indexLabel }}</span>
      </div>

      <div v-if="featured && hasMedia" class="mt-6 overflow-hidden rounded-[6px] border border-[#333333]/30 bg-[#ffffff]">
        <div v-if="post.display.primaryImage" class="aspect-[16/10]">
          <img
            :src="post.display.primaryImage"
            :alt="post.title || ''"
            class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>

        <iframe
          v-else
          :src="`${post.display.videoEmbedUrl}?autoplay=0&mute=1&controls=1`"
          class="aspect-[16/10] h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        />
      </div>

      <p
        v-else-if="post.display.type === 'quote'"
        class="mt-5 font-serif text-2xl leading-tight tracking-tight sm:text-[2rem]"
      >
        {{ post.display.quoteText }}
      </p>

      <div v-else class="mt-5">
        <h3 class="font-serif text-[22px] leading-[1.12] tracking-tight sm:text-3xl">
          {{ post.title || post.display.plainText }}
        </h3>

        <p
          v-if="post.display.type !== 'short' && post.display.previewText"
          class="mt-3 line-clamp-4 text-sm leading-6 text-current/75"
        >
          {{ post.display.previewText }}
        </p>

        <p
          v-else-if="post.display.type === 'short'"
          class="mt-3 text-sm leading-6 text-current/75"
        >
          {{ post.display.plainText }}
        </p>
      </div>

      <div class="mt-6 flex items-center justify-between border-t border-[#333333]/30 pt-4 font-mono text-[11px] uppercase tracking-[0.16em]">
        <time :datetime="post.displayDate">{{ post.displayDate }}</time>
        <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
      </div>
    </div>
  </NuxtLink>
</template>
