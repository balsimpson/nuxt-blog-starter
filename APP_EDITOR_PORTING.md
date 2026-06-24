# AppEditor porting checklist

Use this when moving `app/components/AppEditor.vue` into another Nuxt UI + Convex project.

## 1. Install the direct dependencies

```bash
npm install @nuxt/ui convex convex-nuxt @vueuse/core @tiptap/vue-3 @tiptap/extension-youtube @tiptap/extension-placeholder @iconify-json/lucide
```

Do not rely on Nuxt UI's transitive Tiptap or VueUse dependencies. Keep Nuxt UI and the Tiptap packages on compatible versions.

## 2. Configure Nuxt

Add `@nuxt/ui` and `convex-nuxt` to `modules`, configure the Convex URL, and keep the ProseMirror deduplication entries:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', 'convex-nuxt'],

  convex: {
    url: process.env.CONVEX_URL,
    manualInit: false,
    server: false
  },

  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  }
})
```

- Set `CONVEX_URL` in the destination environment.
- Wrap the application in `<UApp>` so slideover and toast behavior works.
- Ensure the app loads Tailwind/Nuxt UI CSS and the Lucide icon collection.

## 3. Copy the Convex contract

Copy or reproduce these source files in the destination project:

- `convex/posts.ts`: `getById`, `upsert`, and `remove`.
- `convex/uploads.ts`: `generateUploadUrl` and `saveImage`.
- `convex/schema.ts`: the `posts` and `editorImages` tables, including the `posts.by_slug` index.

The component expects:

- A post with `slug`, optional `title`, `content`, `contentType`, optional `publishStatus`, `updatedAt`, and the optional metadata fields used in the settings panel.
- `upsert` to return `_id`, `slug`, `contentType`, and `updatedAt`.
- `saveImage` to return `{ url }`.

Then generate and deploy the Convex API:

```bash
npx convex dev
# or, for generated types only
npx convex codegen
```

The component imports `~~/convex/_generated/api` and `~~/convex/_generated/dataModel`. Update those imports if the destination uses a different Convex directory.

## 4. Copy and use the component

Copy `app/components/AppEditor.vue` into the destination's component directory.

```vue
<!-- Create a post -->
<AppEditor />

<!-- Edit a post -->
<AppEditor :post-id="post._id" />

<!-- Editor demo: post save/delete is disabled -->
<AppEditor demo />

<!-- Hide post metadata settings -->
<AppEditor :post-id="post._id" :show-settings="false" />
```

`postId` must be an `Id<'posts'>`, not a slug or arbitrary string.

## Gotchas

- The referenced Convex mutations currently have no authorization checks. Add admin/auth checks before exposing the editor in production.
- `demo` disables post persistence, but its image button still uploads to Convex storage.
- Autosave watches only title, slug, and content. Metadata changes save on Publish/Update or after one of those watched fields changes.
- Changing the title regenerates the slug and can overwrite a manually edited slug.
- The current `upsert` falls back to finding a post by slug when no ID exists. Reject slug collisions instead if a new post must never update an existing post.
- A content-only post receives the slug `untitled`; make that slug unique or require a title before autosave.
- Image selection uses Nuxt UI's `UFileUpload.inputRef`. Re-test image uploads when upgrading Nuxt UI.
- Keep the ProseMirror Vite entries above if duplicate-plugin or editor-state errors appear.

## Verification

```bash
npm run typecheck
npm run build
```

Manually verify: create and autosave, reload by post ID, publish/unpublish, metadata save, image insertion, YouTube embed, delete, and authorization denial for a non-admin user.
