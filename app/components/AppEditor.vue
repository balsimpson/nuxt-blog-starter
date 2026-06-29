<script setup lang="ts">
import { computed, markRaw, ref, shallowRef, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { ConvexError } from 'convex/values'
import { api } from '~~/convex/_generated/api'
import type { Id } from '~~/convex/_generated/dataModel'
import type { DropdownMenuItem, EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import type { Editor as CoreEditor } from '@tiptap/core'
import { Youtube } from '@tiptap/extension-youtube'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorImagePaste } from '~/utils/EditorImagePasteExtension'
import { LinkPreview } from '~/utils/LinkPreviewExtension'
import { extractPostImages } from '~/utils/postImages'
import { extractPostVideos, getYoutubeThumbnail } from '~/utils/postVideos'

type PostStatus = 'draft' | 'published'
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

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
const isDeleteModalOpen = ref(false)
const isSyncingPost = ref(false)
const editVersion = ref(0)

const excerpt = ref('')
const featuredImage = ref('')
const featuredVideo = ref('')
const tags = ref<string[]>([])
const originalSource = ref('')
const originalPublishedAt = ref<number | null>(null)

const autosaveSources = [
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
]

watch(
  autosaveSources,
  () => {
    if (props.demo || isSyncingPost.value) return

    editVersion.value += 1
    saveState.value = 'dirty'
    saveError.value = null
  },
  { flush: 'sync' }
)

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
  markRaw(LinkPreview),
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
const { mutate: removePost, isPending: isDeleting } = useConvexMutation(api.posts.remove)
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
    autosaveSources,
    () => {
      if (saveState.value === 'dirty' && (title.value || content.value)) {
        void savePost(status.value)
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
  isSyncingPost.value = true

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
  } finally {
    isSyncingPost.value = false
  }
}

const pageTitle = computed(() => (currentPostId.value ? 'Edit entry' : 'New entry'))
const entryStatusLabel = computed(() => status.value === 'published' ? 'Published' : 'Draft')
const deleteModalDescription = computed(() => {
  const entryName = title.value.trim()
    ? `“${title.value.trim()}”`
    : 'this untitled entry'

  return `This permanently deletes ${entryName}. This action cannot be undone.`
})
const moreActions = computed<DropdownMenuItem[][]>(() => [[
  {
    label: 'Delete entry',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: () => {
      isDeleteModalOpen.value = true
    }
  }
]])

function formatSavedTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
}

async function savePost(nextStatus: PostStatus) {
  if (props.demo) {
    return
  }

  const savingVersion = editVersion.value
  saveState.value = 'saving'
  saveError.value = null

  try {
    const currentSlug = (slug.value && slug.value !== 'untitled') ? slug.value : (slugify(title.value) || 'untitled')
    const payload = {
      id: hydratedId.value || undefined,
      slug: currentSlug,
      slugIsCustomized: isSlugCustomized.value,
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
      isSyncingPost.value = true

      try {
        slug.value = saved.slug
        isSlugCustomized.value = true
        status.value = (saved.contentType as PostStatus)
        lastSavedAt.value = saved.updatedAt
        hydratedId.value = saved._id
        originalPublishedAt.value = saved.originalPublishedAt || saved.publishedAt || null
      } finally {
        isSyncingPost.value = false
      }

      saveState.value = editVersion.value === savingVersion ? 'saved' : 'dirty'
      emit('saved', saved._id)
    }
  } catch (error) {
    if (
      error instanceof ConvexError
      && typeof error.data === 'object'
      && error.data !== null
      && 'message' in error.data
      && typeof error.data.message === 'string'
    ) {
      saveError.value = error.data.message

      if ('code' in error.data && error.data.code === 'POST_SLUG_TAKEN') {
        isSettingsOpen.value = true
      }
    } else {
      saveError.value = error instanceof Error ? error.message : 'Unable to save the post.'
    }

    saveState.value = 'error'
  }
}

async function confirmDeletePost() {
  const id = currentPostId.value
  if (!id) return

  try {
    await removePost({ id })
    isDeleteModalOpen.value = false
    createNewPost()
    emit('deleted', id)
  } catch (e) {
    console.error('Failed to delete post:', e)
    saveError.value = 'The entry could not be deleted.'
    saveState.value = 'error'
  }
}

function createNewPost() {
  if (!hydratedId.value && !title.value && !content.value) return

  isSyncingPost.value = true

  try {
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
  } finally {
    isSyncingPost.value = false
  }
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
          <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div v-if="!props.demo" class="flex min-w-0 items-start gap-3">
              <UButton
                v-if="props.backTo"
                :to="props.backTo"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-left"
                aria-label="Back"
                class="mt-0.5 shrink-0"
              />

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 class="text-lg font-semibold text-highlighted">{{ pageTitle }}</h2>
                  <span class="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    <span
                      class="size-1.5 rounded-full"
                      :class="status === 'published' ? 'bg-highlighted' : 'border border-muted'"
                    />
                    {{ entryStatusLabel }}
                  </span>
                </div>

                <div
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  class="mt-0.5 flex min-h-5 items-center gap-1.5 text-xs"
                  :class="saveState === 'error' ? 'text-error' : 'text-muted'"
                >
                  <template v-if="saveState === 'error'">
                    <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
                    <span>Autosave failed</span>
                  </template>
                  <template v-else-if="saveState === 'saving' || isSaving">
                    <UIcon name="i-lucide-loader-circle" class="size-3.5 shrink-0 animate-spin" />
                    <span>Saving changes…</span>
                  </template>
                  <template v-else-if="saveState === 'dirty'">
                    <UIcon name="i-lucide-clock-3" class="size-3.5 shrink-0" />
                    <span>Unsaved changes · saving shortly</span>
                  </template>
                  <template v-else-if="lastSavedAt">
                    <UIcon name="i-lucide-cloud-check" class="size-3.5 shrink-0" />
                    <span>All changes saved at {{ formatSavedTime(lastSavedAt) }}</span>
                  </template>
                  <template v-else>
                    <UIcon name="i-lucide-cloud" class="size-3.5 shrink-0" />
                    <span>Changes save automatically</span>
                  </template>
                </div>
              </div>
            </div>

            <div v-if="!props.demo" class="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:justify-end">
              <UButton
                v-if="props.showSettings"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-sliders-horizontal"
                @click="isSettingsOpen = true"
              >
                Settings
              </UButton>

              <template v-if="status === 'published'">
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  icon="i-lucide-eye-off"
                  :loading="isSaving"
                  @click="savePost('draft')"
                >
                  Unpublish
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

              <UDropdownMenu
                v-if="currentPostId"
                :items="moreActions"
                :content="{ align: 'end' }"
              >
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-ellipsis"
                  aria-label="More entry actions"
                  :disabled="isSaving || isDeleting"
                />
              </UDropdownMenu>
            </div>
          </div>

          <div class="grid w-full min-w-0">
            <UTextarea
              v-model="title"
              placeholder="Entry title"
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

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Delete this entry?"
      :description="deleteModalDescription"
      :dismissible="!isDeleting"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="isDeleting"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          label="Delete entry"
          color="error"
          icon="i-lucide-trash-2"
          :loading="isDeleting"
          @click="confirmDeletePost"
        />
      </template>
    </UModal>

    <USlideover
      v-if="props.showSettings && !props.demo"
      v-model:open="isSettingsOpen"
      title="Entry settings"
      description="Metadata and publishing details save automatically."
    >
      <template #body>
        <div class="flex flex-col gap-6 p-4">
          <UFormField name="slug" label="Slug" help="Used in the post URL. It must be unique.">
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

          <UFormField name="tags" label="Tags" help="Press Enter or type a comma to add each tag.">
            <UInputTags
              v-model="tags"
              delimiter=","
              size="sm"
              placeholder="Add a tag"
              class="w-full"
            />
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
        <div class="flex w-full items-center justify-between gap-3">
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="flex min-h-5 min-w-0 items-center gap-1.5 text-xs"
            :class="saveState === 'error' ? 'text-error' : 'text-muted'"
          >
            <template v-if="saveState === 'error'">
              <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
              <span>Autosave failed</span>
            </template>
            <template v-else-if="saveState === 'saving' || isSaving">
              <UIcon name="i-lucide-loader-circle" class="size-3.5 shrink-0 animate-spin" />
              <span>Saving changes…</span>
            </template>
            <template v-else-if="saveState === 'dirty'">
              <UIcon name="i-lucide-clock-3" class="size-3.5 shrink-0" />
              <span>Unsaved changes · saving shortly</span>
            </template>
            <template v-else-if="lastSavedAt">
              <UIcon name="i-lucide-cloud-check" class="size-3.5 shrink-0" />
              <span>All changes saved at {{ formatSavedTime(lastSavedAt) }}</span>
            </template>
            <template v-else>
              <UIcon name="i-lucide-cloud" class="size-3.5 shrink-0" />
              <span>Changes save automatically</span>
            </template>
          </div>

          <UButton color="neutral" variant="ghost" class="shrink-0" @click="isSettingsOpen = false">
            Close
          </UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
:deep(.tiptap) {
  outline: none;
}
</style>
