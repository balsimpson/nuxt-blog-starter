<script setup lang="ts">
import type { Id } from '~~/convex/_generated/dataModel'

definePageMeta({
  layout: false,
  ssr: false
})

const route = useRoute()
const router = useRouter()

const postId = computed(() => {
  const id = route.query.id
  return typeof id === 'string' ? id as Id<'posts'> : undefined
})

async function onSaved(id: Id<'posts'>) {
  if (route.query.id === id) return

  await router.replace({
    query: { ...route.query, id }
  })
}

async function onDeleted() {
  await navigateTo('/admin')
}
</script>

<template>
  <main class="min-h-screen w-full bg-default">
    <AppEditor
      :post-id="postId"
      back-to="/admin"
      flat
      @saved="onSaved"
      @deleted="onDeleted"
    />
  </main>
</template>
