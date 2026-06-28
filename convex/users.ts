import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx
} from './_generated/server'
import {
  canEditContent,
  getAllowedPages,
  roleValidator,
  type UserRole
} from './lib/access'

type UserReadCtx = QueryCtx | MutationCtx

export async function getCurrentUser(ctx: UserReadCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) return null

  return await ctx.db
    .query('users')
    .withIndex('by_token_identifier', q =>
      q.eq('tokenIdentifier', identity.tokenIdentifier)
    )
    .unique()
}

export async function requireActiveUser(ctx: UserReadCtx) {
  const user = await getCurrentUser(ctx)

  if (!user) throw new Error('This account has not been invited.')
  if (user.status !== 'active') throw new Error('This account does not have active access.')

  return user
}

export async function requireAdmin(ctx: UserReadCtx) {
  const user = await requireActiveUser(ctx)

  if (user.role !== 'admin') throw new Error('Administrator access is required.')

  return user
}

export async function requireContentEditor(ctx: UserReadCtx) {
  const user = await requireActiveUser(ctx)

  if (!canEditContent(user.role)) {
    throw new Error('Editor access is required.')
  }

  return user
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { kind: 'unauthenticated' as const }

    const user = await getCurrentUser(ctx)
    if (!user) return { kind: 'unlinked' as const }
    if (user.status === 'disabled') {
      return { kind: 'disabled' as const, user }
    }
    if (user.status !== 'active') {
      return { kind: 'conflict' as const }
    }

    return { kind: 'active' as const, user }
  }
})

export const getCallerAccess = internalQuery({
  args: {},
  handler: async (ctx) => await requireActiveUser(ctx)
})

export const getCurrentForSync = internalQuery({
  args: {},
  handler: async (ctx) => await getCurrentUser(ctx)
})

export const touchCurrentLogin = internalMutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    now: v.number()
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)

    if (!user) return { kind: 'unlinked' as const }
    if (user.status === 'disabled') return { kind: 'disabled' as const }
    if (user.status !== 'active') return { kind: 'conflict' as const }

    await ctx.db.patch(user._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      lastLoginAt: args.now,
      updatedAt: args.now
    })

    return { kind: 'active' as const, userId: user._id }
  }
})

export const claimOrBootstrapIdentity = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    verifiedEmails: v.array(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    mayBootstrapAdmin: v.boolean(),
    now: v.number()
  },
  handler: async (ctx, args) => {
    const existingIdentity = await ctx.db
      .query('users')
      .withIndex('by_token_identifier', q =>
        q.eq('tokenIdentifier', args.tokenIdentifier)
      )
      .unique()

    if (existingIdentity) {
      if (existingIdentity.status === 'disabled') {
        return { kind: 'disabled' as const }
      }
      if (existingIdentity.status !== 'active') {
        return { kind: 'conflict' as const }
      }

      await ctx.db.patch(existingIdentity._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        lastLoginAt: args.now,
        updatedAt: args.now
      })

      return { kind: 'active' as const, userId: existingIdentity._id }
    }

    const existingClerkUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', q =>
        q.eq('clerkUserId', args.clerkUserId)
      )
      .unique()

    if (existingClerkUser) return { kind: 'conflict' as const }

    const matchedRows: Array<Doc<'users'>> = []

    for (const normalizedEmail of new Set(args.verifiedEmails)) {
      const row = await ctx.db
        .query('users')
        .withIndex('by_normalized_email', q =>
          q.eq('normalizedEmail', normalizedEmail)
        )
        .unique()

      if (row && !matchedRows.some(match => match._id === row._id)) {
        matchedRows.push(row)
      }
    }

    if (matchedRows.length > 1) return { kind: 'conflict' as const }

    const pendingUser = matchedRows[0]

    if (pendingUser) {
      if (pendingUser.status === 'disabled') return { kind: 'disabled' as const }
      if (
        pendingUser.status !== 'pending'
        || pendingUser.tokenIdentifier
        || pendingUser.clerkUserId
      ) {
        return { kind: 'conflict' as const }
      }

      await ctx.db.patch(pendingUser._id, {
        status: 'active',
        tokenIdentifier: args.tokenIdentifier,
        clerkUserId: args.clerkUserId,
        firstName: args.firstName,
        lastName: args.lastName,
        activatedAt: args.now,
        lastLoginAt: args.now,
        updatedAt: args.now
      })

      return { kind: 'active' as const, userId: pendingUser._id }
    }

    const anyUser = await ctx.db.query('users').first()
    const bootstrapEmail = args.verifiedEmails[0]

    if (!anyUser && args.mayBootstrapAdmin && bootstrapEmail) {
      const role: UserRole = 'admin'
      const userId = await ctx.db.insert('users', {
        email: bootstrapEmail,
        normalizedEmail: bootstrapEmail,
        role,
        allowedPages: getAllowedPages(role),
        status: 'active',
        tokenIdentifier: args.tokenIdentifier,
        clerkUserId: args.clerkUserId,
        firstName: args.firstName,
        lastName: args.lastName,
        activatedAt: args.now,
        lastLoginAt: args.now,
        createdAt: args.now,
        updatedAt: args.now
      })

      return { kind: 'active' as const, userId }
    }

    return { kind: 'not_invited' as const }
  }
})

export const upsertPendingAccess = internalMutation({
  args: {
    email: v.string(),
    normalizedEmail: v.string(),
    role: roleValidator,
    allowedPages: v.array(v.string()),
    invitedByTokenIdentifier: v.string(),
    now: v.number()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_normalized_email', q =>
        q.eq('normalizedEmail', args.normalizedEmail)
      )
      .unique()

    if (existing?.status === 'active') {
      throw new Error('This user is already active. Change their role from the user list.')
    }
    if (existing?.status === 'disabled') {
      throw new Error('This user is disabled. Restore their access before making changes.')
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        role: args.role,
        allowedPages: args.allowedPages,
        invitedByTokenIdentifier: args.invitedByTokenIdentifier,
        invitedAt: args.now,
        updatedAt: args.now
      })

      return existing._id
    }

    return await ctx.db.insert('users', {
      email: args.email,
      normalizedEmail: args.normalizedEmail,
      role: args.role,
      allowedPages: args.allowedPages,
      status: 'pending',
      invitedByTokenIdentifier: args.invitedByTokenIdentifier,
      invitedAt: args.now,
      createdAt: args.now,
      updatedAt: args.now
    })
  }
})

export const attachClerkInvitation = internalMutation({
  args: {
    userId: v.id('users'),
    clerkInvitationId: v.string(),
    now: v.number()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user || user.status !== 'pending') {
      throw new Error('Pending user no longer exists.')
    }

    await ctx.db.patch(user._id, {
      clerkInvitationId: args.clerkInvitationId,
      updatedAt: args.now
    })
  }
})

export const removePendingAccess = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user || user.status !== 'pending') {
      throw new Error('Only pending access can be revoked.')
    }

    await ctx.db.delete(user._id)
    return { clerkInvitationId: user.clerkInvitationId }
  }
})
