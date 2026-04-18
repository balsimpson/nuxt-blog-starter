<script setup lang="ts">
import { computed, ref, watch, markRaw } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { api } from '~~/convex/_generated/api'
import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { ImageUpload } from '~/utils/EditorImageUploadExtension'
import { Youtube } from '@tiptap/extension-youtube'

definePageMeta({
  layout: false,
  ssr: false
})

type PostStatus = 'draft' | 'published'

const route = useRoute()
const router = useRouter()

const title = ref('')
const slug = ref('')
const author = ref('')
const content = ref('')
const status = ref<PostStatus>('draft')
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const saveError = ref<string | null>(null)
const lastSavedAt = ref<number | null>(null)
const hydratedId = ref<string | null>(null)

// Metadata fields
const excerpt = ref('')
const image = ref('')
const tags = ref<string[]>([])
const video = ref('')
const originalSource = ref('')
const originalPublishedAt = ref<number | null>(null)
const originalPublishedAtDate = computed({
  get: () => originalPublishedAt.value ? new Date(originalPublishedAt.value).toISOString().split('T')[0] : '',
  set: (val: string) => {
    originalPublishedAt.value = val ? new Date(val).getTime() : null
  }
})

const tagsString = computed({
  get: () => tags.value.join(', '),
  set: (val: string) => {
    tags.value = val.split(',').map(s => s.trim()).filter(Boolean)
  }
})

const isSettingsOpen = ref(false)

const postId = computed(() => hydratedId.value)

const normalizedSlug = computed(() => slug.value.trim())

const extensions = [markRaw(ImageUpload), markRaw(Youtube.configure({ inline: false, controls: true }))]

const customHandlers = {
  imageUpload: {
    canExecute: (editor: Editor) => editor.can().insertContent({ type: 'imageUpload' }),
    execute: (editor: Editor) => editor.chain().focus().insertContent({ type: 'imageUpload' }),
    isActive: (editor: Editor) => editor.isActive('imageUpload'),
    isDisabled: undefined
  },
  youtubeEmbed: {
    canExecute: (_editor: Editor) => true,
    execute: (editor: Editor) => {
      const url = prompt('Enter YouTube video URL:')
      if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run()
    },
    isActive: (editor: Editor) => editor.isActive('youtube'),
    isDisabled: undefined
  }
} satisfies EditorCustomHandlers

const toolbarItems: EditorToolbarItem[] = [
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
  { kind: 'heading', level: 1, icon: 'i-lucide-heading-1' },
  { kind: 'heading', level: 2, icon: 'i-lucide-heading-2' },
  { kind: 'textAlign', align: 'left', icon: 'i-lucide-align-left' },
  { kind: 'textAlign', align: 'center', icon: 'i-lucide-align-center' },
  { kind: 'bulletList', icon: 'i-lucide-list' },
  { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
  { kind: 'blockquote', icon: 'i-lucide-quote' },
  { kind: 'link', icon: 'i-lucide-link' },
  {
    kind: 'horizontalRule',
    label: '',
    icon: 'i-lucide-separator-horizontal'
  },
  {
    kind: 'imageUpload',
    icon: 'i-lucide-image',
    label: 'Add image',
    variant: 'soft'
  },
  {
    kind: 'youtubeEmbed',
    icon: 'i-lucide-youtube',
    label: 'Embed video',
    variant: 'soft'
  }
]

const { mutate: upsertPost, isPending: isSaving } = useConvexMutation(api.posts.upsert)
const { mutate: removePost } = useConvexMutation(api.posts.remove)
const convex = useConvexClient()

async function onDeletePost() {
  if (postId.value && confirm('Are you sure you want to delete this post?')) {
    try {
      await removePost({ id: postId.value as any })
      router.replace('/admin')
    } catch (e) {
      console.error('Failed to delete post:', e)
      saveError.value = 'Failed to delete post.'
      saveState.value = 'error'
    }
  }
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

// Auto-generate slug from title
watch(title, (newTitle) => {
  if (newTitle) {
    slug.value = slugify(newTitle)
  }
})

// Debounced auto-save for drafts
watchDebounced(
  [title, slug, content],
  () => {
    if (title.value || content.value) {
      savePost(status.value, true) // Preserve current status on auto-save
    }
  },
  { debounce: 2000, maxWait: 5000 }
)

watch(
  () => route.query.id,
  (id) => {
    if (typeof id === 'string' && id !== hydratedId.value) {
      loadPost(id)
    } else if (!id) {
      createNewPost()
    }
  },
  { immediate: true }
)

async function loadPost(id: string) {
  try {
    const post = await convex.query(api.posts.getById, { id: id as any })
    if (post) {
      title.value = post.title || ''
      slug.value = post.slug
      author.value = post.author || ''
      content.value = post.content
      status.value = post.contentType === 'draft' ? 'draft' : 'published'
      lastSavedAt.value = post.updatedAt
      hydratedId.value = post._id

      // Load metadata
      excerpt.value = post.excerpt || ''
      image.value = post.image || ''
      video.value = (post as any).video || ''
      tags.value = post.tags || []
      originalSource.value = post.originalSource || ''
      originalPublishedAt.value = post.originalPublishedAt || null

      saveState.value = 'idle'
      saveError.value = null
    }
  } catch (e) {
    console.error('Failed to load post:', e)
  }
}

const pageTitle = computed(() => (postId.value ? 'Edit post' : 'Create post'))
const pageDescription = computed(() =>
  postId.value
    ? 'Update the post and save it as a draft or publish it immediately.'
    : 'Create a new post, save it as a draft, or publish it from this dedicated editor.'
)

const editorStateLabel = computed(() => (status.value === 'draft' ? 'Draft' : 'Published'))

async function savePost(nextStatus: PostStatus, isAutoSave = false) {
  if (!isAutoSave) {
    saveState.value = 'saving'
  }
  saveError.value = null

  try {
    const currentSlug = (slug.value && slug.value !== 'untitled') ? slug.value : (slugify(title.value) || 'untitled')
    const saved = await upsertPost({
      id: (hydratedId.value || undefined) as any,
      slug: currentSlug,
      title: title.value.trim() || undefined,
      author: author.value || undefined,
      content: content.value,
      contentType: nextStatus === 'draft' ? 'draft' : 'published',
      publishStatus: nextStatus,
      excerpt: excerpt.value || undefined,
      image: image.value || undefined,
      video: video.value || undefined,
      tags: tags.value.length > 0 ? tags.value : undefined,
      originalSource: originalSource.value || undefined,
      originalPublishedAt: originalPublishedAt.value || undefined
    })

    if (saved) {
      slug.value = saved.slug
      status.value = (saved.contentType as PostStatus)
      lastSavedAt.value = saved.updatedAt
      hydratedId.value = saved._id
      saveState.value = 'saved'

      if (!isAutoSave && route.query.id !== saved._id) {
        await router.replace({ query: { id: saved._id } })
      }
    }
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Unable to save the post.'
    saveState.value = 'error'
  }
}

function createNewPost() {
  if (!hydratedId.value && !title.value && !content.value) return

  title.value = ''
  slug.value = ''
  author.value = ''
  content.value = ''
  status.value = 'draft'
  saveState.value = 'idle'
  saveError.value = null
  lastSavedAt.value = null
  hydratedId.value = null

  // Reset metadata
  excerpt.value = ''
  image.value = ''
  video.value = ''
  tags.value = []
  originalSource.value = ''
  originalPublishedAt.value = null

  router.replace({ query: {} })
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-default">
    <UEditor
      v-slot="{ editor }"
      v-model="content"
      :extensions="extensions"
      :handlers="customHandlers"
      content-type="markdown"
      class="flex flex-col flex-1"
      :ui="{
        base: 'p-8 sm:p-16 lg:p-24 max-w-4xl mx-auto focus:outline-none flex-1',
        content: 'prose prose-primary dark:prose-invert max-w-none'
      }"
    >
      <!-- Combined Sticky Header & Toolbar -->
      <div class="sticky top-0 z-20 border-b max-w-4xl mx-auto w-full border-muted bg-default/90 backdrop-blur">
        <div class="flex flex-col gap-4 p-4 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <UButton
                to="/admin"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-left"
              />
              <!-- <div>
                <h1 class="text-sm font-semibold tracking-tight">{{ pageTitle }}</h1>
                <p class="text-xs text-muted">{{ editorStateLabel }} · {{ normalizedSlug || 'no slug' }}</p>
              </div> -->
            </div>

            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 text-xs mr-2">
                <template v-if="saveState === 'saved' && lastSavedAt">
                  <UIcon
                    name="i-lucide-check-circle-2"
                    class="text-success h-3.5 w-3.5"
                  />
                  <span class="text-muted hidden sm:inline">Saved at {{ new Date(lastSavedAt).toLocaleTimeString() }}</span>
                </template>
                <template v-else-if="saveState === 'saving' || isSaving">
                  <UIcon
                    name="i-lucide-refresh-cw"
                    class="h-3.5 w-3.5 animate-spin"
                  />
                  <span class="text-muted hidden sm:inline">Saving...</span>
                </template>
              </div>

              <UButton
                v-if="postId"
                color="error"
                variant="soft"
                size="sm"
                icon="i-lucide-trash-2"
                @click="onDeletePost"
              >
                <span class="hidden sm:inline">Delete</span>
              </UButton>
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-settings"
                @click="isSettingsOpen = true"
              >
                <span class="hidden sm:inline">Settings</span>
              </UButton>

              <template v-if="status === 'published'">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-eye-off"
                  @click="savePost('draft')"
                >
                  Unpublish
                </UButton>
                <UButton
                  color="primary"
                  size="sm"
                  :loading="isSaving"
                  icon="i-lucide-check"
                  @click="savePost('published')"
                >
                  Update
                </UButton>
              </template>
              <template v-else>
                <UButton
                  color="primary"
                  size="sm"
                  :loading="isSaving"
                  icon="i-lucide-rocket"
                  @click="savePost('published')"
                >
                  Publish
                </UButton>
              </template>
            </div>
          </div>

          <div class="grid w-full">
            <UTextarea
              v-model="title"
              placeholder="Post title..."
              variant="none"
              class="w-full"
              :rows="1"
              autoresize
              :ui="{
                base: 'p-0 text-4xl sm:text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white overflow-hidden resize-none'
              }"
            />
            <!-- <UInput v-model="slug" placeholder="slug" icon="i-lucide-file-text" size="sm" variant="soft" /> -->
          </div>
        </div>

        <div class="border-t border-muted bg-default px-4 py-2 lg:px-8">
          <UEditorToolbar
            :editor="editor"
            :items="toolbarItems"
            class="overflow-x-auto justify-center "
            :ui="{group: 'flex-wrap'}"
          />
        </div>
      </div>
    </UEditor>

    <!-- Footer Error Status -->
    <p
      v-if="saveState === 'error'"
      class="fixed bottom-4 right-4 z-30 rounded-lg bg-error-50 px-4 py-2 text-sm text-error shadow-lg"
    >
      {{ saveError }}
    </p>

    <!-- Settings Slideover -->
    <USlideover
      v-model:open="isSettingsOpen"
      title="Post Settings"
      description="Manage post metadata and optional fields."
    >
      <template #body>
        <div class="flex flex-col gap-6 p-4">
          <UFormField
            name="slug"
            label="Slug"
            help="The URL-friendly version of the title."
          >
            <UInput
              v-model="slug"
              placeholder="post-slug"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="author"
            label="Author"
            help="The name of the post author."
          >
            <UInput
              v-model="author"
              placeholder="Author name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="excerpt"
            label="Excerpt"
            help="A brief summary of the post."
          >
            <UTextarea
              v-model="excerpt"
              placeholder="Summary..."
              autoresize
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="tags"
            label="Tags"
            help="Comma-separated tags."
          >
            <UInput
              v-model="tagsString"
              placeholder="tech, news, etc."
              class="w-full"
            />
          </UFormField>

          <!-- <UDivider /> -->

          <UFormField
            name="originalSource"
            label="Original Source URL"
            help="Link to the original article if cross-posted."
          >
            <UInput
              v-model="originalSource"
              placeholder="https://example.com/post"
              icon="i-lucide-link"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="originalPublishedAt"
            label="Original Published Date"
            help="When this was first published elsewhere."
          >
            <UInput
              v-model="originalPublishedAtDate"
              type="date"
              icon="i-lucide-calendar"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="image"
            label="Featured Image URL"
            help="URL for the post cover image."
          >
            <UInput
              v-model="image"
              placeholder="https://..."
              icon="i-lucide-image"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="video"
            label="Featured Video URL"
            help="YouTube URL shown instead of image on the blog listing."
          >
            <UInput
              v-model="video"
              placeholder="https://youtube.com/watch?v=..."
              icon="i-lucide-youtube"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          @click="isSettingsOpen = false"
        >
          Close
        </UButton>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
:deep(.tiptap) {
  outline: none;
}
</style>
