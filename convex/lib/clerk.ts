import { createClerkClient } from '@clerk/backend'

export function createAdminClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured in the Convex deployment.')
  }

  return createClerkClient({ secretKey })
}

export function getAcceptInviteRedirectUrl() {
  const appUrl = process.env.APP_URL

  if (!appUrl) {
    throw new Error('APP_URL is not configured in the Convex deployment.')
  }

  return new URL('/accept-invite', appUrl).toString()
}
