import assert from 'node:assert/strict'
import test from 'node:test'
import type { Id } from '../convex/_generated/dataModel.ts'
import type { MutationCtx } from '../convex/_generated/server.ts'
import {
  assertPostSlugAvailable,
  normalizePostSlug
} from '../convex/lib/postSlugs.ts'

type PostRecord = { _id: Id<'posts'>, slug: string }

function createDatabase(posts: PostRecord[]) {
  return {
    query: () => ({
      withIndex: (_index: string, getRange: (query: { eq: (_field: string, value: string) => string }) => string) => {
        const slug = getRange({ eq: (_field, value) => value })

        return {
          collect: async () => posts.filter(post => post.slug === slug)
        }
      }
    })
  } as unknown as MutationCtx['db']
}

test('normalizes slugs consistently', () => {
  assert.equal(normalizePostSlug('  Café & New Post!  '), 'cafe-new-post')
})

test('rejects a slug owned by another post', async () => {
  const db = createDatabase([{ _id: 'post-1' as Id<'posts'>, slug: 'existing-post' }])

  await assert.rejects(
    assertPostSlugAvailable(db, 'Existing Post', 'post-2' as Id<'posts'>),
    /already used by another post/
  )
})

test('allows an existing post to retain its own slug', async () => {
  const postId = 'post-1' as Id<'posts'>
  const db = createDatabase([{ _id: postId, slug: 'existing-post' }])

  assert.equal(await assertPostSlugAvailable(db, 'Existing Post', postId), 'existing-post')
})
