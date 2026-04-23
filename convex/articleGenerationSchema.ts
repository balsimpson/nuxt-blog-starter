import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const articleGenerationStatus = v.union(
  v.literal('collecting_input'),
  v.literal('researching'),
  v.literal('outlining'),
  v.literal('drafting'),
  v.literal('ready_for_approval'),
  v.literal('approved'),
  v.literal('error')
)

export const articleGenerationStage = v.union(
  v.literal('clarification'),
  v.literal('research'),
  v.literal('outline'),
  v.literal('draft'),
  v.literal('approval'),
  v.literal('complete')
)

export const articleGenerationSource = v.object({
  title: v.string(),
  url: v.string(),
  reason: v.string()
})

export const articleGenerationTables = {
  articleGenerationSessions: defineTable({
    title: v.string(),
    requestedArticle: v.string(),
    status: articleGenerationStatus,
    stage: articleGenerationStage,
    currentQuestion: v.optional(v.string()),
    searchQueries: v.optional(v.array(v.string())),
    researchSummary: v.optional(v.string()),
    gapAnalysis: v.optional(v.array(v.string())),
    sourceLinks: v.optional(v.array(articleGenerationSource)),
    outline: v.optional(v.array(v.string())),
    draftTitle: v.optional(v.string()),
    draftExcerpt: v.optional(v.string()),
    draftContent: v.optional(v.string()),
    reviewNotes: v.optional(v.array(v.string())),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    agentThreadId: v.optional(v.string()),
    linkedPostId: v.optional(v.id('posts')),
    approvedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_updated_at', ['updatedAt'])
    .index('by_status', ['status']),
  articleGenerationMessages: defineTable({
    sessionId: v.id('articleGenerationSessions'),
    role: v.string(),
    kind: v.string(),
    content: v.string(),
    createdAt: v.number()
  }).index('by_session', ['sessionId'])
}
