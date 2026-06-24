import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

type PostsDatabase = MutationCtx['db']

export function normalizePostSlug(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getPostsWithSlug(db: PostsDatabase, slug: string) {
  return await db
    .query('posts')
    .withIndex('by_slug', query => query.eq('slug', slug))
    .collect()
}

export async function assertPostSlugAvailable(
  db: PostsDatabase,
  requestedSlug: string,
  currentPostId?: Id<'posts'>
) {
  const slug = normalizePostSlug(requestedSlug)

  if (!slug) {
    throw new Error('Enter a slug containing at least one letter or number.')
  }

  const conflictingPost = (await getPostsWithSlug(db, slug))
    .find(post => post._id !== currentPostId)

  if (conflictingPost) {
    throw new Error(`The slug "${slug}" is already used by another post.`)
  }

  return slug
}

export async function createUniquePostSlug(db: PostsDatabase, requestedSlug: string) {
  const baseSlug = normalizePostSlug(requestedSlug) || 'generated-article'
  let slug = baseSlug
  let suffix = 2

  while ((await getPostsWithSlug(db, slug)).length > 0) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}
