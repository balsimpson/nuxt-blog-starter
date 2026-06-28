import { internal } from './_generated/api'
import { action } from './_generated/server'
import { searchTavily } from './lib/tavily'
import { canEditContent } from './lib/access'

export const search = action(async (ctx, args: Parameters<typeof searchTavily>[0]) => {
  const user = await ctx.runQuery(internal.users.getCallerAccess, {})

  if (!canEditContent(user.role)) {
    throw new Error('Editor access is required.')
  }

  return await searchTavily(args)
})
