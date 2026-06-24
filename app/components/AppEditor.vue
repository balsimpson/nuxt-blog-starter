<script setup lang="ts">
import { computed, markRaw, ref, shallowRef, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'
import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import type { Editor as CoreEditor } from '@tiptap/core'
import { Youtube } from '@tiptap/extension-youtube'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorImagePaste } from '~/utils/EditorImagePasteExtension'
import { extractPostImages } from '~/utils/postImages'
import { extractPostVideos, getYoutubeThumbnail } from '~/utils/postVideos'

type PostStatus = 'draft' | 'published'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const props = withDefaults(defineProps<{
  postId?: Id<'posts'>
  demo?: boolean
  showSettings?: boolean
  showBubbleMenu?: boolean
  backTo?: string
  flat?: boolean
}>(), {
  demo: false,
  showSettings: true,
  showBubbleMenu: true,
  flat: false
})

const emit = defineEmits<{
  saved: [id: Id<'posts'>]
  deleted: [id: Id<'posts'>]
}>()

const title = ref('')
const slug = ref('')
const isSlugCustomized = ref(false)
const author = ref('')
const content = ref('')
const status = ref<PostStatus>('draft')
const saveState = ref<SaveState>('idle')
const saveError = ref<string | null>(null)
const lastSavedAt = ref<number | null>(null)
const hydratedId = ref<Id<'posts'> | null>(null)
const isSettingsOpen = ref(false)

const excerpt = ref('')
const featuredImage = ref('')
const featuredVideo = ref('')
const tags = ref<string[]>([])
const originalSource = ref('')
const originalPublishedAt = ref<number | null>(null)

const imageUploadPicker = ref<{ inputRef?: HTMLInputElement } | null>(null)
const selectedImageFiles = ref<File[] | null>(null)
const imageUploadTarget = shallowRef<{ editor: CoreEditor, from: number, to: number } | null>(null)
const isImageUploading = ref(false)
const toast = useToast()

const { mutate: generateImageUploadUrl } = useConvexMutation(api.uploads.generateUploadUrl)
const { mutate: saveUploadedImage } = useConvexMutation(api.uploads.saveImage)

function openImagePicker(editor: Editor) {
  if (isImageUploading.value) return

  const input = imageUploadPicker.value?.inputRef

  if (!input) {
    toast.add({
      title: 'Image picker unavailable',
      description: 'Please try adding the image again.',
      color: 'error'
    })
    return
  }

  imageUploadTarget.value = {
    editor,
    from: editor.state.selection.from,
    to: editor.state.selection.to
  }
  selectedImageFiles.value = null
  input.value = ''
  input.click()
}

async function uploadImage(file: File) {
  const uploadUrl = await generateImageUploadUrl({})
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: file.type ? { 'Content-Type': file.type } : undefined,
    body: file
  })

  if (!response.ok) {
    throw new Error('The image upload was not accepted.')
  }

  const { storageId } = await response.json() as { storageId?: Id<'_storage'> }
  if (!storageId) {
    throw new Error('The image upload could not be completed.')
  }

  const { url } = await saveUploadedImage({
    storageId,
    filename: file.name || undefined,
    contentType: file.type || undefined,
    size: file.size || undefined
  })

  if (!url) {
    throw new Error('The uploaded image could not be opened.')
  }

  return url
}

async function insertImageFiles(
  files: File[],
  target: { editor: CoreEditor, from: number, to: number }
) {
  if (files.length === 0 || isImageUploading.value) return

  isImageUploading.value = true

  try {
    const uploadedImages = []

    for (const file of files) {
      uploadedImages.push({
        src: await uploadImage(file),
        alt: file.name || 'Pasted image',
        title: file.name || undefined
      })
    }

    const inserted = target.editor
      .chain()
      .focus()
      .insertContentAt(
        { from: target.from, to: target.to },
        uploadedImages.map(attrs => ({ type: 'image', attrs }))
      )
      .run()

    if (!inserted) {
      throw new Error('The images could not be inserted into the post.')
    }
  } catch (error) {
    toast.add({
      title: files.length > 1 ? 'Image uploads failed' : 'Image upload failed',
      description: error instanceof Error ? error.message : 'Please try adding the images again.',
      color: 'error'
    })
  } finally {
    isImageUploading.value = false
  }
}

watch(selectedImageFiles, async (files) => {
  const target = imageUploadTarget.value
  if (!files?.length || !target) return

  await insertImageFiles(files, target)
  selectedImageFiles.value = null
  imageUploadTarget.value = null
})

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

const contentImages = computed(() => extractPostImages(content.value))
const contentVideos = computed(() => extractPostVideos(content.value))

watch(contentImages, (images) => {
  if (!featuredImage.value || !images.includes(featuredImage.value)) {
    featuredImage.value = images[0] || ''
  }
}, { immediate: true })

watch(contentVideos, (videos) => {
  if (!featuredVideo.value || !videos.includes(featuredVideo.value)) {
    featuredVideo.value = videos[0] || ''
  }
}, { immediate: true })

const currentPostId = computed(() => hydratedId.value)

const extensions = [
  markRaw(EditorImagePaste.configure({
    onPasteImages: (files, editor, range) => {
      void insertImageFiles(files, { editor, ...range })
    }
  })),
  markRaw(Youtube.configure({ inline: false, controls: true })),
  Placeholder.configure({
    placeholder: 'Start writing your next post...',
  }),
]

const customHandlers = {
  imageUpload: {
    canExecute: (editor: Editor) => editor.isEditable && !isImageUploading.value,
    execute: (editor: Editor) => {
      openImagePicker(editor)
      return editor.chain()
    },
    isActive: (_editor: Editor) => false,
    isDisabled: undefined
  },
  youtubeEmbed: {
    canExecute: () => true,
    execute: (editor: Editor) => {
      const url = prompt('Enter YouTube video URL:')
      if (!url) return editor.chain()

      return editor.chain().focus().setYoutubeVideo({ src: url })
    },
    isActive: (editor: Editor) => editor.isActive('youtube'),
    isDisabled: undefined
  }
} satisfies EditorCustomHandlers

const toolbarItems = computed<EditorToolbarItem[]>(() => [
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
  { kind: 'horizontalRule', label: '', icon: 'i-lucide-separator-horizontal' },
  {
    kind: 'imageUpload',
    icon: isImageUploading.value ? 'i-lucide-loader-circle' : 'i-lucide-image',
    label: isImageUploading.value ? 'Adding...' : 'Add image',
    loading: isImageUploading.value,
    class: 'min-w-28 justify-center',
    variant: 'soft'
  },
  { kind: 'youtubeEmbed', icon: 'i-lucide-youtube', label: 'Embed video', variant: 'soft' }
])

const bubbleMenuItems: EditorToolbarItem[] = [
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
  { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
]

const getBubbleMenuContainer = () => document.body

const { mutate: upsertPost, isPending: isSaving } = useConvexMutation(api.posts.upsert)
const { mutate: removePost } = useConvexMutation(api.posts.remove)
const convex = useConvexClient()

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

watch(title, (newTitle) => {
  if (!isSlugCustomized.value) {
    slug.value = slugify(newTitle)
  }
})

function onSlugInput(value: string) {
  slug.value = value
  isSlugCustomized.value = value.trim().length > 0

  if (!isSlugCustomized.value) {
    slug.value = slugify(title.value)
  }
}

if (!props.demo) {
  watchDebounced(
    [
      title,
      slug,
      content,
      excerpt,
      author,
      tags,
      originalSource,
      originalPublishedAt,
      featuredImage,
      featuredVideo
    ],
    () => {
      if (title.value || content.value) {
        savePost(status.value, true)
      }
    },
    { debounce: 2000, maxWait: 5000 }
  )

  watch(
    () => props.postId,
    (id) => {
      if (id) {
        loadPost(id)
      } else {
        createNewPost()
      }
    },
    { immediate: true }
  )
}

async function loadPost(id: Id<'posts'>) {
  try {
    const post = await convex.query(api.posts.getById, { id })
    if (post) {
      isSlugCustomized.value = true
      title.value = post.title || ''
      slug.value = post.slug
      author.value = post.author || ''
      content.value = post.content
      status.value = post.contentType === 'draft' ? 'draft' : 'published'
      lastSavedAt.value = post.updatedAt
      hydratedId.value = post._id

      excerpt.value = post.excerpt || ''
      featuredImage.value = post.featuredImage || post.images?.[0] || contentImages.value[0] || ''
      featuredVideo.value = post.featuredVideo || post.videos?.[0] || contentVideos.value[0] || ''
      tags.value = post.tags || []
      originalSource.value = post.originalSource || ''
      originalPublishedAt.value = post.originalPublishedAt || post.publishedAt || null

      saveState.value = 'idle'
      saveError.value = null
    }
  } catch (e) {
    console.error('Failed to load post:', e)
  }
}

const pageTitle = computed(() => (currentPostId.value ? 'Edit post' : 'Create post'))

async function savePost(nextStatus: PostStatus, isAutoSave = false) {
  if (props.demo) {
    return
  }

  if (!isAutoSave) {
    saveState.value = 'saving'
  }
  saveError.value = null

  try {
    const currentSlug = (slug.value && slug.value !== 'untitled') ? slug.value : (slugify(title.value) || 'untitled')
    const payload = {
      id: hydratedId.value || undefined,
      slug: currentSlug,
      title: title.value.trim() || undefined,
      author: author.value || undefined,
      content: content.value,
      contentType: nextStatus === 'draft' ? 'draft' : 'published',
      publishStatus: nextStatus,
      excerpt: excerpt.value || undefined,
      images: contentImages.value.length > 0 ? contentImages.value : undefined,
      featuredImage: featuredImage.value || contentImages.value[0] || undefined,
      videos: contentVideos.value.length > 0 ? contentVideos.value : undefined,
      featuredVideo: featuredVideo.value || contentVideos.value[0] || undefined,
      tags: tags.value.length > 0 ? tags.value : undefined,
      originalSource: originalSource.value || undefined,
      originalPublishedAt: originalPublishedAt.value || undefined
    }

    const saved = await upsertPost(payload)
    if (saved) {
      slug.value = saved.slug
      status.value = (saved.contentType as PostStatus)
      lastSavedAt.value = saved.updatedAt
      hydratedId.value = saved._id
      originalPublishedAt.value = saved.originalPublishedAt || saved.publishedAt || null
      saveState.value = 'saved'
      emit('saved', saved._id)
    }
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Unable to save the post.'
    saveState.value = 'error'
  }
}

async function onDeletePost() {
  if (props.demo) {
    createNewPost()
    return
  }

  const id = currentPostId.value
  if (id && confirm('Are you sure you want to delete this post?')) {
    try {
      await removePost({ id })
      createNewPost()
      emit('deleted', id)
    } catch (e) {
      console.error('Failed to delete post:', e)
      saveError.value = 'Failed to delete post.'
      saveState.value = 'error'
    }
  }
}

function createNewPost() {
  if (!hydratedId.value && !title.value && !content.value) return

  title.value = ''
  slug.value = ''
  isSlugCustomized.value = false
  author.value = ''
  content.value = ''
  status.value = 'draft'
  saveState.value = 'idle'
  saveError.value = null
  lastSavedAt.value = null
  hydratedId.value = null

  excerpt.value = ''
  featuredImage.value = ''
  featuredVideo.value = ''
  tags.value = []
  originalSource.value = ''
  originalPublishedAt.value = null
}
</script>

<template>
  <div
    class="flex w-full min-w-0 flex-col bg-default"
    :class="props.flat
      ? 'min-h-screen'
      : 'min-h-[520px] overflow-hidden rounded-3xl border border-muted/40 shadow-sm'"
  >
    <UEditor
      v-slot="{ editor }"
      v-model="content"
      :extensions="extensions"
      :handlers="customHandlers"
      content-type="markdown"
      class="flex flex-col flex-1 w-full min-w-0"
      :ui="{
        base: 'mx-auto w-full max-w-4xl p-4 focus:outline-none flex-1 min-w-0',
        content: 'p-4 prose prose-site max-w-none break-words min-w-0'
      }"
    >
      <div class="sticky top-0 z-20 border-b border-muted bg-default/90 backdrop-blur min-w-0">
        <div class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-3 p-3 sm:p-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div v-if="!props.demo" class="flex items-center gap-4 min-w-0">
              <UButton
                v-if="props.backTo"
                :to="props.backTo"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-left"
                aria-label="Back"
              />

              <div>
                <h2 class="text-lg font-semibold text-highlighted">{{ pageTitle }}</h2>
                <p class="text-sm text-muted">Update the post and save it as a draft or publish it immediately.</p>
              </div>
            </div>

            <div v-if="!props.demo" class="flex flex-wrap items-center gap-2 min-w-0">
              <div class="hidden items-center gap-1.5 text-xs sm:flex">
                <template v-if="saveState === 'saved' && lastSavedAt">
                  <UIcon name="i-lucide-check-circle-2" class="text-success h-3.5 w-3.5" />
                  <span class="text-muted">Saved at {{ new Date(lastSavedAt).toLocaleTimeString() }}</span>
                </template>
                <template v-else-if="saveState === 'saving' || isSaving">
                  <UIcon name="i-lucide-refresh-cw" class="h-3.5 w-3.5 animate-spin" />
                  <span class="text-muted">Saving...</span>
                </template>
              </div>

              <UButton
                v-if="props.showSettings"
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-settings"
                @click="isSettingsOpen = true"
              >
                Settings
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

              <UButton
                color="error"
                variant="soft"
                size="sm"
                icon="i-lucide-trash-2"
                @click="onDeletePost"
              >
                {{ props.demo ? 'Reset' : 'Delete' }}
              </UButton>
            </div>
          </div>

          <div class="grid w-full min-w-0">
            <UTextarea
              v-model="title"
              placeholder="Post title..."
              variant="none"
              class="pt-4 text-3xl font-bold text-highlighted sm:text-4xl md:text-5xl"
              :rows="1"
              autoresize
              :ui="{ base: 'p-0 min-h-0 md:text-2xl text-2xl' }"
            />
          </div>
        </div>

        <div class="border-t border-muted bg-default px-3 py-2">
          <UEditorToolbar
            :editor="editor"
            :items="toolbarItems"
            class="mx-auto w-full max-w-4xl flex-wrap justify-center overflow-x-auto"
            :ui="{group: 'flex-wrap'}"
          />
        </div>
      </div>

      <UFileUpload
        ref="imageUploadPicker"
        v-model="selectedImageFiles"
        accept="image/*"
        multiple
        :preview="false"
        class="hidden"
      />

      <UEditorToolbar
        v-if="props.showBubbleMenu"
        :editor="editor"
        :items="bubbleMenuItems"
        layout="bubble"
        :append-to="getBubbleMenuContainer"
        :options="{ placement: 'top', strategy: 'fixed' }"
        :ui="{ root: 'z-50', base: 'shadow-lg' }"
      />
    </UEditor>

    <p
      v-if="saveState === 'error'"
      class="bg-error-50 px-4 py-3 text-sm text-error"
      :class="{ 'rounded-b-3xl': !props.flat }"
    >
      {{ saveError }}
    </p>

    <USlideover
      v-if="props.showSettings && !props.demo"
      v-model:open="isSettingsOpen"
      title="Post Settings"
      description="Manage post metadata and optional fields."
    >
      <template #body>
        <div class="flex flex-col gap-6 p-4">
          <UFormField name="slug" label="Slug" help="The URL-friendly version of the title.">
            <UInput
              :model-value="slug"
              placeholder="post-slug"
              class="w-full"
              @update:model-value="onSlugInput"
            />
          </UFormField>

          <UFormField name="excerpt" label="Excerpt" help="A brief summary of the post.">
            <UTextarea v-model="excerpt" placeholder="Summary..." autoresize :rows="3" class="w-full" />
          </UFormField>

          <UFormField name="author" label="Author" help="The name shown as the post author.">
            <UInput v-model="author" placeholder="Author name" class="w-full" />
          </UFormField>

          <UFormField name="tags" label="Tags" help="Comma-separated tags.">
            <UInput v-model="tagsString" placeholder="tech, news, etc." class="w-full" />
          </UFormField>

          <UFormField name="originalSource" label="Original Source URL" help="Link to the original article if cross-posted.">
            <UInput v-model="originalSource" placeholder="https://example.com/post" icon="i-lucide-link" class="w-full" />
          </UFormField>

          <UFormField
            name="originalPublishedAt"
            label="Original published date"
            help="Defaults to this post's first publish date. Change it when the article was originally published elsewhere."
          >
            <UInput v-model="originalPublishedAtDate" type="date" icon="i-lucide-calendar" class="w-full" />
          </UFormField>

          <UFormField
            name="featuredImage"
            label="Featured image"
            help="The first image is selected automatically. Choose another image to use it as the cover."
          >
            <div
              v-if="contentImages.length"
              class="grid h-64 auto-rows-[7rem] grid-cols-2 content-start gap-3 overflow-y-auto pr-1"
            >
              <button
                v-for="(postImage, index) in contentImages"
                :key="postImage"
                type="button"
                class="group relative h-28 min-h-28 overflow-hidden rounded-lg border-2 bg-muted text-left transition"
                :class="featuredImage === postImage
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-muted hover:border-primary/50'"
                :aria-label="`Use image ${index + 1} as the featured image`"
                :aria-pressed="featuredImage === postImage"
                @click="featuredImage = postImage"
              >
                <img
                  :src="postImage"
                  :alt="`Post image ${index + 1}`"
                  class="h-full w-full object-cover transition group-hover:scale-[1.02]"
                >
                <span
                  v-if="featuredImage === postImage"
                  class="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-md bg-default/90 px-2 py-1 text-xs font-medium text-highlighted shadow-sm backdrop-blur"
                >
                  <UIcon name="i-lucide-check" class="size-3.5 text-primary" />
                  Featured
                </span>
              </button>
            </div>

            <div v-else class="rounded-lg border border-dashed border-muted px-4 py-5 text-center">
              <UIcon name="i-lucide-images" class="mx-auto size-6 text-muted" />
              <p class="mt-2 text-sm font-medium text-highlighted">No images in this post yet</p>
              <p class="mt-1 text-xs text-muted">Use Add image in the editor toolbar or paste an image into the article.</p>
            </div>
          </UFormField>

          <UFormField
            name="featuredVideo"
            label="Featured video"
            help="The first embedded YouTube video is selected automatically. Choose another video to feature it."
          >
            <div v-if="contentVideos.length" class="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto pr-1">
              <button
                v-for="(postVideo, index) in contentVideos"
                :key="postVideo"
                type="button"
                class="group relative aspect-video overflow-hidden rounded-lg border-2 bg-muted text-left transition"
                :class="featuredVideo === postVideo
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-muted hover:border-primary/50'"
                :aria-label="`Use video ${index + 1} as the featured video`"
                :aria-pressed="featuredVideo === postVideo"
                @click="featuredVideo = postVideo"
              >
                <img
                  v-if="getYoutubeThumbnail(postVideo)"
                  :src="getYoutubeThumbnail(postVideo)"
                  :alt="`Video ${index + 1} thumbnail`"
                  class="h-full w-full object-cover transition group-hover:scale-[1.02]"
                >
                <UIcon
                  name="i-lucide-play"
                  class="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-default/90 p-2 text-primary shadow-sm"
                />
                <span
                  v-if="featuredVideo === postVideo"
                  class="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-md bg-default/90 px-2 py-1 text-xs font-medium text-highlighted shadow-sm backdrop-blur"
                >
                  <UIcon name="i-lucide-check" class="size-3.5 text-primary" />
                  Featured
                </span>
              </button>
            </div>

            <div v-else class="rounded-lg border border-dashed border-muted px-4 py-5 text-center">
              <UIcon name="i-lucide-youtube" class="mx-auto size-6 text-muted" />
              <p class="mt-2 text-sm font-medium text-highlighted">No videos in this post yet</p>
              <p class="mt-1 text-xs text-muted">Use Embed video in the editor toolbar or paste a YouTube URL into the article.</p>
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" @click="isSettingsOpen = false">Close</UButton>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
:deep(.tiptap) {
  outline: none;
}
</style>
