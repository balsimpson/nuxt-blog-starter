const clerkDomain = process.env.CLERK_JWT_ISSUER_DOMAIN

if (!clerkDomain) {
  throw new Error('CLERK_JWT_ISSUER_DOMAIN is not configured in the Convex deployment.')
}

export default {
  providers: [
    {
      domain: clerkDomain,
      applicationID: 'convex'
    }
  ]
}
