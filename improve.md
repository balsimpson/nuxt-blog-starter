# Website architecture and efficiency audit

Audited on 23 June 2026 against the current working tree, `design.md`, the project guidelines, Nuxt 4 conventions, and current Convex/Clerk guidance.

## Verdict

The app uses the main Nuxt conventions correctly: Nuxt 4's `app/` directory, file-based pages, layouts, global route middleware, auto-imported components/composables, `UApp`, Nuxt UI controls, Tailwind, and generated Convex types. The current code also passes `npm run typecheck` and `npm run build`.

It is not yet safe or efficient enough to call production-ready, and it is not free of redundant code. The most urgent problem is the security boundary: `/admin` is hidden behind Clerk in the Nuxt router, but the Convex functions that read drafts, modify posts, upload files, run searches, and generate articles do not authenticate or authorize callers. The largest performance issues are client-only public content, unbounded/full-document queries, and shipping the rich editor on the public homepage.

## What is already working well

- The directory structure follows Nuxt 4 conventions and keeps routes, layouts, middleware, components, composables, and utilities in their expected locations.
- Public and admin routes are visibly separated, and the admin-only pages intentionally opt out of SSR where a browser-only editor/workspace makes sense.
- Nuxt UI is used for genuine controls such as the header, buttons, forms, editor, tabs, slideover, badges, breadcrumbs, and cards.
- The current public redesign is mostly flat and editorial, with good dark-mode pairing and useful loading/empty states.
- Convex arguments are generally validated and the application consumes its generated API and data-model types.
- Image/video extraction has started moving into focused utilities rather than remaining entirely inside the editor.

## Findings by priority

### P0 — complete before deployment

#### 1. The backend has no authentication or admin authorization

**Evidence**

- `app/middleware/auth.global.ts:2-15` redirects unauthenticated navigation, but route middleware cannot authorize direct Convex RPC calls.
- There is no `app/plugins/convexClerk.ts` (or equivalent) to pass Clerk's Convex JWT to the Convex client.
- There is no `convex/auth.config.ts` configuring Clerk as a Convex auth provider.
- No Convex handler calls `ctx.auth.getUserIdentity()`.
- Publicly callable functions include `posts.upsert`, `posts.remove`, `uploads.generateUploadUrl`, `uploads.saveImage`, `tavily.search`, and all public generation session queries/mutations.
- The route middleware admits any signed-in Clerk user; it does not check an admin role, permission, or explicit allowlist.

**Impact**

Someone does not need to visit `/admin` to call these functions. They can read private workflow data, create/update/delete posts, consume paid AI/search services, and write to file storage. Convex functions are public by default, so UI gating is not a backend security boundary.

**Recommendation**

1. Configure the Clerk Convex JWT template and add `convex/auth.config.ts`.
2. Add a client plugin that calls `convex.setAuth()` with Clerk's `convex` token.
3. Create one `requireAdmin(ctx)` helper that checks identity and a real admin permission/allowlist. Authentication alone is insufficient for a single-owner admin.
4. Call it from every private query, mutation, and action. Make orchestration-only functions `internalQuery`, `internalMutation`, or `internalAction` where possible.
5. Keep only explicitly public, published-content queries unauthenticated.

References: [Convex auth in functions](https://docs.convex.dev/auth/functions-auth), [Convex internal functions](https://docs.convex.dev/functions/internal-functions), and [Clerk's Convex integration](https://clerk.com/docs/integrations/databases/convex).

#### 2. Drafts and admin data are exposed by public read queries

**Evidence**

- `convex/posts.ts:11-20` returns a post by slug without checking `publishStatus`.
- `convex/posts.ts:23-29` returns any post by ID without authorization.
- `convex/posts.ts:32-39` returns every post, including drafts and full content, without authorization.
- `app/pages/blog/[slug].vue:9` calls the unrestricted `posts.list` query merely to select two related entries.
- `convex/articleGeneration.ts:258-295` exposes generation prompts, drafts, research, sources, status messages, and errors without authorization.

**Impact**

A guessed slug or ID can reveal unpublished writing. Generation sessions may contain sensitive prompts, research, source material, and drafts.

**Recommendation**

- Replace `getBySlug` with a public `getPublishedBySlug` that returns `null` unless the document is published.
- Restrict `getById`, `list`, and all generation-session reads to admins.
- Return only the fields each public view needs; do not send full article bodies for listing or related-post UI.

#### 3. File upload and paid-service entry points are open and insufficiently constrained

**Evidence**

- `convex/uploads.ts:4-38` has no identity check.
- The browser's `accept="image/*"` is only a picker hint. The backend trusts caller-provided filename, MIME type, and size and does not enforce a size/type policy.
- `convex/tavily.ts:4-6` is a public action that can consume Tavily quota.
- `convex/articleGeneration.ts:297-629` allows public session creation, retries, approval, and deletion, which can consume AI/search quota and write posts.

**Recommendation**

- Require admin authorization before generating upload URLs, recording uploads, searching, or starting/retrying generation.
- Enforce allowed MIME types and maximum size after upload metadata is available; delete rejected storage objects.
- Prefer internal actions for search/generation steps that should only be reached through an authorized public mutation.
- Add rate/cost limits appropriate for the deployment.

### P1 — high-value performance and correctness work

#### 4. Public content is client-only, giving up Nuxt's main SSR/SEO advantage

**Evidence**

- `nuxt.config.ts:11-15` sets `convex.server: false`, although the installed integration supports SSR/SSG.
- `app/pages/index.vue:87-144` and `app/pages/blog/index.vue:71-151` wrap the main post lists in `ClientOnly`.
- `app/pages/blog/[slug].vue:8-20` obtains both article content and SEO metadata from a client-side Convex query.

**Impact**

Initial HTML contains skeletons rather than post titles/body content. Search/social crawlers may see generic metadata, readers wait for hydration plus a second data round trip, and a missing article is rendered as a client-side state instead of an HTTP 404.

**Recommendation**

- Enable an SSR-capable public data path using the integration's suspense support or a keyed `useAsyncData` wrapper.
- SSR the homepage feed, archive, article body, and article metadata; keep real-time subscriptions only where freshness materially helps.
- Keep editor/generation routes client-only.
- Use `createError({ statusCode: 404 })` or `showError` when a published slug does not exist.

Nuxt recommends `useFetch`/`useAsyncData` for universal data because their payload is transferred to the client without a duplicate hydration fetch. Client-only fetching is intended for non-SEO-sensitive data. See [Nuxt data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching).

#### 5. Post queries scan and transfer much more data than each page needs

**Evidence**

- `convex/posts.ts:41-49` opens the `by_slug` index without an index range, applies `.filter()` for publish status, and then `.collect()`s every match. The slug index does not help the status filter.
- The homepage downloads every published post with full content, sorts it in the browser, maps it, and only then takes six (`app/pages/index.vue:5-27`).
- The archive repeats that sorting/mapping and downloads every full article body (`app/pages/blog/index.vue:6-49`).
- The detail page downloads every post—including drafts and their content—to show two related links (`app/pages/blog/[slug].vue:9,22-28`).
- The admin downloads the entire table and calculates filters/stats in the browser (`app/pages/admin/index.vue:21,41-62`).

**Impact**

Database work, bandwidth, client parsing, and reactive recomputation all grow with the total amount of writing rather than the visible result count.

**Recommendation**

- Add an index shaped around public access and ordering, for example publish status plus a normalized publication timestamp.
- Add dedicated queries:
  - homepage summaries: ordered, `.take(6)`, summary fields only;
  - archive summaries: paginated, summary/media fields only;
  - article by published slug: one full document;
  - related published summaries: deterministic and limited to two or three;
  - admin summaries: authenticated and paginated.
- Store/maintain a canonical `displayPublishedAt` and excerpt/featured media so list pages do not parse article bodies.
- Replace `.filter()` scans with index ranges and replace unbounded `.collect()` with `.take()`/`.paginate()` where the result is not inherently bounded.

References: [Convex indexes](https://docs.convex.dev/database/reading-data/indexes/) and [Convex reading data](https://docs.convex.dev/database/reading-data).

#### 6. The public homepage eagerly loads the full rich editor

**Evidence**

- `app/pages/index.vue:148-172` renders `AppEditor` as a public demo.
- The production route manifest lists the editor chunk as a direct import of `pages/index.vue`.
- That minified editor chunk is 582.32 kB before gzip and brings Tiptap/ProseMirror plus multiple Nuxt UI editor dependencies onto the homepage.

**Recommendation**

- Best performance: replace the live homepage editor with a lightweight visual and link to the authenticated editor.
- If the live demo is a product requirement, load it only after explicit interaction or when near the viewport; `ClientOnly` alone does not prevent the browser from downloading it.
- Keep the editor route split from public route code and re-run a bundle comparison after the change.

#### 7. The production bundle has measurable weight and duplicated font delivery

**Evidence from `npm run build`**

- The main generated CSS is 295.85 kB (37.27 kB gzip).
- Four JavaScript chunks are between 458.67 kB and 622.34 kB minified, and Vite reports chunks over 500 kB.
- The output contains 32 local font files totaling about 812 kB.
- Nuxt Fonts generated local `@font-face` rules, while `app/app.vue:13-23` still emits Google Fonts preconnects and a Google stylesheet link. The built server bundle contains that external stylesheet URL, so two delivery strategies are configured.
- Several unused legacy components contain slate palettes, gradients, large radii, and animations; Tailwind sees source classes even when those components are not routed, which contributes needless generated CSS.

**Recommendation**

- Remove the manual Google stylesheet/preconnects and explicitly configure the already-active Nuxt Fonts integration with only the required families, weights, styles, and subsets.
- Remove dead components before evaluating Tailwind CSS size again.
- Keep the editor and AI workspace as route-level/lazy chunks; inspect the post-cleanup route graph before adding manual Rollup chunk rules.
- Remove the unused `motion-v/nuxt` module unless motion components are introduced intentionally.

Nuxt's current performance guidance recommends Nuxt Fonts and Nuxt Image for optimized asset delivery: [Nuxt performance best practices](https://nuxt.com/docs/4.x/guide/best-practices/performance).

#### 8. Archive media is heavier and less accessible than necessary

**Evidence**

- `app/pages/blog/index.vue:74-120` puts a live YouTube iframe inside the `NuxtLink` for every video entry. This nests an interactive player inside an interactive link and can load several third-party players on one archive view.
- The archive images do not specify lazy loading, decoding, intrinsic dimensions, or responsive sources (`app/pages/blog/index.vue:87-91`).
- Archive/article iframes have no `title` (`app/pages/blog/index.vue:78-83`, generated markup in `app/pages/blog/[slug].vue:86`).

**Recommendation**

- Render a thumbnail/poster with a play affordance on archive cards; instantiate the iframe only after user intent or on the article page.
- Do not nest the player inside a page link.
- Add descriptive iframe titles.
- Add `@nuxt/image`/`NuxtImg` or, at minimum, responsive dimensions, `loading="lazy"`, and `decoding="async"` for below-fold images.

#### 9. Slug handling can create collisions and surprising URL changes

**Evidence**

- `by_slug` is an index, not a uniqueness constraint. `posts.upsert` can patch an ID to a slug already owned by another post; later `getBySlug(...).unique()` will throw.
- `AppEditor.vue:281-285` regenerates the slug every time the title changes, including after an author deliberately edits the slug.
- `slugify` exists separately in `AppEditor.vue`, `convex/posts.ts`, and `convex/articleGeneration.ts`; the `convex/posts.ts` copy is currently unused.

**Recommendation**

- Make the server authoritative: normalize and check slug ownership inside the mutation before insert/patch.
- Preserve a manually edited slug with a dirty flag; only auto-generate while it has not been customized.
- Put backend slug normalization in one shared Convex helper and test collision, edit, and generated-draft paths.

### P2 — cleanup and maintainability

#### 10. There is confirmed dead source and dependency residue

No current template references these components:

- `app/components/AppBlogSection.vue`
- `app/components/AppDivider.vue`
- `app/components/AppFeatures.vue`
- `app/components/AppHero.vue`
- `app/components/AppLogo.vue`
- `app/components/TemplateMenu.vue`

These exports are referenced only by their own declarations:

- `app/composables/useEditorImageUpload.ts` — an older single-image implementation now duplicated by the multi-image logic in `AppEditor.vue`.
- `app/utils/clipboard.ts`
- `app/utils/links.ts`

Likely unused direct dependencies/configuration:

- `motion-v` and the `motion-v/nuxt` module: no motion component/composable is used.
- `@ai-sdk/provider-utils`: no direct import; it is already brought transitively by the AI SDK.
- `convex-helpers`: no application import.

Remove these one group at a time, run typecheck/build, and compare bundle output. Also remove the tracked `tsconfig.tsbuildinfo` artifact and add `*.tsbuildinfo` to `.gitignore`.

#### 11. Repeated presentation logic should be consolidated

**Evidence**

- Homepage, archive, and the unused `AppBlogSection` independently sort posts, choose dates, format dates, and derive preview text.
- YouTube URL/block parsing exists in `postVideos.ts`, again in `blog/index.vue`, and again in `[slug].vue`.
- Date formatting is repeated across homepage, archive, detail, related posts, admin, and editor.
- Homepage and archive duplicate skeleton/list summary shapes.

**Recommendation**

- Prefer server-shaped post summaries, then keep one small `usePostPresentation` composable or pure utility for locale formatting.
- Use `postVideos.ts` as the single YouTube parsing/embed authority and allow only supported YouTube hosts.
- Extract shared `PostMeta`, `PostSummaryRow`, and matching skeleton components only where the rendered pattern is genuinely the same.
- Keep abstraction shallow; the goal is one source of truth, not a parallel UI framework.

#### 12. Three files have grown beyond a maintainable responsibility boundary

- `app/components/ArticleGenerationWorkspace.vue`: 1,070 lines.
- `convex/articleGeneration.ts`: 1,172 lines.
- `app/components/AppEditor.vue`: 731 lines.

Recommended seams:

- Generation UI: session list, workflow status, clarification form, research/source view, outline view, draft review, and a `useArticleGenerationSession` composable.
- Generation backend: public authorized session commands, internal pipeline orchestration, research, outline, drafting, persistence, and shared validators/helpers.
- Editor: post state/persistence composable, media-upload composable, toolbar configuration, metadata slideover, and featured-media picker.

This reduces rerender scope, makes authorization harder to omit, and permits focused tests without introducing nested visual surfaces.

#### 13. Local component-order and type-safety rules are not consistently followed

- The project guideline requires `<template>` before `<script>`, but 14 current `.vue` files begin with `<script>`.
- Public post mapping uses `(post as any)._creationTime`; related posts use `(p: any)`.
- Generation code uses several `as any` casts, and two backend helpers accept `ctx: any`/IDs as `any` (`convex/articleGeneration.ts:212-226`).
- `@vueuse/core` is imported directly in `app/layouts/default.vue` but is not a declared direct dependency; it currently works because Nuxt UI hoists it transitively.

**Recommendation**

- Reorder component blocks as files are touched or apply one mechanical pass after functional work.
- Use generated `Doc<>`, `Id<>`, `QueryCtx`, `MutationCtx`, and `ActionCtx` types.
- Add `@vueuse/core` directly if the explicit import remains, or use the Nuxt/VueUse auto-import provided by the installed module setup.
- Add ESLint (including Vue/Nuxt rules) and a `lint` script so these conventions are enforced rather than remembered.

#### 14. Metadata, status codes, and small accessibility details need a production pass

**Evidence**

- `app/app.vue:27-36` still identifies every page as “Nuxt Starter Template” and uses Nuxt UI's starter preview as the Open Graph image.
- Homepage and archive do not define page-specific SEO metadata.
- The detail page's metadata depends on client-only data and has no canonical URL or article image.
- The in-page not-found state does not set an HTTP 404.
- `<time datetime>` receives human-formatted strings such as `23 Jun 2026` instead of machine-readable ISO dates.
- `app/pages/admin/index.vue:100` says “Keep the dish catalog up to date,” which is stale copy from another product area.
- `app/pages/admin/index.vue:96` and `:123` produce two page-level `<h1>` elements.

**Recommendation**

- Set site defaults in `nuxt.config.ts`/app config and page-specific `useSeoMeta` values from SSR data.
- Add canonical URLs and article OG images.
- Return real 404 responses for missing published slugs.
- Bind ISO timestamps to `datetime` and keep localized text as the visible value.
- Replace stale admin copy and keep one semantic `<h1>` per page.

#### 15. The admin index conflicts with the project's flat-layout rule

`app/pages/admin/index.vue:116-185` places three `UCard` components inside another `UCard`, then adds a second outer card for content management. Flatten the dashboard into one page surface separated by headings, rules, and compact statistic rows. This is a design-system issue rather than a Nuxt runtime issue, but correcting it will also reduce markup and repeated card styling.

## Recommended implementation order

1. Wire Clerk tokens into Convex, add `requireAdmin`, and protect/internalize every non-public function.
2. Split public published queries from private draft/admin queries; close draft, upload, search, and generation exposure.
3. Add indexed, bounded summary/detail query shapes and pagination.
4. Restore SSR for public content and real 404/SEO handling.
5. Remove or interaction-lazy-load the homepage editor; replace archive iframes with thumbnails.
6. Remove dead source/dependencies, consolidate fonts, and compare production bundle output.
7. Consolidate duplicated post/date/video/slug logic and split the three oversized files.
8. Finish metadata, semantic HTML, admin flattening, linting, and focused tests.

## Validation performed

- `npm run typecheck` — passed. Nuxt/Nitro emitted a duplicated `useAppConfig` import warning, but no type errors.
- `npm run build` — passed. Vite emitted sourcemap warnings and a chunk-size warning for chunks over 500 kB.
- Static reference scan — confirmed the dead components/composable/utilities listed above.
- Production output inspection — confirmed the homepage-to-editor import, chunk sizes, generated local fonts, and the remaining external Google Fonts link.

## Suggested acceptance checks after remediation

- An anonymous Convex client cannot list drafts, read generation sessions, mutate posts, upload files, or trigger Tavily/AI work.
- A normal signed-in user without the admin permission also receives a backend authorization error.
- Viewing page source for `/`, `/blog`, and a published `/blog/:slug` contains real content and correct metadata.
- A missing or draft slug returns HTTP 404 publicly.
- Homepage queries return no more than six summary documents; archive/admin lists paginate; related posts do not fetch full tables.
- The homepage no longer preloads the editor chunk.
- Archive video entries load no YouTube iframe until user intent.
- Typecheck and build remain clean, with a documented decision on any remaining warnings.
