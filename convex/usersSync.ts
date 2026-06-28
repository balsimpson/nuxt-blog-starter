import { action } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { createAdminClerkClient } from './lib/clerk'
import { normalizeEmail } from './lib/access'

type SyncResult =
  | { kind: 'unauthenticated' }
  | { kind: 'active', userId: Id<'users'> }
  | { kind: 'disabled' | 'conflict' | 'not_invited' | 'unlinked' }

function hasAdminBootstrapMetadata(metadata: Record<string, unknown> | null | undefined) {
  return metadata?.role === 'admin'
}

export const syncCurrentUser = action({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) return { kind: 'unauthenticated' as const }

    const now = Date.now()
    const existingUser = await ctx.runQuery(
      internal.users.getCurrentForSync,
      {}
    )

    if (existingUser) {
      return await ctx.runMutation(internal.users.touchCurrentLogin, {
        now
      })
    }

    const clerk = createAdminClerkClient()
    const clerkUser = await clerk.users.getUser(identity.subject)
    const firstName = clerkUser.firstName?.trim() || undefined
    const lastName = clerkUser.lastName?.trim() || undefined
    const verifiedEmails = clerkUser.emailAddresses
      .filter(email => email.verification?.status === 'verified')
      .map(email => normalizeEmail(email.emailAddress))

    return await ctx.runMutation(internal.users.claimOrBootstrapIdentity, {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      verifiedEmails,
      firstName,
      lastName,
      mayBootstrapAdmin:
        hasAdminBootstrapMetadata(clerkUser.publicMetadata)
        || hasAdminBootstrapMetadata(clerkUser.privateMetadata),
      now
    })
  }
})
