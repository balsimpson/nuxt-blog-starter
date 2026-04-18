import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '')
  .replace(/--+/g, '-')

export const getBySlug = query({
  args: {
    slug: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('posts')
      .withIndex('by_slug', q => q.eq('slug', args.slug))
      .unique()
  }
})

export const getById = query({
  args: {
    id: v.id('posts')
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('posts')
      .collect()
  }
})

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('posts')
      .withIndex('by_slug') // Optional, just to use an index if needed, but filtering is needed
      .filter(q => q.eq(q.field('publishStatus'), 'published'))
      .collect()
  }
})

export const upsert = mutation({
  args: {
    id: v.optional(v.id('posts')),
    slug: v.string(),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    content: v.string(),
    contentType: v.string(),
    publishStatus: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    originalPublishedAt: v.optional(v.number()),
    originalSource: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    excerpt: v.optional(v.string()),
    image: v.optional(v.string()),
    video: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    let existing = null

    if (args.id) {
      existing = await ctx.db.get(args.id)
    } else {
      existing = await ctx.db
        .query('posts')
        .withIndex('by_slug', q => q.eq('slug', args.slug))
        .unique()
    }

    const publishStatus = args.publishStatus || 'draft'
    let publishedAt = args.publishedAt

    if (publishStatus === 'published' && !publishedAt) {
      publishedAt = now
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        slug: args.slug,
        title: args.title,
        author: args.author,
        content: args.content,
        contentType: args.contentType,
        publishStatus,
        publishedAt: publishedAt || existing.publishedAt,
        originalPublishedAt: args.originalPublishedAt,
        originalSource: args.originalSource,
        tags: args.tags,
        excerpt: args.excerpt,
        image: args.image,
        video: args.video,
        updatedAt: now
      })

      return await ctx.db.get(existing._id)
    }

    const postId = await ctx.db.insert('posts', {
      slug: args.slug,
      title: args.title,
      author: args.author,
      content: args.content,
      contentType: args.contentType,
      publishStatus,
      publishedAt,
      originalPublishedAt: args.originalPublishedAt,
      originalSource: args.originalSource,
      tags: args.tags,
      excerpt: args.excerpt,
      image: args.image,
      video: args.video,
      createdAt: now,
      updatedAt: now
    })

    return await ctx.db.get(postId)
  }
})

export const remove = mutation({
  args: {
    id: v.id('posts')
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  }
})

const sessionStatus = v.union(
  v.literal('collecting_input'),
  v.literal('researching'),
  v.literal('awaiting_confirmation'),
  v.literal('drafting'),
  v.literal('reviewing'),
  v.literal('ready_for_approval'),
  v.literal('approved'),
  v.literal('error')
)

const sessionStage = v.union(
  v.literal('intake'),
  v.literal('clarification'),
  v.literal('research'),
  v.literal('outline'),
  v.literal('draft'),
  v.literal('review'),
  v.literal('approval'),
  v.literal('complete')
)

export const listGenerationSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('articleGenerationSessions')
      .withIndex('by_updated_at')
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
      currentQuestion: 'Who is the target audience for this article, and what action should they take after reading it?',
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
      kind: 'question',
      content: 'Who is the target audience for this article, and what action should they take after reading it?',
      createdAt: now + 1
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

    const now = Date.now()

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'user',
      kind: 'answer',
      content: args.answer.trim(),
      createdAt: now
    })

    const priorAnswers = await ctx.db
      .query('articleGenerationMessages')
      .withIndex('by_session', q => q.eq('sessionId', args.sessionId))
      .collect()

    const answerCount = priorAnswers.filter(message => message.kind === 'answer').length + 1

    if (answerCount === 1) {
      const nextQuestion = 'What tone, length, and must-cover points do you want included?'

      await ctx.db.patch(args.sessionId, {
        status: 'collecting_input',
        stage: 'clarification',
        currentQuestion: nextQuestion,
        updatedAt: now
      })

      await ctx.db.insert('articleGenerationMessages', {
        sessionId: args.sessionId,
        role: 'assistant',
        kind: 'question',
        content: nextQuestion,
        createdAt: now + 1
      })

      return await ctx.db.get(args.sessionId)
    }

    const allMessages = [...priorAnswers, {
      _id: 'pending',
      _creationTime: now,
      sessionId: args.sessionId,
      role: 'user',
      kind: 'answer',
      content: args.answer.trim(),
      createdAt: now
    }]

    const userInputs = allMessages
      .filter(message => message.role === 'user')
      .map(message => message.content)
      .join(' ')

    const requestedTopic = session.requestedArticle
    const draftTitle = requestedTopic.length > 60 ? requestedTopic.slice(0, 57).trimEnd() + '...' : requestedTopic
    const outline = [
      `Introduction: why ${requestedTopic.toLowerCase()} matters now`,
      'Key context and market/research signals',
      'Actionable framework or recommendations',
      'Common pitfalls and how to avoid them',
      'Conclusion with next steps'
    ]
    const researchSummary = `Research brief prepared for: ${requestedTopic}. Audience and constraints captured from the conversation: ${userInputs}.`
    const draftExcerpt = `A structured article on ${requestedTopic.toLowerCase()} with research-backed context and clear next steps.`
    const draftContent = [
      `# ${draftTitle}`,
      '',
      `## Why this topic matters`,
      `${requestedTopic} is a strong candidate for a high-value article because it can combine timely context with practical guidance for the intended audience. ${userInputs}`,
      '',
      '## Research and context',
      researchSummary,
      '',
      '## Outline',
      ...outline.map(item => `- ${item}`),
      '',
      '## Draft',
      `This first draft is intentionally structured for editing inside the existing admin editor. It captures the requested topic, the supplied constraints, and a practical narrative arc that can be refined before publishing.`,
      '',
      '## Recommended next steps',
      'Review the outline, confirm any missing facts, and then approve the draft to open it in the editor for final polish.'
    ].join('\n')
    const reviewNotes = [
      'Tighten the introduction with one concrete hook or statistic.',
      'Add one or two specific examples for credibility.',
      'Confirm the CTA matches the target audience intent.'
    ]

    await ctx.db.patch(args.sessionId, {
      status: 'ready_for_approval',
      stage: 'approval',
      currentQuestion: undefined,
      outline,
      researchSummary,
      draftTitle,
      draftExcerpt,
      draftContent,
      reviewNotes,
      updatedAt: now,
      lastError: undefined
    })

    await ctx.db.insert('articleGenerationMessages', {
      sessionId: args.sessionId,
      role: 'assistant',
      kind: 'status',
      content: 'Research, outline, drafting, and review are complete. The article is ready for your approval.',
      createdAt: now + 1
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

    if (!session.draftContent || !session.draftTitle) {
      throw new Error('Generation draft is not ready yet.')
    }

    const now = Date.now()
    const slugBase = slugify(session.draftTitle) || slugify(session.requestedArticle) || 'generated-article'

    const existingPost = session.linkedPostId
      ? await ctx.db.get(session.linkedPostId)
      : null

    let linkedPostId = session.linkedPostId

    if (existingPost) {
      await ctx.db.patch(existingPost._id, {
        slug: slugBase,
        title: session.draftTitle,
        content: session.draftContent,
        contentType: 'draft',
        publishStatus: 'draft',
        excerpt: session.draftExcerpt,
        updatedAt: now
      })
    } else {
      linkedPostId = await ctx.db.insert('posts', {
        slug: slugBase,
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

    await ctx.db.patch(args.sessionId, {
      lastError: undefined,
      updatedAt: Date.now()
    })

    return await ctx.db.get(args.sessionId)
  }
})
