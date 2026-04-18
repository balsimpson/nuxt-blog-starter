<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '~~/convex/_generated/api'

type GenerationMessage = {
  _id: string
  role: string
  kind: string
  content: string
  createdAt: number
}

type GenerationSession = {
  _id: string
  title: string
  requestedArticle: string
  status: string
  stage: string
  currentQuestion?: string
  outline?: string[]
  researchSummary?: string
  draftTitle?: string
  draftExcerpt?: string
  draftContent?: string
  reviewNotes?: string[]
  linkedPostId?: string
  approvedAt?: number
  lastError?: string
  updatedAt: number
  createdAt: number
  messages: GenerationMessage[]
}

const router = useRouter()
const convex = useConvexClient()

const starterPrompt = ref('')
const reply = ref('')
const selectedSessionId = ref<string | null>(null)
const selectedSession = ref<GenerationSession | null>(null)
const selectedSessionLoading = ref(false)
const selectedSessionError = ref<string | null>(null)

const { data: sessions, isPending: isSessionsPending } = useConvexQuery(api.posts.listGenerationSessions)
const activeSession = computed(() => selectedSession.value as GenerationSession | null)
const isSessionPending = computed(() => Boolean(selectedSessionId.value) && selectedSessionLoading.value && !activeSession.value)

const { mutate: createSession, isPending: isCreating } = useConvexMutation(api.posts.createGenerationSession)
const { mutate: addAnswer, isPending: isReplying } = useConvexMutation(api.posts.addGenerationAnswer)
const { mutate: approveSession, isPending: isApproving } = useConvexMutation(api.posts.approveGenerationSession)

watch(sessions, (value) => {
  if (!selectedSessionId.value && value?.length && value[0]) {
    selectedSessionId.value = value[0]._id
  }
}, { immediate: true })

watch(selectedSessionId, async (id) => {
  if (!id) {
    selectedSession.value = null
    selectedSessionError.value = null
    return
  }

  selectedSessionLoading.value = true
  selectedSessionError.value = null

  try {
    selectedSession.value = await convex.query(api.posts.getGenerationSession, { id: id as any }) as GenerationSession | null
  }
  catch (error) {
    selectedSession.value = null
    selectedSessionError.value = error instanceof Error ? error.message : 'Failed to load session'
  }
  finally {
    selectedSessionLoading.value = false
  }
}, { immediate: true })

const orderedSessions = computed(() => [...(sessions.value || [])].sort((a, b) => b.updatedAt - a.updatedAt))
const currentSession = computed(() => activeSession.value)
const stageTone = computed(() => {
  switch (currentSession.value?.status) {
    case 'ready_for_approval':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'primary'
  }
})

const canCreate = computed(() => starterPrompt.value.trim().length > 12)
const canReply = computed(() => Boolean(currentSession.value?.currentQuestion) && reply.value.trim().length > 0)

async function onCreateSession() {
  if (!canCreate.value) {
    return
  }

  const session = await createSession({ prompt: starterPrompt.value.trim() })
  if (session?._id) {
    selectedSessionId.value = session._id
    starterPrompt.value = ''
    reply.value = ''
  }
}

async function onSendReply() {
  if (!currentSession.value || !canReply.value) {
    return
  }

  await addAnswer({
    sessionId: currentSession.value._id as any,
    answer: reply.value.trim()
  })

  reply.value = ''
}

async function onApprove() {
  if (!currentSession.value) {
    return
  }

  const result = await approveSession({ sessionId: currentSession.value._id as any })
  if (result?.postId) {
    await router.push(`/admin/editor?id=${result.postId}`)
  }
}

const formatRelative = (timestamp: number) => new Date(timestamp).toLocaleString([], {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <UCard class="h-fit">
      <template #header>
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            Start a new article
          </h2>
          <p class="mt-1 text-sm text-muted">
            Describe the article you want and the workflow will guide the rest.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UTextarea
          v-model="starterPrompt"
          :rows="5"
          autoresize
          placeholder="Example: Write a founder-focused article on how AI search is changing SaaS content strategy."
            class="w-full"
          />

        <UButton
          block
          color="primary"
          icon="i-lucide-sparkles"
          :disabled="!canCreate"
          :loading="isCreating"
          @click="onCreateSession"
        >
          Start generation
        </UButton>
      </div>

      <template #footer>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-highlighted">
              Recent sessions
            </h3>
            <UBadge
              color="neutral"
              variant="soft"
            >
              {{ orderedSessions.length }}
            </UBadge>
          </div>

          <div
            v-if="orderedSessions.length"
            class="space-y-2"
          >
            <button
              v-for="session in orderedSessions"
              :key="session._id"
              type="button"
              class="w-full rounded-xl border px-3 py-3 text-left transition"
              :class="session._id === selectedSessionId ? 'border-primary bg-primary/5' : 'border-default hover:border-primary/40'"
              @click="selectedSessionId = session._id"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="line-clamp-2 text-sm font-medium text-highlighted">
                  {{ session.title }}
                </p>
                <UBadge
                  :color="session.status === 'ready_for_approval' ? 'success' : 'neutral'"
                  variant="soft"
                  size="sm"
                >
                  {{ session.stage }}
                </UBadge>
              </div>
              <p class="mt-2 text-xs text-muted">
                Updated {{ formatRelative(session.updatedAt) }}
              </p>
            </button>
          </div>

          <div
            v-else-if="!isSessionsPending"
            class="rounded-xl border border-dashed border-default px-4 py-6 text-center text-sm text-muted"
          >
            No article sessions yet.
          </div>
        </div>
      </template>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-sm font-medium text-muted">
              Article workflow
            </p>
            <h2 class="text-xl font-semibold text-highlighted">
              {{ currentSession?.draftTitle || currentSession?.title || 'Select or start a session' }}
            </h2>
            <p class="mt-1 max-w-3xl text-sm text-muted">
              {{ currentSession?.requestedArticle || 'A high-touch writing flow will ask clarifying questions, prepare a draft, review it, and wait for your approval.' }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UBadge
              v-if="currentSession"
              :color="stageTone"
              variant="soft"
              class="capitalize"
            >
              {{ currentSession.stage.replace('-', ' ') }}
            </UBadge>
            <UBadge
              v-if="currentSession"
              color="neutral"
              variant="outline"
              class="capitalize"
            >
              {{ currentSession.status.replace(/_/g, ' ') }}
            </UBadge>
          </div>
        </div>
      </template>

      <div
        v-if="currentSession"
        class="space-y-6"
      >
        <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div class="space-y-4">
            <UCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold text-highlighted">
                    Conversation
                  </h3>
                  <span class="text-xs text-muted">
                    {{ currentSession.messages.length }} messages
                  </span>
                </div>
              </template>

              <div class="space-y-3">
                <div
                  v-for="message in currentSession.messages"
                  :key="message._id"
                  class="rounded-2xl px-4 py-3"
                  :class="message.role === 'assistant' ? 'bg-muted/60' : 'bg-primary/10'"
                >
                  <div class="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span class="font-medium capitalize text-highlighted">{{ message.role }}</span>
                    <span class="text-muted">{{ formatRelative(message.createdAt) }}</span>
                  </div>
                  <p class="whitespace-pre-wrap text-sm text-toned">
                    {{ message.content }}
                  </p>
                </div>
              </div>
            </UCard>

            <UCard
              v-if="currentSession.currentQuestion"
              variant="subtle"
            >
              <template #header>
                <div>
                  <h3 class="text-sm font-semibold text-highlighted">
                    Clarifying question
                  </h3>
                  <p class="mt-1 text-sm text-muted ">
                    Answer to keep the workflow moving.
                  </p>
                </div>
              </template>

              <div class="space-y-3">
                <p class="text-sm text-toned">
                  {{ currentSession.currentQuestion }}
                </p>

                <UTextarea
                  v-model="reply"
                  :rows="4"
                  autoresize
                  placeholder="Add as much detail as you want."
                  class="w-full"
                />

                <div class="flex justify-end">
                  <UButton
                    color="primary"
                    icon="i-lucide-send"
                    :disabled="!canReply"
                    :loading="isReplying"
                    @click="onSendReply"
                  >
                    Send answer
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>

          <div class="space-y-4">
            <UCard variant="subtle">
              <template #header>
                <h3 class="text-sm font-semibold text-highlighted">
                  Research summary
                </h3>
              </template>

              <p class="text-sm text-toned whitespace-pre-wrap">
                {{ currentSession.researchSummary || 'Research will appear here after clarification is complete.' }}
              </p>
            </UCard>

            <UCard variant="subtle">
              <template #header>
                <h3 class="text-sm font-semibold text-highlighted">
                  Outline
                </h3>
              </template>

              <ul
                v-if="currentSession.outline?.length"
                class="space-y-2 text-sm text-toned"
              >
                <li
                  v-for="item in currentSession.outline"
                  :key="item"
                  class="flex gap-2"
                >
                  <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{{ item }}</span>
                </li>
              </ul>
              <p
                v-else
                class="text-sm text-muted"
              >
                The outline is generated after clarification.
              </p>
            </UCard>

            <UCard variant="subtle">
              <template #header>
                <h3 class="text-sm font-semibold text-highlighted">
                  Reviewer notes
                </h3>
              </template>

              <ul
                v-if="currentSession.reviewNotes?.length"
                class="space-y-2 text-sm text-toned"
              >
                <li
                  v-for="note in currentSession.reviewNotes"
                  :key="note"
                  class="flex gap-2"
                >
                  <UIcon name="i-lucide-badge-check" class="mt-0.5 size-4 text-primary" />
                  <span>{{ note }}</span>
                </li>
              </ul>
              <p
                v-else
                class="text-sm text-muted"
              >
                Review feedback will appear here after drafting.
              </p>
            </UCard>
          </div>
        </div>

        <UCard variant="soft">
          <template #header>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 class="text-base font-semibold text-highlighted">
                  Draft preview
                </h3>
                <p class="mt-1 text-sm text-muted">
                  Final reviewed content before approval.
                </p>
              </div>

              <UButton
                v-if="currentSession.status === 'ready_for_approval' || currentSession.status === 'approved'"
                color="primary"
                icon="i-lucide-check-check"
                :loading="isApproving"
                :disabled="currentSession.status === 'approved'"
                @click="onApprove"
              >
                {{ currentSession.status === 'approved' ? 'Approved' : 'Approve and open editor' }}
              </UButton>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Draft title
              </p>
              <p class="mt-1 text-lg font-semibold text-highlighted">
                {{ currentSession.draftTitle || 'Draft title pending' }}
              </p>
            </div>

            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Suggested excerpt
              </p>
              <p class="mt-1 text-sm text-toned">
                {{ currentSession.draftExcerpt || 'Suggested excerpt pending.' }}
              </p>
            </div>

            <USeparator />

            <div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {{ currentSession.draftContent || 'The generated draft will appear here once the workflow has enough context.' }}
            </div>
          </div>
        </UCard>
      </div>

      <div
        v-else
        class="flex min-h-105 items-center justify-center rounded-2xl border border-dashed border-default text-center text-sm text-muted"
      >
        {{ isSessionPending ? 'Loading session...' : 'Start a new session or select an existing one to continue.' }}
      </div>
    </UCard>
  </div>
</template>
