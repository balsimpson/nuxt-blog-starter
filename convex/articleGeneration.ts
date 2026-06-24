import { Agent, createTool, stepCountIs } from '@convex-dev/agent'
import { v } from 'convex/values'
import { z } from 'zod'
import { components, internal } from './_generated/api'
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server'
import {
  articleGenerationSource,
  articleGenerationStage,
  articleGenerationStatus
} from './articleGenerationSchema'
import {
  buildDraftPrompt,
  buildOutlinePrompt,
  buildBriefNormalizationPrompt,
  buildClarificationQuestionPrompt,
  buildResearchPrompt,
  INITIAL_CLARIFICATION_STATUS,
  type GenerationBrief
} from './lib/articleGenerationPrompts'
import {
  briefNormalizationSchema,
  clarificationQuestionSchema,
  draftResultSchema,
  outlineResultSchema,
  researchResultSchema
} from './lib/articleGenerationSchemas'
import { getArticleGenerationModel } from './lib/openrouter'
import { createUniquePostSlug } from './lib/postSlugs'
import { searchTavily } from './lib/tavily'

const ARTICLE_AGENT_INSTRUCTIONS = [
  'You are a senior editor and article writer.',
  'Your job is to research the web, identify stale coverage, find sharper angles, and write publishable markdown articles.',
  'Be differentiated, concrete, and specific.',
  'Never invent sources, quotes, dates, or statistics.',
  'If the requested tone is provocative, make the framing provocative without making false factual claims.'
].join(' ')

const tavilySearchTool = createTool({
  description: 'Search the live web for recent, relevant, and comparable articles or source material.',
  inputSchema: z.object({
    query: z.string().min(6).describe('A specific web search query.'),
    topic: z.enum(['general', 'news']).optional().describe('Use news for very recent events and general for evergreen research.'),
    includeDomains: z.array(z.string()).max(10).optional().describe('Optional domains to narrow the search.')
  }),
  execute: async (_ctx, input) => {
    return await searchTavily(input)
  }
})

function createArticleAgent() {
  return new Agent(components.agent, {
    name: 'Article Writer',
    languageModel: getArticleGenerationModel(),
    instructions: ARTICLE_AGENT_INSTRUCTIONS
  })
}

function getClarificationAnswer(messages: Array<{ kind: string, role: string, content: string }>) {
  return messages
    .filter(message => message.role === 'user' && message.kind === 'answer')
    .map(message => message.content.trim())
    .join('\n')
}

function normalizePatchValue<T>(value: T | null | undefined) {
  return value === null ? undefined : value
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

function summarizeErrorMessage(message: string) {
  return message.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function annotateProviderError(context: string, error: unknown) {
  const message = summarizeErrorMessage(getErrorMessage(error))
  const cause = error instanceof Error && error.cause instanceof Error ? summarizeErrorMessage(error.cause.message) : null

  return cause
    ? `${context}: ${message} | cause=${cause}`
    : `${context}: ${message}`
}

function isRetryablePipelineError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()

  return [
    'provider returned error',
    'rate limit',
    'temporarily unavailable',
    'timed out',
    'timeout',
    'overloaded',
    'fetch failed',
    'network',
    'socket hang up',
    'econnreset',
    '502',
    '503',
    '504',
    '429'
  ].some(token => message.includes(token))
}

function stageLabel(stage: string) {
  switch (stage) {
    case 'clarification':
      return 'clarification'
    case 'research':
      return 'research'
    case 'outline':
      return 'outline'
    case 'draft':
      return 'draft'
    case 'approval':
      return 'approval'
    default:
      return 'generation'
  }
}

function buildStageErrorMessage(stage: string, message: string) {
  return `${stageLabel(stage)} failed: ${message}`
}

function buildResearchCheckpointMessage(step: string, detail?: string) {
  return detail
    ? `Research checkpoint [${step}]: ${detail}`
    : `Research checkpoint [${step}]`
}

function extractFirstJsonObject(input: string) {
  const start = input.indexOf('{')
  const end = input.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return input.slice(start, end + 1)
}

function parseStructuredResearchFromText(rawText: string) {
  const jsonPayload = extractFirstJsonObject(rawText)

  if (!jsonPayload) {
    throw new Error('Synthesis fallback did not return a JSON object.')
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(jsonPayload)
  } catch {
    throw new Error('Synthesis fallback returned invalid JSON.')
  }

  const validated = researchResultSchema.safeParse(parsed)

  if (!validated.success) {
    const issue = validated.error.issues[0]
    const issuePath = issue?.path?.length ? issue.path.join('.') : 'root'
    throw new Error(`Synthesis fallback JSON failed schema validation at ${issuePath}: ${issue?.message || 'invalid value'}`)
  }

  return validated.data
}

function getStoredResearch(session: {
  searchQueries?: string[]
  researchSummary?: string
  gapAnalysis?: string[]
  sourceLinks?: Array<{ title: string, url: string, reason: string }>
}) {
  if (!session.searchQueries?.length || !session.researchSummary || !session.gapAnalysis?.length || !session.sourceLinks?.length) {
    return null
  }

  return {
    searchQueries: session.searchQueries,
    researchSummary: session.researchSummary,
    gaps: session.gapAnalysis,
    sources: session.sourceLinks
  }
}

function getStoredOutline(session: {
  outline?: string[]
}) {
  if (!session.outline?.length) {
    return null
  }

  return {
    outline: session.outline
  }
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function appendStatusMessage(
  ctx: any,
  sessionId: any,
  content: string
) {
  await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
    sessionId,
    role: 'assistant',
    kind: 'status',
    content
  })
}

async function withStepRetry<T>(args: {
  ctx: any
  sessionId: string
  label: string
  fn: () => Promise<T>
  maxAttempts?: number
}) {
  const maxAttempts = args.maxAttempts ?? 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await args.fn()
    } catch (error) {
      if (!isRetryablePipelineError(error) || attempt === maxAttempts) {
        throw error
      }

      const delayMs = attempt * 1500
      const summary = summarizeErrorMessage(getErrorMessage(error))

      await appendStatusMessage(
        args.ctx,
        args.sessionId,
        `${args.label} hit a transient provider/network error (${summary}). Retrying automatically in ${(delayMs / 1000).toFixed(1)}s (${attempt + 1}/${maxAttempts}).`
      )

      await wait(delayMs)
    }
  }

  throw new Error(`Unable to complete ${args.label}.`)
}

export const listGenerationSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('articleGenerationSessions')
      .withIndex('by_updated_at')
      .filter(q => q.eq(q.field('isDeleted'), undefined))
      .order('desc')
      .take(20)
  }
})

export const getGenerationSession = query({
  args: {
    id: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id)

    if (!session) {
      return null
    }

    if (session.isDeleted) {
      return null
    }

    const messages = await ctx.db
      .query('articleGenerationMessages')
      .withIndex('by_session', q => q.eq('sessionId', args.id))
      .collect()

    return {
      ...session,
      messages: messages.sort((a, b) => a.createdAt - b.createdAt)
    }
  }
})

export const createGenerationSession = mutation({
  args: {
    prompt: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const trimmedPrompt = args.prompt.trim()
    const sessionId = await ctx.db.insert('articleGenerationSessions', {
      title: trimmedPrompt.slice(0, 80),
      requestedArticle: trimmedPrompt,
      status: 'collecting_input',
      stage: 'clarification',
      createdAt: now,
      updatedAt: now
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId,
      role: 'user',
      kind: 'prompt',
      content: trimmedPrompt,
      createdAt: now
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId,
      role: 'assistant',
      kind: 'status',
      content: INITIAL_CLARIFICATION_STATUS,
      createdAt: now + 1
    })

    await ctx.scheduler.runAfter(0, internal.articleGeneration.generateClarificationQuestion, {
      sessionId
    })

    return await ctx.db.get(sessionId)
  }
})

export const addGenerationAnswer = mutation({
  args: {
    sessionId: v.id('articleGenerationSessions'),
    answer: v.string()
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      throw new Error('Generation session not found.')
    }

    if (session.isDeleted) {
      throw new Error('This session has been deleted.')
    }

    if (session.status !== 'collecting_input' || !session.currentQuestion) {
      throw new Error('This article session is already processing.')
    }

    const now = Date.now()
    const answer = args.answer.trim()

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'user',
      kind: 'answer',
      content: answer,
      createdAt: now
    })

    await ctx.db.patch(args.sessionId, {
      status: 'researching',
      stage: 'research',
      currentQuestion: undefined,
      lastError: undefined,
      updatedAt: now
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'assistant',
      kind: 'status',
      content: 'Brief captured. Researching the topic, scanning similar coverage, and looking for stronger angles now.',
      createdAt: now + 1
    })

    await ctx.scheduler.runAfter(0, internal.articleGeneration.runGenerationPipeline, {
      sessionId: args.sessionId
    })

    return await ctx.db.get(args.sessionId)
  }
})

export const regenerateClarificationQuestion = mutation({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      throw new Error('Generation session not found.')
    }

    if (session.isDeleted) {
      throw new Error('This session has been deleted.')
    }

    if (session.status !== 'collecting_input' || session.stage !== 'clarification') {
      throw new Error('Only pending clarification sessions can refresh their question.')
    }

    const answers = await ctx.db
      .query('articleGenerationMessages')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .collect()

    const hasAnswer = answers.some(message => message.role === 'user' && message.kind === 'answer')

    if (hasAnswer) {
      throw new Error('This session already has a clarification answer, so it is ready to continue instead of asking a new question.')
    }

    const now = Date.now()

    await ctx.db.patch(args.sessionId, {
      currentQuestion: undefined,
      lastError: undefined,
      updatedAt: now
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'assistant',
      kind: 'status',
      content: 'Refreshing the follow-up question with the agent now.',
      createdAt: now + 1
    })

    await ctx.scheduler.runAfter(0, internal.articleGeneration.generateClarificationQuestion, {
      sessionId: args.sessionId
    })

    return await ctx.db.get(args.sessionId)
  }
})

export const approveGenerationSession = mutation({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      throw new Error('Generation session not found.')
    }

    if (session.isDeleted) {
      throw new Error('This session has been deleted.')
    }

    if (!session.draftContent || !session.draftTitle) {
      throw new Error('Generation draft is not ready yet.')
    }

    const now = Date.now()
    const existingPost = session.linkedPostId
      ? await ctx.db.get(session.linkedPostId)
      : null

    let linkedPostId = session.linkedPostId

    if (existingPost) {
      await ctx.db.patch(existingPost._id, {
        title: session.draftTitle,
        content: session.draftContent,
        contentType: 'draft',
        publishStatus: 'draft',
        excerpt: session.draftExcerpt,
        updatedAt: now
      })
    } else {
      const slug = await createUniquePostSlug(
        ctx.db,
        session.draftTitle || session.requestedArticle
      )

      linkedPostId = await ctx.db.insert('posts', {
        slug,
        title: session.draftTitle,
        content: session.draftContent,
        contentType: 'draft',
        publishStatus: 'draft',
        excerpt: session.draftExcerpt,
        createdAt: now,
        updatedAt: now
      })
    }

    await ctx.db.patch(args.sessionId, {
      status: 'approved',
      stage: 'complete',
      linkedPostId,
      approvedAt: now,
      updatedAt: now
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'assistant',
      kind: 'status',
      content: 'Approved. A draft post has been created and is ready in the editor.',
      createdAt: now + 1
    })

    return {
      session: await ctx.db.get(args.sessionId),
      postId: linkedPostId
    }
  }
})

export const resetGenerationSessionError = mutation({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      throw new Error('Generation session not found.')
    }

    if (session.isDeleted) {
      throw new Error('This session has been deleted.')
    }

    await ctx.db.patch(args.sessionId, {
      lastError: undefined,
      updatedAt: Date.now()
    })

    return await ctx.db.get(args.sessionId)
  }
})

export const retryGenerationSession = mutation({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      throw new Error('Generation session not found.')
    }

    if (session.isDeleted) {
      throw new Error('This session has been deleted.')
    }

    if (session.status !== 'error') {
      throw new Error('Only failed article sessions can be retried.')
    }

    const nextStatus = session.stage === 'clarification'
      ? 'collecting_input'
      : session.stage === 'outline'
        ? 'outlining'
        : session.stage === 'draft'
          ? 'drafting'
          : 'researching'

    const now = Date.now()

    await ctx.db.patch(args.sessionId, {
      status: nextStatus,
      lastError: undefined,
      updatedAt: now
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'assistant',
      kind: 'status',
      content: `Retry requested. Reusing the saved session context and resuming from the ${stageLabel(session.stage)} stage where possible.`,
      createdAt: now + 1
    })

    await ctx.scheduler.runAfter(
      0,
      session.stage === 'clarification'
        ? internal.articleGeneration.generateClarificationQuestion
        : internal.articleGeneration.runGenerationPipeline,
      { sessionId: args.sessionId }
    )

    return await ctx.db.get(args.sessionId)
  }
})

export const deleteGenerationSession = mutation({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      throw new Error('Generation session not found.')
    }

    const now = Date.now()

    await ctx.db.patch(args.sessionId, {
      isDeleted: true,
      deletedAt: now,
      status: 'error',
      stage: 'complete',
      lastError: 'Session deleted by user.',
      updatedAt: now
    })

    const messages = await ctx.db
      .query('articleGenerationMessages')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .collect()

    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    return { deleted: true }
  }
})

export const getPipelineSession = internalQuery({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (!session) {
      return null
    }

    const messages = await ctx.db
      .query('articleGenerationMessages')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .collect()

    return {
      ...session,
      messages: messages.sort((a, b) => a.createdAt - b.createdAt)
    }
  }
})

export const patchGenerationSession = internalMutation({
  args: {
    sessionId: v.id('articleGenerationSessions'),
    status: v.optional(articleGenerationStatus),
    stage: v.optional(articleGenerationStage),
    currentQuestion: v.optional(v.union(v.string(), v.null())),
    searchQueries: v.optional(v.union(v.array(v.string()), v.null())),
    researchSummary: v.optional(v.union(v.string(), v.null())),
    gapAnalysis: v.optional(v.union(v.array(v.string()), v.null())),
    sourceLinks: v.optional(v.union(v.array(articleGenerationSource), v.null())),
    outline: v.optional(v.union(v.array(v.string()), v.null())),
    draftTitle: v.optional(v.union(v.string(), v.null())),
    draftExcerpt: v.optional(v.union(v.string(), v.null())),
    draftContent: v.optional(v.union(v.string(), v.null())),
    reviewNotes: v.optional(v.union(v.array(v.string()), v.null())),
    agentThreadId: v.optional(v.union(v.string(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null()))
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      updatedAt: Date.now()
    }

    if (args.status !== undefined) updates.status = args.status
    if (args.stage !== undefined) updates.stage = args.stage
    if (args.currentQuestion !== undefined) updates.currentQuestion = normalizePatchValue(args.currentQuestion)
    if (args.searchQueries !== undefined) updates.searchQueries = normalizePatchValue(args.searchQueries)
    if (args.researchSummary !== undefined) updates.researchSummary = normalizePatchValue(args.researchSummary)
    if (args.gapAnalysis !== undefined) updates.gapAnalysis = normalizePatchValue(args.gapAnalysis)
    if (args.sourceLinks !== undefined) updates.sourceLinks = normalizePatchValue(args.sourceLinks)
    if (args.outline !== undefined) updates.outline = normalizePatchValue(args.outline)
    if (args.draftTitle !== undefined) updates.draftTitle = normalizePatchValue(args.draftTitle)
    if (args.draftExcerpt !== undefined) updates.draftExcerpt = normalizePatchValue(args.draftExcerpt)
    if (args.draftContent !== undefined) updates.draftContent = normalizePatchValue(args.draftContent)
    if (args.reviewNotes !== undefined) updates.reviewNotes = normalizePatchValue(args.reviewNotes)
    if (args.agentThreadId !== undefined) updates.agentThreadId = normalizePatchValue(args.agentThreadId)
    if (args.lastError !== undefined) updates.lastError = normalizePatchValue(args.lastError)

    await ctx.db.patch(args.sessionId, updates)
  }
})

export const appendGenerationMessage = internalMutation({
  args: {
    sessionId: v.id('articleGenerationSessions'),
    role: v.string(),
    kind: v.string(),
    content: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert('articleGenerationMessages', {
      ...args,
      createdAt: now
    })

    await ctx.db.patch(args.sessionId, {
      updatedAt: now
    })
  }
})

export const generateClarificationQuestion = internalAction({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.articleGeneration.getPipelineSession, {
      sessionId: args.sessionId
    })

    if (!session) {
      return
    }

    let activeStage = 'clarification'

    try {
      const articleAgent = createArticleAgent()
      const { threadId } = await articleAgent.createThread(ctx, {
        title: session.requestedArticle.slice(0, 80)
      })

      await appendStatusMessage(
        ctx,
        args.sessionId,
        'Preparing a clarifying question so the writing brief is specific before research starts.'
      )

      const clarification = await withStepRetry({
        ctx,
        sessionId: args.sessionId,
        label: 'Clarification question generation',
        fn: () => articleAgent.generateObject(
          ctx,
          { threadId },
          {
            schema: clarificationQuestionSchema,
            prompt: buildClarificationQuestionPrompt(session.requestedArticle),
            temperature: 0.4
          }
        )
      })

      await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
        sessionId: args.sessionId,
        agentThreadId: threadId,
        currentQuestion: clarification.object.question,
        lastError: null
      })

      await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
        sessionId: args.sessionId,
        role: 'assistant',
        kind: 'question',
        content: clarification.object.question
      })
    } catch (error) {
      const message = buildStageErrorMessage(
        activeStage,
        getErrorMessage(error) || 'Unable to generate the clarification question.'
      )

      await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
        sessionId: args.sessionId,
        status: 'error',
        lastError: message
      })

      await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
        sessionId: args.sessionId,
        role: 'assistant',
        kind: 'status',
        content: `Generation stopped during ${stageLabel(activeStage)}. ${message}`
      })
    }
  }
})

export const runGenerationPipeline = internalAction({
  args: {
    sessionId: v.id('articleGenerationSessions')
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.articleGeneration.getPipelineSession, {
      sessionId: args.sessionId
    })

    if (!session) {
      return
    }

    let activeStage = session.stage

    try {
      const articleAgent = createArticleAgent()
      const clarificationAnswer = getClarificationAnswer(session.messages)
      const threadId = session.agentThreadId || (await articleAgent.createThread(ctx, {
        title: session.requestedArticle.slice(0, 80)
      })).threadId

      await appendStatusMessage(
        ctx,
        args.sessionId,
        'Normalizing your prompt and clarification into a clean writing brief first.'
      )

      const normalizedBrief = await withStepRetry({
        ctx,
        sessionId: args.sessionId,
        label: 'Brief normalization',
        fn: () => articleAgent.generateObject(
          ctx,
          { threadId },
          {
            schema: briefNormalizationSchema,
            prompt: buildBriefNormalizationPrompt(session.requestedArticle, clarificationAnswer),
            temperature: 0.2
          }
        )
      })

      const brief: GenerationBrief = {
        requestedArticle: session.requestedArticle,
        audienceAndOutcome: normalizedBrief.object.audienceAndOutcome,
        toneAndConstraints: normalizedBrief.object.toneAndConstraints
      }

      await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
        sessionId: args.sessionId,
        agentThreadId: threadId,
        lastError: null
      })

      let research = getStoredResearch(session)

      if (!research) {
        activeStage = 'research'

        await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
          sessionId: args.sessionId,
          status: 'researching',
          stage: 'research',
          lastError: null
        })

        await appendStatusMessage(
          ctx,
          args.sessionId,
          buildResearchCheckpointMessage('start', 'Starting live research now. I may run several web searches, compare competing coverage, and then compress the findings into a research brief.')
        )

        // Prime the thread with a direct search result so the model has one concrete
        // live-web example before it starts the broader research loop.
        await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
          sessionId: args.sessionId,
          role: 'assistant',
          kind: 'status',
          content: buildResearchCheckpointMessage('seed-search', `Searching web for "${brief.requestedArticle} recent articles".`)
        })

        const seedQuery = `${brief.requestedArticle} recent articles`

        let initialSearch

        try {
          initialSearch = await searchTavily({
            query: seedQuery
          })
        } catch (error) {
          const message = getErrorMessage(error)

          await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
            sessionId: args.sessionId,
            role: 'assistant',
            kind: 'status',
            content: buildResearchCheckpointMessage('seed-search-failed', `${message} | query=${seedQuery}`)
          })

          throw new Error(buildStageErrorMessage('research', `${message} | seed query=${seedQuery}`))
        }

        await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
          sessionId: args.sessionId,
          role: 'assistant',
          kind: 'status',
          content: buildResearchCheckpointMessage('seed-search-success', `Got ${initialSearch.results.length} result${initialSearch.results.length === 1 ? '' : 's'} from the seed search.`)
        })

        for (const result of initialSearch.results.slice(0, 3)) {
          await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
            sessionId: args.sessionId,
            role: 'assistant',
            kind: 'status',
            content: buildResearchCheckpointMessage('seed-source', `Source picked - ${result.title} (${result.url}).`)
          })
        }

        await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
          sessionId: args.sessionId,
          role: 'assistant',
          kind: 'status',
          content: buildResearchCheckpointMessage('broad-scan', 'Moving into the broader research scan.')
        })

        await withStepRetry({
          ctx,
          sessionId: args.sessionId,
          label: 'Research scan',
          fn: () => articleAgent.generateText(
            ctx,
            { threadId },
            {
              prompt: buildResearchPrompt(brief),
              tools: {
                searchTheWeb: tavilySearchTool
              },
              stopWhen: stepCountIs(8),
              temperature: 0.3
            }
          )
        })

        await appendStatusMessage(
          ctx,
          args.sessionId,
          'Raw research is in. Turning it into a structured brief with search queries, source links, and coverage gaps now.'
        )

        await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
          sessionId: args.sessionId,
          role: 'assistant',
          kind: 'status',
          content: buildResearchCheckpointMessage('synthesis', 'Synthesizing search results into structured research notes.')
        })

        const structuredResearch = await withStepRetry({
          ctx,
          sessionId: args.sessionId,
          label: 'Research brief synthesis',
          fn: async () => {
            try {
              const generated = await articleAgent.generateObject(
                ctx,
                { threadId },
                {
                  schema: researchResultSchema,
                  prompt: 'Using only the research already collected in this thread, return the final structured research brief now.'
                }
              )

              return generated.object
            } catch (error) {
              await appendStatusMessage(
                ctx,
                args.sessionId,
                buildResearchCheckpointMessage(
                  'synthesis-fallback',
                  `Primary structured output failed (${summarizeErrorMessage(getErrorMessage(error))}). Falling back to text->JSON parsing.`
                )
              )

              try {
                const fallbackText = await articleAgent.generateText(
                  ctx,
                  { threadId },
                  {
                    prompt: [
                      'Using only the research already collected in this thread, return a single JSON object only.',
                      'No markdown fences. No prose.',
                      'It must match this TypeScript shape exactly:',
                      '{',
                      '  "searchQueries": string[],',
                      '  "researchSummary": string,',
                      '  "gaps": string[],',
                      '  "sources": Array<{ "title": string, "url": string, "reason": string }>',
                      '}'
                    ].join('\n'),
                    temperature: 0
                  }
                )

                return parseStructuredResearchFromText(fallbackText.text)
              } catch (fallbackError) {
                throw new Error(
                  `${annotateProviderError('Research brief synthesis failed in generateObject', error)} | fallback=${summarizeErrorMessage(getErrorMessage(fallbackError))}`
                )
              }
            }
          }
        })

        research = {
          searchQueries: structuredResearch.searchQueries,
          researchSummary: structuredResearch.researchSummary,
          gaps: structuredResearch.gaps,
          sources: structuredResearch.sources
        }

        activeStage = 'outline'

        await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
          sessionId: args.sessionId,
          status: 'outlining',
          stage: 'outline',
          searchQueries: research.searchQueries,
          researchSummary: research.researchSummary,
          gapAnalysis: research.gaps,
          sourceLinks: research.sources
        })

        await appendStatusMessage(
          ctx,
          args.sessionId,
          'Research checkpoint saved. I found a sharper angle and I’m shaping the outline now.'
        )
      } else {
        if (session.status === 'error') {
          await appendStatusMessage(
            ctx,
            args.sessionId,
            'Saved research checkpoint found. Skipping live research and resuming from the latest completed findings.'
          )
        }

        activeStage = 'outline'
      }

      let outline = getStoredOutline(session)

      if (!outline) {
        activeStage = 'outline'

        await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
          sessionId: args.sessionId,
          status: 'outlining',
          stage: 'outline',
          lastError: null
        })

        await appendStatusMessage(
          ctx,
          args.sessionId,
          'Generating the outline from the saved research brief now.'
        )

        const generatedOutline = await withStepRetry({
          ctx,
          sessionId: args.sessionId,
          label: 'Outline generation',
          fn: () => articleAgent.generateObject(
            ctx,
            { threadId },
            {
              schema: outlineResultSchema,
              prompt: buildOutlinePrompt(brief, research),
              temperature: 0.6
            }
          )
        })

        outline = generatedOutline.object
      } else if (session.status === 'error') {
        await appendStatusMessage(
          ctx,
          args.sessionId,
          'Saved outline checkpoint found. Skipping outline generation and moving straight to the draft.'
        )
      }

      activeStage = 'draft'

      await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
        sessionId: args.sessionId,
        status: 'drafting',
        stage: 'draft',
        outline: outline.outline,
        lastError: null
      })

      if (session.draftTitle && session.draftContent) {
        await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
          sessionId: args.sessionId,
          status: 'ready_for_approval',
          stage: 'approval',
          lastError: null
        })

        await appendStatusMessage(
          ctx,
          args.sessionId,
          'Recovered the existing draft from the last saved checkpoint. Review it and approve it when you are ready.'
        )

        return
      }

      await appendStatusMessage(
        ctx,
        args.sessionId,
        'Outline checkpoint saved. Writing the full draft and polishing the angle now.'
      )

      const draft = await withStepRetry({
        ctx,
        sessionId: args.sessionId,
        label: 'Draft generation',
        fn: () => articleAgent.generateObject(
          ctx,
          { threadId },
          {
            schema: draftResultSchema,
            prompt: buildDraftPrompt(brief, research, outline),
            temperature: 0.8
          }
        )
      })

      await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
        sessionId: args.sessionId,
        status: 'ready_for_approval',
        stage: 'approval',
        draftTitle: draft.object.title,
        draftExcerpt: draft.object.excerpt,
        draftContent: draft.object.markdown,
        reviewNotes: draft.object.reviewNotes,
        lastError: null
      })

      await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
        sessionId: args.sessionId,
        role: 'assistant',
        kind: 'status',
        content: 'Research, gap analysis, outline, and draft are complete. Review the draft and approve it when you are ready.'
      })
    } catch (error) {
      const message = buildStageErrorMessage(
        activeStage,
        getErrorMessage(error) || 'Article generation failed.'
      )

      await ctx.runMutation(internal.articleGeneration.patchGenerationSession, {
        sessionId: args.sessionId,
        status: 'error',
        lastError: message
      })

      await ctx.runMutation(internal.articleGeneration.appendGenerationMessage, {
        sessionId: args.sessionId,
        role: 'assistant',
        kind: 'status',
        content: `Generation stopped during ${stageLabel(activeStage)}. ${message}`
      })
    }
  }
})
