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

const indexLabel = computed(() => String(props.index + 1).padStart(2, '0'))
const hasThumbnail = computed(() => Boolean(props.post.display.primaryImage))
const hasVideo = computed(() => Boolean(props.post.display.videoEmbedUrl))
</script>

<template>
  <NuxtLink
    :to="`/blog/${post.slug}`"
    class="group block border-t border-[#e5e6e1] py-6 transition-colors hover:bg-[#f9f9f7]"
  >
    <div class="grid gap-5 lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-8">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#808080]">
        <span>{{ indexLabel }}</span>
        <span class="text-[#d0d0ca]">&middot;</span>
        <span>{{ post.display.typeLabel }}</span>
        <template v-if="post.tags?.length">
          <span class="text-[#d0d0ca]">&middot;</span>
          <span class="capitalize">{{ post.tags[0] }}</span>
        </template>
        <time class="mt-1 block w-full text-[#3a4444]" :datetime="post.displayDate">
          {{ post.displayDate }}
        </time>
      </div>

      <div class="min-w-0">
        <div class="flex gap-4">
          <div v-if="hasThumbnail || hasVideo" class="hidden shrink-0 sm:block">
            <div
              v-if="hasThumbnail"
              class="h-24 w-20 overflow-hidden rounded-[8px] border border-[#333333] bg-[#e5e6e1]"
            >
              <img
                :src="post.display.primaryImage"
                :alt="post.title || ''"
                class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div
              v-else
              class="flex h-24 w-20 items-center justify-center rounded-[8px] border border-[#333333] bg-[#e5e6e1] font-mono text-[10px] uppercase tracking-[0.16em] text-[#3a4444]"
            >
              Video
            </div>
          </div>

          <div class="min-w-0">
            <p
              v-if="post.display.type === 'quote'"
              class="font-serif text-2xl leading-tight tracking-tight text-[#151515] sm:text-[2rem]"
            >
              {{ post.display.quoteText }}
            </p>

            <h3 v-else class="font-serif text-xl leading-snug tracking-tight text-[#151515] sm:text-[1.7rem]">
              {{ post.title || post.display.plainText }}
            </h3>

            <p
              v-if="post.display.type === 'article' && post.display.previewText"
              class="mt-3 line-clamp-3 text-[15px] leading-relaxed text-[#3a4444]"
            >
              {{ post.display.previewText }}
            </p>

            <p
              v-else-if="post.display.type === 'short'"
              class="mt-3 text-[15px] leading-relaxed text-[#3a4444]"
            >
              {{ post.display.plainText }}
            </p>

            <span class="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#151515]">
              Read entry
              <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
