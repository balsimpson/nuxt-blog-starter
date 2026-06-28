import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertPostSlugAvailable } from './lib/postSlugs'
import {
  requireActiveUser,
  requireContentEditor
} from './users'

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
    await requireActiveUser(ctx)
    return await ctx.db.get(args.id)
  }
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireActiveUser(ctx)
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
    images: v.optional(v.array(v.string())),
    featuredImage: v.optional(v.string()),
    videos: v.optional(v.array(v.string())),
    featuredVideo: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await requireContentEditor(ctx)
    const now = Date.now()
    const existing = args.id ? await ctx.db.get(args.id) : null

    if (args.id && !existing) {
      throw new Error('The post could not be found.')
    }

    const slug = await assertPostSlugAvailable(ctx.db, args.slug, existing?._id)

    const publishStatus = args.publishStatus || 'draft'
    let publishedAt = args.publishedAt || existing?.publishedAt
    let originalPublishedAt = args.originalPublishedAt

    if (publishStatus === 'published' && !publishedAt) {
      publishedAt = now
    }

    if (publishStatus === 'published' && !originalPublishedAt) {
      originalPublishedAt = publishedAt
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        slug,
        title: args.title,
        author: args.author,
        content: args.content,
        contentType: args.contentType,
        publishStatus,
        publishedAt: publishedAt || existing.publishedAt,
        originalPublishedAt,
        originalSource: args.originalSource,
        tags: args.tags,
        excerpt: args.excerpt,
        images: args.images,
        featuredImage: args.featuredImage,
        videos: args.videos,
        featuredVideo: args.featuredVideo,
        updatedAt: now
      })

      return await ctx.db.get(existing._id)
    }

    const postId = await ctx.db.insert('posts', {
      slug,
      title: args.title,
      author: args.author,
      content: args.content,
      contentType: args.contentType,
      publishStatus,
      publishedAt,
      originalPublishedAt,
      originalSource: args.originalSource,
      tags: args.tags,
      excerpt: args.excerpt,
      images: args.images,
      featuredImage: args.featuredImage,
      videos: args.videos,
      featuredVideo: args.featuredVideo,
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
    await requireContentEditor(ctx)
    await ctx.db.delete(args.id)
  }
})
