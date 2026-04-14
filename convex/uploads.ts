import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  }
})

export const saveImage = mutation({
  args: {
    storageId: v.id('_storage'),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId)

    if (!url) {
      throw new Error('Uploaded image could not be resolved from Convex storage.')
    }

    const imageId = await ctx.db.insert('editorImages', {
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size
    })

    return {
      imageId,
      storageId: args.storageId,
      url
    }
  }
})
