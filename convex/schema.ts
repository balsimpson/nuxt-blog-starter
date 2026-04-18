import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  editorImages: defineTable({
    storageId: v.id('_storage'),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number())
  }).index('by_storage_id', ['storageId']),
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
