<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { Id } from '~~/convex/_generated/dataModel'
import { api } from '~~/convex/_generated/api'

const props = defineProps<NodeViewProps>()

const file = ref<File | null>(null)
const loading = ref(false)
const uploadError = ref<string | null>(null)

const { mutate: generateUploadUrl } = useConvexMutation(api.uploads.generateUploadUrl)
const { mutate: saveImage } = useConvexMutation(api.uploads.saveImage)

function replacePlaceholderWithImage(src: string, fileName?: string) {
  const pos = props.getPos()

  if (typeof pos !== 'number') {
    throw new Error('Unable to resolve the image upload placeholder position.')
  }

  props.editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + 1 })
    .setImage({
      src,
      alt: fileName,
      title: fileName
    })
    .run()
}

watch(file, async (newFile) => {
  if (!newFile || loading.value) return

  loading.value = true
  uploadError.value = null

  try {
    const uploadUrl = await generateUploadUrl({})
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: newFile.type ? { 'Content-Type': newFile.type } : undefined,
      body: newFile
    })

    if (!response.ok) {
      throw new Error('Convex rejected the image upload.')
    }

    const { storageId } = await response.json() as { storageId?: Id<'_storage'> }

    if (!storageId) {
      throw new Error('Convex did not return a storage ID for the uploaded image.')
    }

    const { url } = await saveImage({
      storageId,
      filename: newFile.name || undefined,
      contentType: newFile.type || undefined,
      size: newFile.size || undefined
    })

    if (!url) {
      throw new Error('Convex did not return a public image URL.')
    }

    replacePlaceholderWithImage(url, newFile.name)
    file.value = null
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Image upload failed.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <NodeViewWrapper>
    <UFileUpload
      v-model="file"
      accept="image/*"
      label="Upload an image"
      :description="uploadError || 'SVG, PNG, JPG or GIF'"
      :preview="false"
      class="min-h-48"
    >
      <template #leading>
        <UAvatar
          :icon="loading ? 'i-lucide-loader-circle' : 'i-lucide-image'"
          size="xl"
          :ui="{ icon: [loading && 'animate-spin'] }"
        />
      </template>
    </UFileUpload>
  </NodeViewWrapper>
</template>
