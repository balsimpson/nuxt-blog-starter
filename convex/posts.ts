import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

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

export const upsert = mutation({
  args: {
    id: v.optional(v.id('posts')),
    slug: v.string(),
    title: v.optional(v.string()),
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
