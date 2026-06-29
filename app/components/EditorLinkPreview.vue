<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { api } from '~~/convex/_generated/api'

const props = defineProps(nodeViewProps)

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

const loadState = ref<LoadState>('idle')
const isEditing = ref(false)
const draftUrl = ref('')
const toast = useToast()

const url = computed(() => (props.node.attrs.url as string) ?? '')
const title = computed(() => (props.node.attrs.title as string) ?? '')
const description = computed(() => (props.node.attrs.description as string) ?? '')
const image = computed(() => (props.node.attrs.image as string) ?? '')
const siteName = computed(() => (props.node.attrs.siteName as string) ?? '')
const favicon = computed(() => (props.node.attrs.favicon as string) ?? '')

const convex = useConvexClient()

const hasMeta = computed(() => Boolean(title.value || image.value || description.value))

function hostnameOrUrl(value: string): string {
  try {
    const parsed = new URL(value)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

async function fetchAndPersist(target: string) {
  if (!target) {
    loadState.value = 'error'
    return
  }
  if (hasMeta.value) {
    loadState.value = 'loaded'
    return
  }

  loadState.value = 'loading'

  try {
    const result = await convex.action(api.linkPreview.fetchPreview, { url: target })
    if (!result) {
      loadState.value = 'error'
      return
    }
    if (url.value !== target) return

    props.updateAttributes({
      title: result.title || '',
      description: result.description || '',
      image: result.image || '',
      siteName: result.siteName || '',
      favicon: result.favicon || ''
    })
    loadState.value = 'loaded'
  } catch {
    if (url.value === target) loadState.value = 'error'
  }
}

watch(url, (value) => {
  void fetchAndPersist(value)
}, { immediate: true })

function startEdit() {
  draftUrl.value = url.value
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  draftUrl.value = ''
}

function commitEdit() {
  const next = draftUrl.value.trim()
  if (!next) {
    toast.add({
      title: 'A URL is required',
      description: 'Enter a link to keep the preview.',
      color: 'error'
    })
    return
  }

  isEditing.value = false
  props.updateAttributes({
    url: next,
    title: '',
    description: '',
    image: '',
    siteName: '',
    favicon: ''
  })
  draftUrl.value = ''
  void fetchAndPersist(next)
}
</script>

<template>
  <NodeViewWrapper as="div" class="link-preview my-4 not-prose">
    <div
      class="group relative overflow-hidden rounded-xl border border-muted/60 bg-default shadow-sm transition"
      :class="props.selected ? 'ring-2 ring-primary/30' : ''"
    >
      <a
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="block focus:outline-none"
      >
        <div class="flex items-stretch gap-3 p-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 text-xs text-muted">
              <img
                v-if="favicon"
                :src="favicon"
                alt=""
                class="size-4 shrink-0 rounded-sm object-contain"
              >
              <span class="truncate">{{ siteName || hostnameOrUrl(url) }}</span>
            </div>
            <p class="mt-1.5 line-clamp-2 text-sm font-semibold text-highlighted">
              {{ title || url }}
            </p>
            <p
              v-if="description"
              class="mt-1 line-clamp-2 text-xs text-muted"
            >
              {{ description }}
            </p>
          </div>
          <img
            v-if="image"
            :src="image"
            alt=""
            class="hidden aspect-video h-20 w-32 shrink-0 rounded-lg object-cover sm:block"
          >
        </div>
      </a>

      <div
        v-if="loadState === 'loading'"
        class="pointer-events-none absolute inset-0 animate-pulse bg-elevated/40"
      />

      <div
        class="absolute right-2 top-2 flex items-center gap-1"
        :class="isEditing ? 'opacity-100' : 'opacity-0 transition group-hover:opacity-100 focus-within:opacity-100'"
      >
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          color="neutral"
          variant="solid"
          aria-label="Edit link"
          @click="startEdit"
        />
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="solid"
          aria-label="Remove link preview"
          @click="props.deleteNode()"
        />
      </div>

      <form
        v-if="isEditing"
        class="absolute inset-0 z-10 flex items-center gap-2 bg-default/95 p-3 backdrop-blur"
        @submit.prevent="commitEdit"
      >
        <UInput
          v-model="draftUrl"
          type="url"
          size="sm"
          icon="i-lucide-link"
          placeholder="https://example.com"
          class="flex-1"
          autofocus
        />
        <UButton type="submit" size="sm" color="primary" icon="i-lucide-check" label="Save" />
        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-undo-2" aria-label="Cancel" @click="cancelEdit" />
      </form>
    </div>
  </NodeViewWrapper>
</template>
