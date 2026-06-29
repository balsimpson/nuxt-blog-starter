# Project guidelines

- This is a Nuxt 4, Vue, TypeScript, Nuxt UI, Tailwind CSS, Clerk, and Convex app. Follow existing project patterns before adding new abstractions.
- Use Nuxt UI components when they fit and Tailwind utilities for styling.
- Create new components or composables when necessary for modularily and scalability
- When writing code for a .vue file, first comes the <template> code and then the <script> code
- Treat `design.md` as the visual and copy source of truth. Keep layouts flat and editorial; do not nest cards. Add only real user-facing copy—never placeholder text.
- Keep public pages and `/admin` authentication behavior consistent with `app/middleware/auth.global.ts`.
- After changes, run the smallest relevant check; use `npm run typecheck` for application code.

## Convex

Before editing Convex code, read `convex/_generated/ai/guidelines.md`; its rules override general Convex knowledge. Do not edit files in `convex/_generated` except through Convex tooling.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
