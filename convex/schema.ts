import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { roleValidator, userStatusValidator } from './lib/access'

export default defineSchema({
  users: defineTable({
    email: v.string(),
    normalizedEmail: v.string(),
    role: roleValidator,
    allowedPages: v.array(v.string()),
    status: userStatusValidator,
    tokenIdentifier: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    clerkInvitationId: v.optional(v.string()),
    invitedByTokenIdentifier: v.optional(v.string()),
    invitedAt: v.optional(v.number()),
    activatedAt: v.optional(v.number()),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_normalized_email', ['normalizedEmail'])
    .index('by_token_identifier', ['tokenIdentifier'])
    .index('by_clerk_user_id', ['clerkUserId'])
    .index('by_status', ['status']),
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
    images: v.optional(v.array(v.string())),
    featuredImage: v.optional(v.string()),
    videos: v.optional(v.array(v.string())),
    featuredVideo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    originalPublishedAt: v.optional(v.number()),
    originalSource: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_slug', ['slug'])
    .index('by_author', ['author'])
})
