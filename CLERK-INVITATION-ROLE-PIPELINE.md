# Clerk Invitation and Convex Role Pipeline

## Implementation specification

This document defines the recommended invitation and role architecture for a Nuxt application using Clerk for authentication and Convex for application data.

It includes focused reference snippets for the boundaries where implementation details matter. They are intended to guide an implementation agent; they are not a request to create components or pages in this repository.

## Goal

An administrator assigns an email address a role. That role must persist and become effective when the matching person authenticates, regardless of whether they:

- Follow the Clerk invitation email.
- Sign up directly.
- Already have a Clerk account and sign in directly.
- Return in a later session.

The result must be secure, idempotent, understandable, and easy to test.

## Architecture decision

Use the existing Convex `users` table as the single source of truth for application access.

- Clerk owns authentication, verified identity, sessions, and invitation-email delivery.
- Convex owns roles, allowed pages, user status, and application authorization.
- A `users` row may exist before the person has a Clerk account.
- The row starts as `pending` and becomes `active` after a verified Clerk identity claims it.
- Invitation-link signup and direct login both run the same reconciliation flow.
- Clerk `publicMetadata` and custom session claims are not used as authorization sources.

This design deliberately uses one table. It does not add a separate pending-invitations table, a Clerk webhook, or a bidirectional role-sync system.

Keep shared role types, page-access rules, email normalization, and Convex validators in small import-safe modules. The snippets below reference helpers such as `roleValidator`, `getAllowedPages`, and `normalizeEmail`; implement each helper once and import it rather than copying its logic between actions, mutations, and frontend composables.

## Why this solves the current failure

Clerk application-invitation metadata is copied to a Clerk user only when the invitation ticket is consumed during signup. Direct signup or login does not guarantee that transfer.

That makes Clerk invitation metadata unsuitable as the only durable role store.

The Convex row is created when the administrator sends the invitation, before the recipient authenticates. Both login paths later match the authenticated user's verified email to that row. Email delivery no longer determines whether the role survives.

## Current Navarasa gap

Navarasa already has a `users` table with a role, Clerk user ID, token identifier, and email. The current behavior still needs to be changed before the table can become authoritative:

- `tokenIdentifier` and `clerkUserId` are currently required, so a row cannot be created before signup.
- The current login sync reads the role from Clerk metadata.
- Missing or invalid Clerk role metadata currently becomes `viewer`.
- The sync then writes that value into Convex, which can overwrite the intended role.
- Admin navigation, route access, and some server authorization still read Clerk metadata.

The implementation must reverse that direction: identity data may flow from Clerk into Convex, but role and page access must flow only from administrator-controlled Convex mutations.

## Non-goals

Do not add these unless a separate requirement appears:

- A second table only for pending invitations.
- A Clerk webhook merely to make login reconciliation work.
- Role data in custom Clerk JWT claims.
- Role authorization from Clerk `publicMetadata`.
- Client-side role assignment.
- Automatic access for every valid Clerk user.
- Complex invitation audit tables; the existing activity log can record administrative changes.

Clerk metadata may remain temporarily during migration, but it must be treated as a legacy mirror and never as the final authorization decision.

## The `users` table contract

The `users` table represents people who may access the application, including people who have been invited but have not authenticated yet.

### Required fields

| Field | Purpose |
| --- | --- |
| `email` | Human-readable invited email address |
| `normalizedEmail` | Trimmed, lowercase email used for matching and indexed lookup |
| `role` | Valid application role such as `admin`, `editor`, or `viewer` |
| `allowedPages` | Sanitized application routes the user may access |
| `status` | `pending`, `active`, or `disabled` |
| `createdAt` | Initial record creation time |
| `updatedAt` | Last meaningful record change |

### Identity fields

| Field | Pending user | Active user | Purpose |
| --- | --- | --- | --- |
| `tokenIdentifier` | Absent | Required | Canonical Convex-authenticated identity key |
| `clerkUserId` | Absent | Required | Clerk Backend API user identifier |
| `firstName` | Optional | Optional | Display information from Clerk |
| `lastName` | Optional | Optional | Display information from Clerk |
| `lastLoginAt` | Absent | Required after login | Operational timestamp |
| `activatedAt` | Absent | Required after activation | First successful identity claim |

### Invitation fields

| Field | Purpose |
| --- | --- |
| `clerkInvitationId` | Latest Clerk invitation associated with the pending user |
| `invitedByTokenIdentifier` | Authenticated administrator who granted access |
| `invitedAt` | Time access was granted |

The existing profile fields such as Telegram ID and notes can remain. They are unrelated to role reconciliation and must not affect it.

### Required indexes

The implementation should provide indexed lookup by:

- `normalizedEmail`.
- `tokenIdentifier`.
- `clerkUserId`.
- `status`.

Convex indexes do not enforce uniqueness. Every mutation that creates or claims a user must query the relevant index and enforce uniqueness transactionally.

### Final schema reference

This is the intended final `users` shape after the migration is complete. Keep any existing profile fields that the application still uses.

```ts
const roleValidator = v.union(
  v.literal('admin'),
  v.literal('editor'),
  v.literal('viewer')
)

const userStatusValidator = v.union(
  v.literal('pending'),
  v.literal('active'),
  v.literal('disabled')
)

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

  telegramId: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_normalizedEmail', ['normalizedEmail'])
  .index('by_tokenIdentifier', ['tokenIdentifier'])
  .index('by_clerkUserId', ['clerkUserId'])
  .index('by_status', ['status'])
```

The identity and invitation fields remain optional in the final schema because pending rows intentionally do not have a Clerk identity, while migrated active users may not have invitation history.

## Record invariants

These rules must always be true:

- Every row has exactly one valid role.
- Every row has a normalized email.
- A `pending` row has no linked identity unless it is in a temporary migration state.
- An `active` row has both `tokenIdentifier` and `clerkUserId`.
- A `disabled` row cannot access protected application functions.
- A role is changed only by an authorized administrator operation.
- Login sync never changes a role or allowed-page list.
- An email is matched only after Clerk confirms that email is verified.
- The invited `email` and `normalizedEmail` are not silently replaced during profile sync; changing the access email is an explicit administrator operation.
- One authenticated identity cannot claim more than one user row.
- One user row cannot be claimed by more than one authenticated identity.
- An uninvited Clerk user does not receive a default role.

Fail closed when an invariant cannot be satisfied.

## State transitions

| From | Event | To | Required behavior |
| --- | --- | --- | --- |
| No row | Admin invites email | `pending` | Create role and access before attempting email delivery |
| `pending` | Admin changes role/access | `pending` | Update the same row |
| `pending` | Matching verified identity logs in | `active` | Attach Clerk identity atomically; preserve role |
| `pending` | Admin revokes access | No row | Remove access first, then attempt Clerk invitation revocation |
| `active` | User logs in again | `active` | Refresh profile and timestamps only |
| `active` | Admin changes role/access | `active` | Update Convex role/access; realtime UI reflects change |
| `active` | Admin disables user | `disabled` | Deny application access immediately |
| `disabled` | Admin explicitly restores user | `active` | Re-enable the existing linked identity |

Do not silently convert an active user back to pending. Do not automatically restore a disabled user because they received another Clerk invitation.

## Module boundaries

The implementation should preserve these responsibilities.

### Shared access policy

`admin-access.ts` remains the pure definition of:

- Valid roles.
- Known admin page paths.
- Allowed-page sanitization.
- Route access rules.
- Landing-page selection.

It must not fetch Clerk or Convex data. It accepts an already-authoritative access object and answers policy questions.

### Convex user module

`convex/users.ts` owns:

- Looking up the current user by authenticated `tokenIdentifier`.
- Looking up a pending user by normalized email.
- Creating or updating pending rows.
- Atomically activating a pending row.
- Updating identity profile fields without touching access fields.
- Returning the current authoritative user.
- Shared helpers that require an authenticated active user.
- Shared helpers that require an administrator.

All mutations must have validators. Sensitive helpers should be internal or callable only through protected public functions.

Reference shape for authoritative current-user lookup:

```ts
import { v } from 'convex/values'
import {
  query,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx
} from './_generated/server'

type UserReadCtx = QueryCtx | MutationCtx

export async function getCurrentUser(ctx: UserReadCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) return null

  return await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', q =>
      q.eq('tokenIdentifier', identity.tokenIdentifier)
    )
    .unique()
}

export async function requireActiveUser(ctx: UserReadCtx) {
  const user = await getCurrentUser(ctx)

  if (!user) throw new Error('Not invited')
  if (user.status !== 'active') throw new Error('Access disabled')

  return user
}

export async function requireAdmin(ctx: UserReadCtx) {
  const user = await requireActiveUser(ctx)

  if (user.role !== 'admin') throw new Error('Forbidden')

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
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)

    if (!user) return { kind: 'unlinked' as const }
    if (user.status === 'disabled') {
      return { kind: 'disabled' as const }
    }
    if (user.status !== 'active') {
      return { kind: 'conflict' as const }
    }

    await ctx.db.patch(user._id, {
      lastLoginAt: args.now,
      updatedAt: args.now
    })

    return { kind: 'active' as const, userId: user._id }
  }
})
```

Actions cannot read `ctx.db` directly. A Convex action that needs authorization should call the internal `getCallerAccess` query and check its returned role before making an external Clerk request.

Reference shape for creating or updating one pending row:

```ts
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
      .withIndex('by_normalizedEmail', q =>
        q.eq('normalizedEmail', args.normalizedEmail)
      )
      .unique()

    if (existing?.status === 'active') {
      throw new Error('User is already active; update their access instead')
    }

    if (existing?.status === 'disabled') {
      throw new Error('User is disabled; restore them explicitly')
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
      throw new Error('Pending user no longer exists')
    }

    await ctx.db.patch(user._id, {
      clerkInvitationId: args.clerkInvitationId,
      updatedAt: args.now
    })
  }
})
```

Keep email normalization in one shared pure helper:

```ts
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
```

### Convex Clerk integration

`convex/usersSync.ts` owns the first-login reconciliation action:

- Read the authenticated identity from Convex.
- Return the existing active user immediately when `tokenIdentifier` already matches.
- Fetch the Clerk user only when identity linking or profile refresh requires it.
- Extract verified Clerk email addresses.
- Ask the user module to claim exactly one matching pending row.
- Update profile fields and timestamps.
- Never derive or overwrite role and allowed pages from Clerk metadata.

The identity claim belongs in one internal mutation so duplicate or concurrent claims are resolved transactionally:

```ts
import type { Doc } from './_generated/dataModel'

export const claimPendingIdentity = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    verifiedEmails: v.array(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    now: v.number()
  },
  handler: async (ctx, args) => {
    const existingIdentity = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', q =>
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

      return {
        kind: 'active' as const,
        userId: existingIdentity._id
      }
    }

    const existingClerkUser = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', q =>
        q.eq('clerkUserId', args.clerkUserId)
      )
      .unique()

    if (existingClerkUser) {
      return { kind: 'conflict' as const }
    }

    const matchedRows: Array<Doc<'users'>> = []

    for (const normalizedEmail of new Set(args.verifiedEmails)) {
      const row = await ctx.db
        .query('users')
        .withIndex('by_normalizedEmail', q =>
          q.eq('normalizedEmail', normalizedEmail)
        )
        .unique()

      if (row && !matchedRows.some(match => match._id === row._id)) {
        matchedRows.push(row)
      }
    }

    if (matchedRows.length === 0) {
      return { kind: 'not_invited' as const }
    }

    if (matchedRows.length > 1) {
      return { kind: 'conflict' as const }
    }

    const pendingUser = matchedRows[0]

    if (pendingUser.status === 'disabled') {
      return { kind: 'disabled' as const }
    }

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

    return {
      kind: 'active' as const,
      userId: pendingUser._id
    }
  }
})
```

The public reconciliation action derives identity server-side, asks Clerk only for verified email addresses, and passes no role into the mutation:

```ts
export const syncCurrentUser = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return { kind: 'unauthenticated' as const }
    }

    const now = Date.now()
    const existingUser = await ctx.runQuery(
      internal.users.getCurrentForSync,
      {}
    )

    if (existingUser) {
      return await ctx.runMutation(internal.users.touchCurrentLogin, { now })
    }

    const clerk = createBackendClient()
    const clerkUser = await clerk.users.getUser(identity.subject)
    const verifiedEmails = clerkUser.emailAddresses
      .filter(email => email.verification?.status === 'verified')
      .map(email => normalizeEmail(email.emailAddress))

    return await ctx.runMutation(internal.users.claimPendingIdentity, {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      verifiedEmails,
      firstName: clerkUser.firstName?.trim() || undefined,
      lastName: clerkUser.lastName?.trim() || undefined,
      now
    })
  }
})
```

### Convex admin-user operations

`convex/adminUsers.ts` owns:

- Inviting an email.
- Resending an invitation.
- Updating role and allowed pages.
- Disabling and restoring users.
- Revoking pending access.
- Listing users for the admin UI.
- Calling the Clerk Backend API for invitation delivery and revocation.

Every operation first authorizes the caller using the Convex `users` row, not Clerk metadata.

### Nuxt authentication bridge

`app/plugins/convex.ts` should:

- Continue supplying Clerk tokens to Convex.
- Trigger reconciliation once Convex authentication is ready.
- Retry only transient authentication or network failures.
- Stop treating a successful Clerk login as proof of application access.

Application access state should come from the authoritative current-user query, combined with the reconciliation result in one small current-user composable. Do not create an independent role cache inside the plugin.

The composable must distinguish:

- Authentication still loading.
- Reconciliation still loading.
- Active application user.
- Authenticated but not invited.
- Disabled application user.
- Retryable reconciliation failure.

### Nuxt access composable

`app/composables/useAdminAccess.ts` should read the current Convex user and derive:

- Current role.
- Allowed pages.
- Visible navigation.
- Ability to manage users.
- Landing route.

It must no longer read role or page access from Clerk `publicMetadata`.

Reference composable shape:

```ts
import { useConvexQuery } from 'convex-vue'
import { api } from '../../convex/_generated/api'
import {
  ADMIN_PAGE_DEFS,
  canAccessAdminPath
} from '../../admin-access'

export function useAdminAccess() {
  const {
    data: current,
    isPending,
    error
  } = useConvexQuery(api.users.current, {})

  const access = computed(() => {
    if (current.value?.kind !== 'active') return null

    return {
      role: current.value.user.role,
      allowedPages: current.value.user.allowedPages
    }
  })

  const canManageUsers = computed(
    () => access.value?.role === 'admin'
  )

  const visiblePages = computed(() => {
    if (!access.value) return []
    if (access.value.role === 'admin') return [...ADMIN_PAGE_DEFS]

    return ADMIN_PAGE_DEFS.filter(page =>
      canAccessAdminPath(access.value!, page.path)
    )
  })

  return {
    current,
    isPending,
    error,
    access,
    canManageUsers,
    visiblePages
  }
}
```

The existing Convex plugin can continue calling `api.usersSync.syncCurrentUser` after Clerk and Convex authentication are ready. After the action activates a row, the subscribed `api.users.current` query updates automatically; no Clerk metadata reload is needed.

### Route and server authorization

Route guards may improve navigation, but protected data operations must always enforce access inside Convex.

Any remaining Nitro server route must not independently authorize with Clerk metadata. Prefer moving Clerk management operations into protected Convex actions. If a Nitro route must remain, it should obtain the same authoritative Convex user decision rather than introduce a second role-checking system.

## Invitation flow

The invitation operation follows this order.

1. Authenticate the caller through Convex.
2. Load the caller's active `users` row.
3. Require the caller's role to be `admin`.
4. Normalize and validate the recipient email.
5. Validate and sanitize role and allowed pages.
6. In one Convex mutation, create or update the pending `users` row.
7. Attempt to create the Clerk invitation with the absolute `/accept-invite` redirect.
8. If Clerk succeeds, save the Clerk invitation ID on the same pending row.
9. Return the access-record result and email-delivery result separately.
10. Record the administrative activity.

The Convex access row is written before the Clerk API call because access assignment is the administrator's decision, while email is only a delivery mechanism.

The Clerk invitation does not need role metadata for correctness. If role metadata is temporarily included for compatibility with the existing app, treat it as a non-authoritative mirror and never use it during reconciliation or authorization.

If Clerk email delivery fails:

- Keep the pending row.
- Show the administrator that access is saved but the email was not sent.
- Allow a resend.
- Allow the recipient to sign in directly and claim the role.

This behavior is intentional and directly satisfies the requirement that direct login must work even when email delivery does not.

Reference action shape:

```ts
export const invite = action({
  args: {
    email: v.string(),
    role: roleValidator,
    allowedPages: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(
      internal.users.getCallerAccess,
      {}
    )

    if (actor.role !== 'admin') {
      throw new Error('Forbidden')
    }

    const email = args.email.trim()
    const normalizedEmail = normalizeEmail(email)
    const allowedPages = getAllowedPages(args.role, args.allowedPages)
    const now = Date.now()

    const userId = await ctx.runMutation(
      internal.users.upsertPendingAccess,
      {
        email,
        normalizedEmail,
        role: args.role,
        allowedPages,
        invitedByTokenIdentifier: actor.tokenIdentifier!,
        now
      }
    )

    const clerk = createAdminClerkClient()

    try {
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: getAcceptInviteRedirectUrl(),
        ignoreExisting: true
      })

      try {
        await ctx.runMutation(
          internal.users.attachClerkInvitation,
          {
            userId,
            clerkInvitationId: invitation.id,
            now: Date.now()
          }
        )
      } catch (error) {
        console.error('Invitation sent but tracking update failed', error)

        return {
          accessSaved: true,
          emailSent: true,
          invitationTracked: false,
          userId,
          invitationId: invitation.id
        }
      }

      return {
        accessSaved: true,
        emailSent: true,
        invitationTracked: true,
        userId,
        invitationId: invitation.id
      }
    } catch (error) {
      console.error('Clerk invitation delivery failed', error)

      return {
        accessSaved: true,
        emailSent: false,
        invitationTracked: false,
        userId,
        invitationId: null
      }
    }
  }
})
```

Keep the existing activity-log calls around the access save and delivery result. Do not return the raw Clerk invitation object from a Convex action.

### Duplicate invitation behavior

For an existing pending row with the same normalized email:

- Update that row rather than insert another.
- Preserve one access record.
- Send a fresh Clerk invitation only when requested.
- Replace the stored Clerk invitation ID with the latest successful one.

For an active row:

- Treat a role change as an edit, not a new invitation.
- Do not clear its identity fields.
- Do not send another invitation unless the administrator explicitly requests a notification.

For a disabled row:

- Require an explicit restore operation.
- Do not restore access as a side effect of invitation sending.

## Login and reconciliation flow

The same reconciliation runs after every Clerk authentication method.

### Existing active identity

1. Read `ctx.auth.getUserIdentity()`.
2. Look up the user by `identity.tokenIdentifier`.
3. If the row is active, update only safe identity profile fields and `lastLoginAt`.
4. Return the row without changing role or allowed pages.

This fast path should not require an invitation lookup and should not depend on Clerk metadata.

### First login

1. Read the authenticated identity.
2. Confirm no row is already linked to its `tokenIdentifier`.
3. Fetch the Clerk user using the authenticated Clerk subject.
4. Collect only email addresses Clerk marks as verified.
5. Normalize those verified emails.
6. Look for pending user rows matching those normalized emails.
7. If exactly one row matches, activate it transactionally.
8. Attach `tokenIdentifier`, `clerkUserId`, `activatedAt`, and `lastLoginAt`.
9. Preserve the row's existing role and allowed pages.
10. Return the active user.

### No matching invitation

The person is authenticated by Clerk but has no application access.

- Do not create a `viewer`.
- Do not insert a new user automatically.
- Return a specific `not_invited` result.
- Show a real user-facing message explaining that the signed-in email has not been granted access.
- Provide sign-out, but do not reveal invitation details.

### Ambiguous or conflicting match

If more than one pending row matches the authenticated user's verified emails, or a row is already linked to another identity:

- Do not guess.
- Do not merge automatically.
- Fail closed with a conflict result.
- Log enough identifiers for an administrator to resolve the records.

This should be rare because invite mutations enforce normalized-email uniqueness, but the guard protects migrated or manually edited data.

### Clerk unavailable

For an already linked active user, use the Convex identity match and continue without fetching Clerk unless current profile data is essential.

For a first-time user, reconciliation requires verified-email confirmation. Return a retryable error rather than granting access.

## Role and access updates

Administrator edits update the Convex row only.

- Validate the role.
- Sanitize allowed pages.
- Prevent non-admin roles from receiving admin-only routes.
- Preserve identity fields.
- Record the change in the existing activity log.
- Let Convex subscriptions update navigation and UI immediately.

Do not wait for a Clerk token refresh. Do not read an older Clerk metadata value back into Convex.

If legacy Clerk metadata must be mirrored during migration, perform it after the Convex update as best effort. A mirror failure must not roll back or override the Convex decision.

## Revocation and disabling

### Pending access

Revoke access in Convex first by removing the pending row. Then attempt to revoke the Clerk invitation.

If Clerk revocation fails, the old email link may still authenticate the person, but reconciliation will find no Convex access row and will deny application access.

### Active access

Set the Convex user to `disabled`.

The Clerk account and session may remain valid, but every protected Convex function must reject the disabled application user. This separates authentication from application authorization cleanly.

## Authorization rules

Every protected Convex query, mutation, and action must:

1. Read the authenticated identity from `ctx.auth`.
2. Look up the `users` row using `tokenIdentifier`.
3. Require `status` to be `active`.
4. Check the stored role or page permission.
5. Reject before reading or writing protected data when authorization fails.

Never accept these values from the client for authorization:

- User ID.
- Clerk user ID.
- Email address.
- Role.
- Allowed pages.
- User status.

Client values may describe the requested operation, but identity and authority always come from the authenticated Convex context and stored user row.

Reference protected-mutation shape:

```ts
export const updateAccess = mutation({
  args: {
    userId: v.id('users'),
    role: roleValidator,
    allowedPages: v.array(v.string())
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const target = await ctx.db.get(args.userId)
    if (!target) throw new Error('User not found')

    const allowedPages = getAllowedPages(
      args.role,
      args.allowedPages
    )

    await ctx.db.patch(target._id, {
      role: args.role,
      allowedPages,
      updatedAt: Date.now()
    })
  }
})
```

The target `userId` is acceptable here because it identifies the record being administered. It must never be used to identify or authorize the caller; the caller always comes from `ctx.auth`.

## Failure and retry behavior

| Situation | Expected result |
| --- | --- |
| Clerk invitation email fails | Pending Convex access remains; admin can retry; direct login still works |
| Invitation link works | Clerk authenticates; reconciliation claims the same pending row |
| User signs in directly | Reconciliation claims the same pending row |
| Clerk role metadata is absent | No effect; Convex role is authoritative |
| Reconciliation runs twice | Same active row is returned; role is unchanged |
| Two admins invite the same email concurrently | One normalized-email row survives through transactional uniqueness checks |
| User signs in with a different email | No matching row; access denied |
| Uninvited Clerk user signs in | Authenticated but `not_invited`; no default access |
| Existing active user signs in while Clerk is temporarily unavailable | Existing Convex identity remains usable |
| First-time user signs in while Clerk is unavailable | Retryable error; no access granted |
| Admin changes a role during an active session | Convex subscription reflects the new role without a Clerk token refresh |
| Pending access is revoked but Clerk revocation fails | Link may authenticate, but application access is denied |
| Active user is disabled | Clerk may remain signed in, but protected Convex functions deny access |

## Migration plan for the existing Navarasa table

Use a widen-migrate-narrow rollout. Do not make new fields required before existing rows are backfilled.

### Deployment 1: widen and support both shapes

- Add `normalizedEmail`, `status`, `allowedPages`, invitation fields, and activation fields as optional.
- Temporarily make identity fields compatible with pending rows.
- Add the new indexes.
- Update new invitation writes to create the new shape.
- Update reads to tolerate legacy active rows.
- Stop any new login sync from overwriting an existing Convex role.

During this deployment, the relevant fields should be widened:

```ts
users: defineTable({
  tokenIdentifier: v.optional(v.string()),
  clerkUserId: v.optional(v.string()),
  email: v.optional(v.string()),
  normalizedEmail: v.optional(v.string()),
  role: roleValidator,
  allowedPages: v.optional(v.array(v.string())),
  status: v.optional(userStatusValidator),
  clerkInvitationId: v.optional(v.string()),
  invitedByTokenIdentifier: v.optional(v.string()),
  invitedAt: v.optional(v.number()),
  activatedAt: v.optional(v.number()),
  lastLoginAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_normalizedEmail', ['normalizedEmail'])
  .index('by_tokenIdentifier', ['tokenIdentifier'])
  .index('by_clerkUserId', ['clerkUserId'])
  .index('by_status', ['status'])
```

Keep the application's existing optional profile fields in this temporary schema as well.

### Backfill existing users

- Normalize every existing email.
- Mark linked users as `active`.
- Preserve the existing Convex role.
- Set activation and update timestamps from the best available existing timestamps.
- Backfill page access from the current authoritative access data before Clerk metadata is retired.
- Detect duplicate normalized emails and resolve them explicitly.
- Verify every active row has both identity fields.

Use the Convex migrations component for a non-trivial or production dataset. Run a dry run, monitor progress, and verify there are no remaining legacy rows.

A safe first backfill can normalize identity and status without inventing page permissions:

```ts
export const backfillUserIdentityShape = migrations.define({
  table: 'users',
  migrateOne: (_ctx, user) => {
    if (!user.email) {
      throw new Error(`User ${user._id} has no email`)
    }

    const isLinked = Boolean(
      user.tokenIdentifier && user.clerkUserId
    )

    return {
      normalizedEmail: normalizeEmail(user.email),
      status: isLinked ? 'active' : 'pending',
      activatedAt: isLinked
        ? user.activatedAt ?? user.createdAt
        : undefined
    }
  }
})
```

Backfill `allowedPages` separately from the existing authoritative Clerk metadata or an audited export. Do not replace unknown permissions with a guessed default. Only narrow `allowedPages` to required after every row has been verified.

### Deployment 2: switch authority

- Make all admin authorization read the Convex row.
- Make navigation and route access read the Convex row.
- Make role-edit operations write Convex first.
- Make reconciliation preserve Convex role and access.
- Stop using Clerk metadata as an authorization fallback.

### Deployment 3: narrow and clean up

- Require the fields that must exist for every row.
- Keep identity fields optional because pending rows intentionally lack them.
- Remove legacy role-sync branches.
- Remove unused Clerk custom role claims.
- Remove duplicate Nitro authorization paths if Clerk management has moved into Convex actions.
- Keep legacy Clerk metadata only if another confirmed consumer still needs it.

## Recommended implementation order

Keep changes reviewable in this order:

1. Widen the `users` schema and add indexes.
2. Add centralized current-user and administrator authorization helpers.
3. Change invitation creation to persist pending access before Clerk delivery.
4. Change reconciliation to claim pending users by verified email.
5. Add the authoritative current-user query and reconciliation states.
6. Switch the Nuxt access composable and navigation to Convex.
7. Switch protected admin operations to Convex authorization.
8. Implement role edit, resend, revoke, disable, and restore behavior.
9. Backfill existing users and verify uniqueness.
10. Remove Clerk-metadata authorization and old sync behavior.
11. Narrow the schema after verification.

Each step should keep the application deployable. Do not combine the data migration and removal of legacy reads in one deployment.

## Testing strategy

Test at three levels.

### Pure policy tests

Cover:

- Email normalization.
- Valid and invalid roles.
- Allowed-page sanitization.
- Admin-only routes.
- Landing-page selection.
- State-transition rules.

### Convex function tests

Cover:

- Pending-row creation.
- Duplicate normalized-email invitation.
- Atomic activation.
- Idempotent repeated reconciliation.
- Conflict when a row is linked to another identity.
- No default user creation for an uninvited identity.
- Role preservation during profile sync.
- Admin-only role updates.
- Pending revocation.
- Active-user disabling.
- Disabled-user denial in protected functions.

Use authenticated test identities. Assert database state after every mutation, not only returned values.

### End-to-end tests

Use a Clerk development instance and separate test emails.

#### Invitation-link signup

Given a pending user with an assigned role, when the recipient opens the fresh invitation in a signed-out browser and completes Clerk signup, then:

- The same Convex row becomes active.
- The assigned role is unchanged.
- The user lands on an allowed page.
- No duplicate user row exists.

#### Direct signup or login

Given a pending user with an assigned role, when that verified email authenticates without using the invitation link, then:

- The same Convex row becomes active.
- The assigned role is unchanged.
- The user receives the same access as the invitation-link path.

#### Failed email delivery

Given Clerk invitation creation fails after Convex access is saved, when the user authenticates directly with the verified email, then the pending role still activates successfully.

#### Uninvited user

Given no matching Convex row, when a valid Clerk user signs in, then the app displays the not-invited state and every protected Convex function denies access.

#### Existing active user

Given an active user, when they sign in repeatedly, then only profile and login timestamps change; role and allowed pages remain unchanged.

#### Role change

Given a signed-in active user, when an administrator changes the role, then the new Convex role is reflected without signing out or refreshing a Clerk token.

#### Revoke and disable

Verify:

- Revoked pending access cannot be claimed even if an old Clerk link still opens.
- A disabled active user remains authenticated with Clerk but cannot access protected Convex data.
- Explicit restore returns the existing user to active without creating another row.

#### Security cases

Verify:

- A browser-supplied role is ignored.
- A browser-supplied email cannot claim access.
- An unverified Clerk email cannot match a pending row.
- Two simultaneous claims cannot activate one row for different identities.
- Two simultaneous invitations cannot create duplicate normalized-email rows.

## Verification checklist for the implementing agent

- [ ] Convex guidance has been read before editing backend files.
- [ ] `npx convex codegen` succeeds.
- [ ] Targeted type checking succeeds.
- [ ] Targeted tests for user and invitation functions pass.
- [ ] Existing active users retain their current roles after migration.
- [ ] No login path writes role from Clerk into Convex.
- [ ] No protected backend function trusts a client-provided identity or role.
- [ ] No route or server admin check uses Clerk metadata as its final authority.
- [ ] Invitation-link and direct-login tests activate the same pending row.
- [ ] Failed email delivery does not lose the assigned role.
- [ ] Uninvited users receive no default role.
- [ ] Disabled users are rejected by protected Convex functions.
- [ ] Duplicate-email and concurrent-claim tests pass.
- [ ] Production `APP_URL` produces the correct invitation redirect.
- [ ] A production or staging private-window invitation test succeeds.

## Definition of done

The implementation is complete only when all of these statements are true:

- Convex is the sole application-role source of truth.
- Administrators assign role and access before Clerk email delivery.
- The same pending row activates through invitation-link signup or direct login.
- Login sync cannot overwrite role or allowed pages.
- Uninvited and disabled Clerk users cannot access protected application data.
- UI navigation and backend authorization use the same Convex user record.
- Existing users are migrated without losing access.
- Automated tests cover state transitions, authorization, idempotency, and conflicts.
- End-to-end tests cover both authentication paths and failed email delivery.

## Current references

- [Convex: Storing Users in the Convex Database](https://docs.convex.dev/auth/database-auth)
- [Convex: Auth in Functions](https://docs.convex.dev/auth/functions-auth)
- [Convex and Clerk integration](https://docs.convex.dev/auth/clerk)
- [Clerk: Invite users to your application](https://clerk.com/docs/guides/users/inviting)
- [Clerk: Application invitation custom flow](https://clerk.com/docs/guides/development/custom-flows/authentication/application-invitations)
- [Clerk: User metadata](https://clerk.com/docs/guides/users/extending)
- [Convex migrations component](https://www.convex.dev/components/migrations)
