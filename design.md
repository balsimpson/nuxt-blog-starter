# Design System

A minimalist editorial surface. The product reads like a printed journal
transferred to the web — quiet, legible, typographically deliberate. There is
one canvas per page; sections are separated by hairline rules, not boxes or
shadows. Decoration is almost entirely typographic.

This document is the source of truth. When in doubt, prefer restraint.

---

## 1. Voice

- **Tone**: understated, dry, confident. No exclamation marks in marketing copy.
- **Labels**: editorial over corporate. "Journal" not "Blog", "Entry" not
  "Post", "All entries" not "See more", "Read entry" not "Read article".
- **Microcopy**: lowercase where natural ("nothing is saved"), sentence case for
  UI labels, `UPPERCASE TRACKING` reserved for meta/eyebrows only.
- **Numbers**: ordinal where enumerated (`01`, `02`…), `tabular-nums` on dates.

---

## 2. Color

Two neutrals carry the entire UI. No brand accent color is used for text or
backgrounds. Contrast comes from type weight, size, and the light/dark pair.

This visual system is registered as the **`editorial`** site theme. Named site
themes and light/dark color mode are separate concerns: the active theme is
stored in the `site-theme` cookie and applied to `<html data-theme="…">`, while
Nuxt color mode continues to control the `.dark` class.

Components use Nuxt UI semantic utilities (`bg-default`, `text-highlighted`,
`text-toned`, `text-muted`, `text-dimmed`, `border-default`) instead of palette
classes. The `editorial` theme maps those roles to the palette below. New themes
must provide the same semantic variable contract in their own stylesheet; they
must not add theme-name conditionals to page components.

### Palette

| Token (light)        | Hex        | Token (dark)        | Hex        | Use                         |
| -------------------- | ---------- | ------------------- | ---------- | --------------------------- |
| `stone-50`           | `#fafaf9`  | `neutral-950`       | `#0a0a0a`  | Page background             |
| `white`              | `#ffffff`  | `neutral-900`       | `#171717`  | Elevated surface / card bg  |
| `stone-900`          | `#1c1917`  | `neutral-100`       | `#f5f5f5`  | Primary text                |
| `stone-600`          | `#57534e`  | `neutral-400`       | `#a3a3a3`  | Body / secondary text       |
| `stone-500`          | `#78716c`  | `neutral-500`       | `#737373`  | Meta / inactive nav         |
| `stone-400`          | `#a8a29e`  | `neutral-600`       | `#525252`  | Eyebrows, colophons         |
| `stone-300`          | `#d6d3d1`  | `neutral-700`       | `#404040`  | Separators, dots            |
| `stone-200/80`       | `#e7e5e4`  | `neutral-800`       | `#262626`  | Hairline borders            |
| `stone-100`          | `#f5f5f4`  | `neutral-900`       | `#171717`  | Skeletons                   |

### Rules

- **Always pair** light `stone-*` with dark `neutral-*` — never mix slate and
  stone in the same surface. The migration from slate is intentional; do not
  reintroduce it.
- **No accent colors** in body UI. The previous warning/primary gradients,
  radial glows, conic auroras, and `bg-clip-text` headlines are retired.
- **Borders** are always at `/80` opacity (light) or full (dark) to stay soft.
- **Dark mode** is the visual equal of light — both must be designed, never
  auto-inverted as an afterthought.

---

## 3. Typography

### Faces

| Role        | Family          | Tailwind var    | Loaded weights / styles          |
| ----------- | --------------- | --------------- | -------------------------------- |
| Display     | **Fraunces**    | `--font-serif`  | 400, 500, 600 + italic 400, 500  |
| Text / UI   | **Inter**       | `--font-sans`   | 400, 500, 600                    |
| Meta / code | **JetBrains Mono** | `--font-mono` | 400, 500                         |

Fonts load via Google Fonts in `app/app.vue` (with `preconnect`). The
`--font-serif` face uses optical sizing + soft-axis variation set in
`app/assets/css/main.css`.

### Scale

Use these presets rather than ad-hoc sizes. Headlines are serif; everything else
is sans unless explicitly mono.

| Element              | Classes                                                        |
| -------------------- | -------------------------------------------------------------- |
| Section headline (H1)| `font-serif text-4xl leading-[1.08] tracking-[-0.02em] sm:text-5xl lg:text-6xl` |
| Section title (H2)   | `font-serif text-2xl tracking-tight`                           |
| Card title (H3)      | `font-serif text-xl sm:text-2xl leading-snug tracking-tight`   |
| Body / lede          | `text-lg leading-relaxed text-stone-600 dark:text-neutral-400` |
| Body small           | `text-[15px] leading-relaxed text-stone-600 dark:text-neutral-400` |
| Eyebrow / meta       | `font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400 dark:text-neutral-500` |
| Colophon             | `font-mono text-xs uppercase tracking-[0.16em] text-stone-400 dark:text-neutral-600` |

### Italic

Italic is a *load-bearing* style, not decoration. Reserve it for the secondary
clause of a headline ("…things worth reading.") and for serif pull-quotes. Never
italicize sans-serif body text for emphasis — use weight or rephrase.

### Numerals

Dates, indices, and counts use `font-mono tabular-nums` so columns align. Format
dates `en-GB`: `02 Jun 2026` for lists, `02 June 2026` for article headers.

---

## 4. Layout

### The single surface

Every page is **one centered column**, `max-w-3xl` (articles, homepage) or
`max-w-5xl` (the blog grid). No multi-column bento, no side rails, no sticky
aside.

```html
<main class="bg-white dark:bg-neutral-950">
  <div class="mx-auto max-w-3xl px-6 sm:px-8">
    <!-- sections -->
  </div>
</main>
```

Horizontal padding is `px-6 sm:px-8` everywhere — never `lg:px-8` variant drift.

### Vertical rhythm

- Top of page: `pt-40 sm:pt-48` to clear the fixed header.
- Section separation: `border-t border-stone-200/80 dark:border-neutral-800`,
  not empty background bands.
- Section padding: `py-24 sm:py-32` for hero/closing, `py-16 sm:py-20` for body
  and "keep reading".
- Inline list rows: `py-8` with `divide-y` hairlines.

### The header

Full-width, transparent at top, transitions on scroll to a hairline bar with
backdrop blur. **No floating pill.** Logo shrinks (`scale-95`) rather than
jumping layout.

```
transparent  →  bg-white/80 backdrop-blur + border-b
```

### The footer

One column, aligned to the page grid. Wordmark, two links, a colophon line
("Set in Fraunces & Inter"). No CTAs, no gradients.

---

## 5. Component patterns

### Lists (the primary card substitute)

Posts are rendered as typographic rows, not cards. Pattern:

```
[number]   date · tag
           Serif title
           Lede (line-clamp-2)
           Read entry →
```

- Number: `font-mono text-xs text-stone-400`, `String(i).padStart(2,'0')`.
- Rows separated by `divide-y divide-stone-200/70 dark:divide-neutral-800`.
- Hover: title color shifts to `stone-500` / `neutral-400`; arrow translates
  `+1` on x. **No** card lift, shadow, border highlight, or scale.

### Media grid (blog index)

When imagery is required, use a 2-column grid (`sm:grid-cols-2`,
`gap-x-10 gap-y-12`). Each item:

- `aspect-[16/10]` media in a `rounded-md border border-stone-200/80` frame.
- Image hover: `scale-[1.03]` over `duration-700`. No overlay gradient.
- Number badge via `mix-blend-difference` so it reads on any image.
- Meta/title/lede below in the same type scale as list rows.

### Buttons / links

- **Primary action**: plain text link with an arrow that translates on hover.
  `font-medium text-stone-900 dark:text-neutral-100`.
- **Secondary**: underline-offset link in `text-stone-500`.
- **Reserve** `UButton` for genuine UI controls (nav, admin). Marketing CTAs are
  links, not pills. If a `UButton` is used, prefer `variant="ghost"`
  `color="neutral"` `rounded-full`.

### Badges / tags

Tags are `#tag` mono spans, not `UBadge` pills:
`font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500`.

### Code & blockquotes (prose)

- Inline code: `font-mono`, `bg-stone-100 dark:bg-neutral-900`, `rounded`,
  `px-1.5 py-0.5`.
- Code blocks: `rounded-md` with `border border-stone-200/80`.
- Blockquotes: **serif**, `text-xl`, `not-italic`, left border `stone-300`.
- Links: underline, `underline-offset-4`, `decoration-stone-300`.

### Media frames

All `<img>`, `<iframe>`, `<video>` get `rounded-md border border-stone-200/80
dark:border-neutral-800`. Radius is consistently small — no `[2rem]` cards.

---

## 6. Motion

Motion is rare and slow. Default to `duration-300`–`700` and
`ease-[cubic-bezier(0.4,0,0.2,1)]`. Allowed:

- Arrow translate on link hover (`group-hover:translate-x-1`).
- Image scale on card hover (`scale-[1.03]`, `duration-700`).
- Header background/border transition on scroll.
- Title color shift on hover.

**Forbidden**: infinite `pulse`/`spin` ambient animations, conic-gradient
auroras, `animate-ping` dots, hover lift (`-translate-y-*`) on cards, scale on
buttons (`hover:scale-105`). `motion-safe:` is not an excuse to add ambient
motion — don't add it.

---

## 7. States

### Loading (skeletons)

Skeletons are `bg-stone-100 dark:bg-neutral-900` rectangles with no shimmer.
Mirror the real layout's shape and proportions. Provide both a `ClientOnly`
internal skeleton and a `#fallback` template (SSR) that match.

### Empty

Centered, serif, italic, muted:
`font-serif text-2xl italic text-stone-400`. Followed by one `text-sm` sentence
in `text-stone-500`. Never an illustration.

### 404 / not found

Same pattern: mono `404` eyebrow, serif headline, one quiet link back.

### Error

Inline, `text-sm text-stone-500`, no red banners unless the action is
destructive (admin only).

---

## 8. Dark mode

- Every named theme defines both its light values and its
  `:root.dark[data-theme='…']` values. Review both modes before shipping.
- Components consume semantic utilities and do not add palette-specific
  `dark:` counterparts.
- The theme owns `--site-logo-filter`; components do not directly invert the
  logo. Skeletons use `bg-elevated`, and separators use `border-default` or
  `border-muted`.

---

## 9. Accessibility

- Headings use a real heading order; `font-serif` size presets do not replace
  semantic `<h1>`–`<h3>`.
- Links are underlined or appear on hover with an arrow — never color-only.
- `time` elements carry a `datetime` attribute.
- Images carry `alt`. Decorative media may use `alt=""`.
- Color contrast meets WCAG AA in both themes; `stone-400`/`neutral-600` is for
  non-essential meta only.

---

## 10. What not to do

- ❌ Gradient text, gradient backgrounds, radial/conic glows.
- ❌ `rounded-[2rem]` or `rounded-[2.5rem]` cards. Use `rounded-md`.
- ❌ Drop shadows on cards (`shadow-2xl`, `shadow-primary/10`).
- ❌ Bento grids, multi-column marketing sections on the homepage.
- ❌ Soft `UBadge` pills for tags — use mono `#tag`.
- ❌ Slate palette anywhere in the public site.
- ❌ Ambient animation. Motion exists to confirm a hover, not to fill space.
- ❌ "Over-engineered / overkill" wink copy. The voice is dry, not self-deprecating
  marketing.

---

## 11. File map

Where each decision lives:

| Concern        | File                                   |
| -------------- | -------------------------------------- |
| Fonts & faces  | `app/assets/css/main.css`, `app/app.vue` |
| Theme registry | `app/config/siteThemes.ts`, `app/composables/useSiteTheme.ts` |
| Color tokens   | `app/assets/css/themes/editorial.css` (`main.css` retains shared primitives) |
| App colors     | `app/app.config.ts` (`primary: indigo`, `neutral: zinc` — Nuxt UI primitives) |
| Header/footer  | `app/layouts/default.vue`, `app/components/AppFooter.vue` |
| Homepage       | `app/pages/index.vue`                  |
| Blog index     | `app/pages/blog/index.vue`            |
| Article        | `app/pages/blog/[slug].vue`           |
| Editor (admin) | `app/components/AppEditor.vue` — exempt from this system |

When adding a page or component, start from the closest existing file above and
copy its shell before writing new markup.
