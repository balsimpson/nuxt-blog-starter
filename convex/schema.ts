import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  editorImages: defineTable({
    storageId: v.id('_storage'),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number())
  }).index('by_storage_id', ['storageId']),
  articleGenerationSessions: defineTable({
    title: v.string(),
    requestedArticle: v.string(),
    status: v.string(),
    stage: v.string(),
    currentQuestion: v.optional(v.string()),
    outline: v.optional(v.array(v.string())),
    researchSummary: v.optional(v.string()),
    draftTitle: v.optional(v.string()),
    draftExcerpt: v.optional(v.string()),
    draftContent: v.optional(v.string()),
    reviewNotes: v.optional(v.array(v.string())),
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
  }).index('by_session', ['sessionId']),
  posts: defineTable({
    slug: v.string(),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    content: v.string(),
    contentType: v.string(),
    publishStatus: v.optional(v.string()), // 'draft' | 'published'
    publishedAt: v.optional(v.number()),
    excerpt: v.optional(v.string()),
    image: v.optional(v.string()),
    video: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    originalPublishedAt: v.optional(v.number()),
    originalSource: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_slug', ['slug'])
    .index('by_author', ['author'])
})
