import { action } from './_generated/server'
import { searchTavily } from './lib/tavily'

export const search = action(async (_ctx, args: Parameters<typeof searchTavily>[0]) => {
  return await searchTavily(args)
})
