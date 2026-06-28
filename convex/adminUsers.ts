import { v } from 'convex/values'
import { action, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import {
  getAllowedPages,
  normalizeEmail,
  roleValidator
} from './lib/access'
import {
  createAdminClerkClient,
  getAcceptInviteRedirectUrl
} from './lib/clerk'
import { requireAdmin } from './users'

function validateEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.')
  }

  return normalizedEmail
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    return await ctx.db
      .query('users')
      .order('desc')
      .collect()
  }
})

export const invite = action({
  args: {
    email: v.string(),
    role: roleValidator
  },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(internal.users.getCallerAccess, {})

    if (actor.role !== 'admin' || !actor.tokenIdentifier) {
      throw new Error('Administrator access is required.')
    }

    const email = args.email.trim()
    const normalizedEmail = validateEmail(email)
    const now = Date.now()
    const userId = await ctx.runMutation(
      internal.users.upsertPendingAccess,
      {
        email,
        normalizedEmail,
        role: args.role,
        allowedPages: getAllowedPages(args.role),
        invitedByTokenIdentifier: actor.tokenIdentifier,
        now
      }
    )

    try {
      const clerk = createAdminClerkClient()
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: getAcceptInviteRedirectUrl(),
        ignoreExisting: true,
        notify: true,
        publicMetadata: { role: args.role }
      })

      try {
        await ctx.runMutation(internal.users.attachClerkInvitation, {
          userId,
          clerkInvitationId: invitation.id,
          now: Date.now()
        })
      } catch (error) {
        console.error('Invitation sent but its Clerk ID was not saved.', error)

        return {
          accessSaved: true,
          emailSent: true,
          invitationTracked: false
        }
      }

      return {
        accessSaved: true,
        emailSent: true,
        invitationTracked: true
      }
    } catch (error) {
      console.error('Clerk invitation delivery failed.', error)

      return {
        accessSaved: true,
        emailSent: false,
        invitationTracked: false
      }
    }
  }
})

export const resendInvitation = action({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(internal.users.getCallerAccess, {})
    if (actor.role !== 'admin') throw new Error('Administrator access is required.')

    const users = await ctx.runQuery(internal.adminUsers.getPendingForDelivery, {
      userId: args.userId
    })

    const clerk = createAdminClerkClient()
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: users.email,
      redirectUrl: getAcceptInviteRedirectUrl(),
      ignoreExisting: true,
      notify: true,
      publicMetadata: { role: users.role }
    })

    await ctx.runMutation(internal.users.attachClerkInvitation, {
      userId: args.userId,
      clerkInvitationId: invitation.id,
      now: Date.now()
    })

    return { emailSent: true }
  }
})

export const getPendingForDelivery = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const user = await ctx.db.get(args.userId)

    if (!user || user.status !== 'pending') {
      throw new Error('Only pending invitations can be resent.')
    }

    return { email: user.email, role: user.role }
  }
})

export const updateRole = mutation({
  args: {
    userId: v.id('users'),
    role: roleValidator
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx)
    const target = await ctx.db.get(args.userId)

    if (!target) throw new Error('User not found.')
    if (target._id === actor._id && args.role !== 'admin') {
      throw new Error('You cannot remove your own administrator role.')
    }

    await ctx.db.patch(target._id, {
      role: args.role,
      allowedPages: getAllowedPages(args.role),
      updatedAt: Date.now()
    })
  }
})

export const setDisabled = mutation({
  args: {
    userId: v.id('users'),
    disabled: v.boolean()
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx)
    const target = await ctx.db.get(args.userId)

    if (!target) throw new Error('User not found.')
    if (target._id === actor._id && args.disabled) {
      throw new Error('You cannot disable your own account.')
    }
    if (target.status === 'pending') {
      throw new Error('Pending access must be revoked instead.')
    }

    await ctx.db.patch(target._id, {
      status: args.disabled ? 'disabled' : 'active',
      updatedAt: Date.now()
    })
  }
})

export const revokePending = action({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(internal.users.getCallerAccess, {})
    if (actor.role !== 'admin') throw new Error('Administrator access is required.')

    const removed = await ctx.runMutation(internal.users.removePendingAccess, {
      userId: args.userId
    })

    if (!removed.clerkInvitationId) {
      return { accessRevoked: true, invitationRevoked: false }
    }

    try {
      const clerk = createAdminClerkClient()
      await clerk.invitations.revokeInvitation(removed.clerkInvitationId)
      return { accessRevoked: true, invitationRevoked: true }
    } catch (error) {
      console.error('Pending access was revoked but Clerk invitation revocation failed.', error)
      return { accessRevoked: true, invitationRevoked: false }
    }
  }
})
