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
  searchQueries?: string[]
  gapAnalysis?: string[]
  outline?: string[]
  researchSummary?: string
  sourceLinks?: Array<{
    title: string
    url: string
    reason: string
  }>
  draftTitle?: string
  draftExcerpt?: string
  draftContent?: string
  reviewNotes?: string[]
  linkedPostId?: string
  agentThreadId?: string
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

const { data: sessions, isPending: isSessionsPending } = useConvexQuery(api.articleGeneration.listGenerationSessions)
const activeSession = computed(() => selectedSession.value as GenerationSession | null)
const isSessionPending = computed(() => Boolean(selectedSessionId.value) && selectedSessionLoading.value && !activeSession.value)

const { mutate: createSession, isPending: isCreating } = useConvexMutation(api.articleGeneration.createGenerationSession)
const { mutate: addAnswer, isPending: isReplying } = useConvexMutation(api.articleGeneration.addGenerationAnswer)
const { mutate: regenerateQuestion, isPending: isRefreshingQuestion } = useConvexMutation(api.articleGeneration.regenerateClarificationQuestion)
const { mutate: approveSession, isPending: isApproving } = useConvexMutation(api.articleGeneration.approveGenerationSession)
const { mutate: retrySession, isPending: isRetrying } = useConvexMutation(api.articleGeneration.retryGenerationSession)
const { mutate: deleteSession, isPending: isDeleting } = useConvexMutation(api.articleGeneration.deleteGenerationSession)

const selectedSessionVersion = computed(() => {
  return (sessions.value || []).find(session => session._id === selectedSessionId.value)?.updatedAt || null
})

watch(sessions, (value) => {
  if (!selectedSessionId.value && value?.length && value[0]) {
    selectedSessionId.value = value[0]._id
  }
}, { immediate: true })

watch([selectedSessionId, selectedSessionVersion], async ([id]) => {
  if (!id) {
    selectedSession.value = null
    selectedSessionError.value = null
    return
  }

  selectedSessionLoading.value = true
  selectedSessionError.value = null

  try {
    selectedSession.value = await convex.query(api.articleGeneration.getGenerationSession, { id: id as any }) as GenerationSession | null
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
const statusMessages = computed(() => {
  if (!currentSession.value) {
    return []
  }

  return currentSession.value.messages
    .filter(message => message.kind === 'status')
    .slice()
    .reverse()
})

const researchTraceMessages = computed(() => {
  if (!currentSession.value) {
    return []
  }

  return currentSession.value.messages.filter(message => message.kind === 'status' && message.content.startsWith('Research trace:'))
})

const latestStatusMessage = computed(() => statusMessages.value[0]?.content || null)

const workflowStepDefinitions = [
  {
    key: 'clarification',
    title: 'Clarification',
    description: 'Lock the brief and gather the follow-up answer.'
  },
  {
    key: 'research',
    title: 'Research',
    description: 'Search the web, compare coverage, and save the research brief.'
  },
  {
    key: 'outline',
    title: 'Outline',
    description: 'Turn the saved research into a structured article outline.'
  },
  {
    key: 'draft',
    title: 'Draft',
    description: 'Write the full article draft and reviewer notes.'
  },
  {
    key: 'approval',
    title: 'Approval',
    description: 'Review the draft and send it to the editor.'
  }
] as const

type WorkflowStepKey = typeof workflowStepDefinitions[number]['key']
type WorkflowStepState = 'complete' | 'active' | 'pending' | 'error'

function hasClarificationCheckpoint(session: GenerationSession) {
  return session.messages.some(message => message.role === 'user' && message.kind === 'answer') || session.stage !== 'clarification'
}

function hasResearchCheckpoint(session: GenerationSession) {
  return Boolean(session.researchSummary)
}

function hasOutlineCheckpoint(session: GenerationSession) {
  return Boolean(session.outline?.length)
}

function hasDraftCheckpoint(session: GenerationSession) {
  return Boolean(session.draftTitle && session.draftContent)
}

function getWorkflowStepState(session: GenerationSession, step: WorkflowStepKey): WorkflowStepState {
  if (session.status === 'error' && session.stage === step) {
    return 'error'
  }

  switch (step) {
    case 'clarification':
      return hasClarificationCheckpoint(session)
        ? 'complete'
        : session.stage === 'clarification' ? 'active' : 'pending'
    case 'research':
      return hasResearchCheckpoint(session)
        ? 'complete'
        : session.stage === 'research' ? 'active' : 'pending'
    case 'outline':
      return hasOutlineCheckpoint(session)
        ? 'complete'
        : session.stage === 'outline' ? 'active' : 'pending'
    case 'draft':
      return hasDraftCheckpoint(session)
        ? 'complete'
        : session.stage === 'draft' ? 'active' : 'pending'
    case 'approval':
      if (session.status === 'approved') {
        return 'complete'
      }

      return session.status === 'ready_for_approval' || session.stage === 'approval'
        ? 'active'
        : 'pending'
    default:
      return 'pending'
  }
}

const workflowSteps = computed(() => {
  if (!currentSession.value) {
    return []
  }

  return workflowStepDefinitions.map(step => ({
    ...step,
    state: getWorkflowStepState(currentSession.value!, step.key)
  }))
})

function getCheckpointLabel(session: GenerationSession) {
  if (hasDraftCheckpoint(session)) {
    return 'Draft'
  }

  if (hasOutlineCheckpoint(session)) {
    return 'Outline'
  }

  if (hasResearchCheckpoint(session)) {
    return 'Research'
  }

  if (hasClarificationCheckpoint(session)) {
    return 'Clarification'
  }

  return 'Session start'
}

const lastSavedCheckpoint = computed(() => {
  if (!currentSession.value) {
    return null
  }

  return getCheckpointLabel(currentSession.value)
})

const currentActivity = computed(() => {
  if (!currentSession.value) {
    return 'Select a session to view the pipeline.'
  }

  return latestStatusMessage.value
    || currentSession.value.lastError
    || 'Waiting for the next action.'
})

const recoverySummary = computed(() => {
  if (!currentSession.value) {
    return ''
  }

  if (currentSession.value.status === 'approved') {
    return 'All checkpoints are complete and the approved draft is already in the editor.'
  }

  if (currentSession.value.status === 'ready_for_approval') {
    return 'All generation checkpoints are saved. The workflow is waiting for your approval.'
  }

  if (currentSession.value.status !== 'error') {
    return `Last saved checkpoint: ${lastSavedCheckpoint.value}. If a later step fails, retry will resume from the most recent saved checkpoint when possible.`
  }

  if (hasDraftCheckpoint(currentSession.value)) {
    return 'Last saved checkpoint: Draft. Retry will recover the saved draft and take you back to approval.'
  }

  if (hasOutlineCheckpoint(currentSession.value)) {
    return 'Last saved checkpoint: Outline. Retry will skip research and outline generation, then continue with drafting.'
  }

  if (hasResearchCheckpoint(currentSession.value)) {
    return 'Last saved checkpoint: Research. Retry will skip live research and continue from the outline step.'
  }

  if (hasClarificationCheckpoint(currentSession.value)) {
    return 'No structured research checkpoint was saved yet. Retry will rerun the research phase.'
  }

  return 'The failure happened before clarification completed. Retry will ask the agent for a new follow-up question.'
})

function stepIcon(state: WorkflowStepState) {
  switch (state) {
    case 'complete':
      return 'i-lucide-check-circle-2'
    case 'active':
      return 'i-lucide-loader-circle'
    case 'error':
      return 'i-lucide-circle-alert'
    default:
      return 'i-lucide-circle-dashed'
  }
}

function stepIconClass(state: WorkflowStepState) {
  switch (state) {
    case 'complete':
      return 'text-success'
    case 'active':
      return 'text-primary animate-spin'
    case 'error':
      return 'text-error'
    default:
      return 'text-muted'
  }
}

function stepBadgeColor(state: WorkflowStepState) {
  switch (state) {
    case 'complete':
      return 'success'
    case 'active':
      return 'primary'
    case 'error':
      return 'error'
    default:
      return 'neutral'
  }
}

function stepStateLabel(state: WorkflowStepState) {
  switch (state) {
    case 'complete':
      return 'done'
    case 'active':
      return 'active'
    case 'error':
      return 'failed'
    default:
      return 'pending'
  }
}

const stageTone = computed(() => {
  switch (currentSession.value?.status) {
    case 'ready_for_approval':
    case 'approved':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'primary'
  }
})

const canCreate = computed(() => starterPrompt.value.trim().length > 12)
const canReply = computed(() => Boolean(currentSession.value?.currentQuestion) && reply.value.trim().length > 0)
const canRefreshQuestion = computed(() => {
  if (!currentSession.value) {
    return false
  }

  const hasAnswer = currentSession.value.messages.some(message => message.role === 'user' && message.kind === 'answer')
  return currentSession.value.status === 'collecting_input'
    && currentSession.value.stage === 'clarification'
    && !hasAnswer
})

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

async function onRefreshQuestion() {
  if (!currentSession.value || !canRefreshQuestion.value) {
    return
  }

  await regenerateQuestion({
    sessionId: currentSession.value._id as any
  })
}

async function onRetry() {
  if (!currentSession.value || currentSession.value.status !== 'error') {
    return
  }

  await retrySession({
    sessionId: currentSession.value._id as any
  })
}

async function onDeleteSession() {
  if (!currentSession.value) {
    return
  }

  const confirmed = confirm('Delete this research session and stop all related activity?')
  if (!confirmed) {
    return
  }

  await deleteSession({
    sessionId: currentSession.value._id as any
  })

  selectedSessionId.value = orderedSessions.value.find(session => session._id !== currentSession.value?._id)?._id || null
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
            Describe the article you want, or skip this and write manually in the normal editor.
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
                  :color="session.status === 'ready_for_approval' || session.status === 'approved' ? 'success' : session.status === 'error' ? 'error' : 'neutral'"
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

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-if="currentSession?.status === 'error'"
              color="error"
              variant="soft"
              icon="i-lucide-rotate-cw"
              :loading="isRetrying"
              @click="onRetry"
            >
              Retry generation
            </UButton>
            <UButton
              v-if="currentSession"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :loading="isDeleting"
              @click="onDeleteSession"
            >
              Delete session
            </UButton>
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
        <div
          v-if="currentSession.lastError"
          class="rounded-2xl border border-error/40 bg-error/5 px-4 py-4 text-sm text-error"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-semibold">
                Workflow stopped in {{ currentSession.stage.replace('-', ' ') }}
              </p>
              <p class="mt-1 whitespace-pre-wrap">
                {{ currentSession.lastError }}
              </p>
              <p class="mt-2 text-xs text-error/80">
                {{ recoverySummary }}
              </p>
            </div>

            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-rotate-cw"
              :loading="isRetrying"
              @click="onRetry"
            >
              Retry
            </UButton>
          </div>
        </div>

        <UCard variant="soft">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-highlighted">
                  Live pipeline status
                </h3>
                <p class="mt-1 text-sm text-muted">
                  Verbose progress, checkpoints, and recovery behavior for this run.
                </p>
              </div>
              <span class="text-xs text-muted">
                Updated {{ formatRelative(currentSession.updatedAt) }}
              </span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
              <div class="rounded-2xl border border-default bg-default/40 px-4 py-3">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Current activity
                </p>
                <p class="mt-2 whitespace-pre-wrap text-sm text-toned">
                  {{ currentActivity }}
                </p>
              </div>

              <div class="rounded-2xl border border-default bg-default/40 px-4 py-3">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Checkpoint + recovery
                </p>
                <p class="mt-2 text-sm text-toned">
                  {{ recoverySummary }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 xl:grid-cols-5">
              <div
                v-for="step in workflowSteps"
                :key="step.key"
                class="rounded-2xl border px-4 py-3"
                :class="step.state === 'error' ? 'border-error/40 bg-error/5' : step.state === 'active' ? 'border-primary/40 bg-primary/5' : 'border-default bg-default/30'"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <UIcon
                      :name="stepIcon(step.state)"
                      class="mt-0.5 size-4 shrink-0"
                      :class="stepIconClass(step.state)"
                    />
                    <div>
                      <p class="text-sm font-semibold text-highlighted">
                        {{ step.title }}
                      </p>
                      <p class="mt-1 text-xs text-muted">
                        {{ step.description }}
                      </p>
                    </div>
                  </div>

                  <UBadge
                    :color="stepBadgeColor(step.state)"
                    variant="soft"
                    size="sm"
                    class="capitalize"
                  >
                    {{ stepStateLabel(step.state) }}
                  </UBadge>
                </div>
              </div>
            </div>

            <div
              v-if="statusMessages.length"
              class="rounded-2xl border border-default bg-default/30 px-4 py-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Recent system updates
                </p>
                <span class="text-xs text-muted">
                  {{ Math.min(statusMessages.length, 6) }} shown
                </span>
              </div>

              <div class="mt-3 space-y-3">
                <div
                  v-for="message in statusMessages.slice(0, 6)"
                  :key="message._id"
                  class="rounded-xl border border-default bg-background px-3 py-3"
                >
                  <div class="flex items-center justify-between gap-3 text-xs">
                    <span class="font-medium text-highlighted">System</span>
                    <span class="text-muted">{{ formatRelative(message.createdAt) }}</span>
                  </div>
                  <p class="mt-2 whitespace-pre-wrap text-sm text-toned">
                    {{ message.content }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-if="researchTraceMessages.length"
              class="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-medium uppercase tracking-wide text-muted">
                  Research trace
                </p>
                <span class="text-xs text-muted">
                  {{ researchTraceMessages.length }} steps
                </span>
              </div>

              <div class="mt-3 space-y-2">
                <div
                  v-for="message in researchTraceMessages.slice(-8)"
                  :key="message._id"
                  class="rounded-xl border border-primary/15 bg-background px-3 py-2 text-sm text-toned"
                >
                  <div class="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span class="font-medium text-highlighted">Trace</span>
                    <span class="text-muted">{{ formatRelative(message.createdAt) }}</span>
                  </div>
                  <p class="whitespace-pre-wrap">
                    {{ message.content.replace('Research trace: ', '') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div class="space-y-4">
            <UCard variant="subtle">
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold text-highlighted">
                    Full transcript
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
                  <div class="flex gap-2">
                    <UButton
                      v-if="canRefreshQuestion"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-rotate-cw"
                      :loading="isRefreshingQuestion"
                      @click="onRefreshQuestion"
                    >
                      Refresh with agent
                    </UButton>
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
                  Research queries
                </h3>
              </template>

              <ul
                v-if="currentSession.searchQueries?.length"
                class="space-y-2 text-sm text-toned"
              >
                <li
                  v-for="query in currentSession.searchQueries"
                  :key="query"
                  class="rounded-xl border border-default px-3 py-3"
                >
                  {{ query }}
                </li>
              </ul>
              <p
                v-else
                class="text-sm text-muted"
              >
                Search queries will appear after the structured research brief is saved.
              </p>
            </UCard>

            <UCard variant="subtle">
              <template #header>
                <h3 class="text-sm font-semibold text-highlighted">
                  Source links
                </h3>
              </template>

              <div
                v-if="currentSession.sourceLinks?.length"
                class="space-y-2 text-sm text-toned"
              >
                <a
                  v-for="source in currentSession.sourceLinks"
                  :key="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noreferrer"
                  class="block rounded-xl border border-default px-3 py-3 transition hover:border-primary/40"
                >
                  <p class="font-medium text-highlighted">
                    {{ source.title }}
                  </p>
                  <p class="mt-1 text-xs text-muted break-all">
                    {{ source.url }}
                  </p>
                  <p class="mt-2 text-sm text-toned">
                    {{ source.reason }}
                  </p>
                </a>
              </div>
              <p
                v-else
                class="text-sm text-muted"
              >
                Source links will appear after the research pass.
              </p>
            </UCard>

            <UCard variant="subtle">
              <template #header>
                <h3 class="text-sm font-semibold text-highlighted">
                  Coverage gaps
                </h3>
              </template>

              <ul
                v-if="currentSession.gapAnalysis?.length"
                class="space-y-2 text-sm text-toned"
              >
                <li
                  v-for="gap in currentSession.gapAnalysis"
                  :key="gap"
                  class="flex gap-2"
                >
                  <UIcon name="i-lucide-scan-search" class="mt-0.5 size-4 text-primary" />
                  <span>{{ gap }}</span>
                </li>
              </ul>
              <p
                v-else
                class="text-sm text-muted"
              >
                Gap analysis will appear after research is complete.
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
                The outline is generated after research.
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
                Reviewer notes appear after the final draft is generated.
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
