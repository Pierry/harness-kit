---
name: designer
description: Visual + UX design defaults for new UIs. Material Design 3, dark/light theme, modern type, Behance-grade polish, i18n (en, pt-BR, es), context-aware favicon. No emojis and no em-dashes; use MD3/modern icons instead. Apply when building something new. Project conventions in .claude/conventions/web.md override these defaults.
user_invocable: false
---

Designer conventions. Apply when SSE builds something **new** with a UI (new app, page, feature,
landing). Layers on top of the area skill (web/mobile), does not replace it. Project override:
`{repo}/.claude/conventions/web.md` wins. Match existing design system if repo already has one; only
green-field gets these defaults.

## Design language: Material Design 3

Use M3 as the system, not the look. Token-driven, not hardcoded.

- **Color**: define color **roles**, not raw hex. Roles: `primary`, `on-primary`,
  `primary-container`, `on-primary-container`, `secondary`, `tertiary`, `surface`,
  `surface-container` (lowest..highest), `on-surface`, `on-surface-variant`, `outline`, `error`,
  `on-error`. Derive from a single seed color (dynamic color). Pick the seed from product context, not
  default purple.
- **Typography scale**: display / headline / title / body / label, each L/M/S. Map to CSS classes.
- **Shape scale**: none 0, xs 4, s 8, m 12, l 16, xl 28, full. Cards `l`, buttons `full` or `m`,
  sheets `xl`.
- **Elevation**: 6 levels via layered `surface-container` tints + subtle shadow. Prefer tonal
  elevation (container tint) over heavy shadows.
- **State layers**: hover 8%, focus 10%, pressed 10% of `on-*` over the component.
- **Motion**: M3 easing `emphasized` (cubic-bezier(.2,0,0,1)), standard 200-300ms, small 100ms. No
  gratuitous animation. Motion is required, not optional:
  - Every interactive element gets an M3 **state layer** (hover 8%, focus 10%, pressed 10% of the
    `on-*` role over the component), not just a color swap.
  - Every show/hide, expand/collapse, or reveal **animates** both directions. Animate height with the
    `grid-template-rows: 0fr -> 1fr` technique (or `max-height`) plus opacity and a small translate;
    never toggle `display:none` with no transition.
  - Content entrance: stagger cards/sections in with a short rise-and-fade on load.
  - Animate meaningful value changes: count-up on headline numbers/totals, a subtle pulse when a key
    result updates. Build the result DOM once and update in place so values can tween.
  - Always wrap motion in `@media (prefers-reduced-motion: reduce)` to disable it.

## Theme: dark + light

Mandatory both. System preference first, user toggle second, choice persisted.

```css
:root { color-scheme: light dark; }
/* tokens as CSS custom properties, two sets */
:root[data-theme="light"] { --surface:#FDFCFF; --on-surface:#1A1C1E; --primary:#0B57D0; /* ... */ }
:root[data-theme="dark"]  { --surface:#1A1C1E; --on-surface:#E3E2E6; --primary:#A8C7FA; /* ... */ }
```

- Default to `prefers-color-scheme`; toggle writes `data-theme` + `localStorage`.
- Never ship one theme. Verify both for contrast (see Accessibility).
- Dark is not pure black: use `#1A1C1E`-ish surface, elevate with lighter container tints.

## Type: modern font

- **Default**: `Inter` (variable) for UI + body. M3-native alternative: `Roboto Flex`. Pick one,
  self-host or use a CDN with `font-display: swap`.
- Optional **display** face for hero/headline only (e.g. `Space Grotesk`, `Sora`, `Plus Jakarta
  Sans`). One display + one text face max.
- Stack: `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Tabular numbers for data (`font-variant-numeric: tabular-nums`).
- **Never use em-dashes (`—`) or en-dashes (`–`)** in any user-facing copy, headings, labels, empty
  states, microcopy, or content strings. Hard rule. Use a comma, colon, parentheses, or rewrite the
  sentence. Same rule in code comments, commit messages, PR text, and docs. Applies to all three
  locales. Hyphen (`-`) is fine for compound words.

## Behance-grade polish (the "new and good" bar)

Inspiration: top Behance UI work. **Actually research it, do not just invoke the name.** Before
designing a new surface, run a real web search for current Behance/Dribbble work in the product's
domain (e.g. "Behance fintech investment calculator dark UI"), look at several results, and extract
concrete directives (accent treatment, card and result styling, data-viz patterns, spacing, motion).
Note in the build what you took from it. Behance gallery pages are JS-rendered, so screenshots may
not be machine-readable; rely on the search result summaries and the patterns they describe, and
state the sources.

A recurring, high-value pattern from fintech/finance results UIs: **visualize the breakdown, do not
just list numbers.** For any result that is a sum of parts (gross = principal + yield + taxes,
budget = categories, score = components), add a lightweight visual (a stacked composition bar, a
donut, or a sparkline) with a value legend, animated on update. Pure CSS/SVG, no chart lib, to keep
load fast. A bare list of figures is the unfinished version.

What top Behance work means concretely:

- **Generous whitespace.** 8pt spacing grid (4/8/12/16/24/32/48/64). Let layouts breathe.
- **Strong hierarchy.** One clear focal point per view. Big confident headline, calm body.
- **Restrained palette.** 1 brand seed + neutrals + 1 accent. Color earns attention, not decorates.
- **Intentional contrast.** Size, weight, and space carry hierarchy before color does.
- **Crisp components.** Consistent radius, aligned grids, optical alignment, no orphaned elements.
- **Real content.** Design with realistic copy and data, never lorem. Empty/loading/error states
  designed, not afterthoughts.
- **Micro-interactions.** Hover, focus, press feedback on every interactive element. Subtle, fast.

Avoid generic AI-template look: centered everything, default Bootstrap blues, gradient-on-everything.

## Info, help, and supporting surfaces

For any callout, help text, tooltip body, inline explanation, hint, banner, or "supporting"
surface:

- **Never use a colored left-border accent bar** (`border-left: 3px solid ...`) to mark it. That
  reads as a generic CMS blockquote or a Bootstrap alert, not MD3. Hard rule.
- Use an **MD3 tonal container**: `secondary-container` / `on-secondary-container` (or
  `surface-container-high` / `on-surface-variant` for a quieter look), with a real shape radius
  (`shape-m` or `shape-l`), full padding, and an MD3 **info icon** (Material Symbols `info`) leading
  the text. Theme the icon and text with the container's `on-*` role.
- Color the surface, not its edge. Tonal fill carries the meaning; a stripe on one side does not.
- For inline reveals (the "?" expander pattern), animate open and closed (see Motion). A reveal that
  snaps via `display:none` is incomplete.

```css
/* Good: MD3 tonal supporting surface */
.help-panel__body {
  display: grid; grid-template-columns: auto 1fr; gap: 12px;
  padding: 12px 16px; border-radius: var(--shape-m);
  background: var(--secondary-container); color: var(--on-secondary-container);
}
/* Bad: never do this */
.callout { border-left: 3px solid var(--primary); background: var(--surface-container); }
```

## Form inputs are real MD3 text fields

An input is not a bare bordered box with a label floating above it in plain text. Use the MD3 text
field anatomy:

- **Outlined or filled** container (pick one and keep it consistent), 56px tall, proper shape radius.
- **Floating label** that sits as the resting placeholder, then animates up onto the outline (or to
  the top of a filled field) on focus or when filled. Label turns `primary` on focus.
- **Supporting text** under the field for the hint/example (do not abuse the placeholder for hints).
- **Leading/trailing affixes and icons** live inside the field (currency prefix, unit suffix, an
  info or clear trailing icon button), not floating outside it.
- Focus state thickens the outline to `primary` (a 2px look via inset box-shadow is fine).

Skip this only if the repo already standardizes a different field component, in which case match it.

## Page headers and hero structure

A page header is not a wordmark thrown at the top. Build it on the M3 type scale with real hierarchy:

- **Eyebrow** (optional): an M3 `label` (uppercase, tracked, `primary` color) that frames the context.
- **Title**: M3 `display` or `headline`, tight letter-spacing, the single focal point of the view.
- **Subtitle**: M3 `body`/supporting text in `on-surface-variant`, max ~48ch.
- Put the brand mark and utility controls (theme toggle, etc.) in a top bar above the title, not
  inline with it. Give the header generous top space and let it breathe.
- A restrained tonal background wash (one or two soft radial tints from the seed) is allowed; avoid
  gradient-on-everything.

Map the type scale to classes once (`.t-display`, `.t-headline`, `.t-title`, `.t-label`) and reuse
them; do not hand-size headings per page.

## Iconography: original, modern, never emoji

- **Never use emojis.** Not as icons, not in buttons, labels, headings, empty states, or copy. Emojis
  are not a design system: they render differently per platform, break visual consistency, and read as
  unfinished. This is a hard rule. **Use Material Design 3 (Material Symbols) icons, or another modern
  open set (Lucide, Phosphor), in place of any emoji.** Need a glyph -> reach for an MD3/modern icon,
  never an emoji.
- **Create original icons.** Design a custom SVG icon set for the product's key actions and brand
  marks, drawn on a consistent grid (e.g. 24px, 2px stroke, rounded joins) with one visual language
  (stroke weight, corner radius, terminals). The logo/brand glyph and the primary actions should be
  original, not stock.
- **Modern style.** Clean line or duotone icons, optically balanced, legible at 16-20px. Pixel-snap
  and align to the grid. Match stroke weight to the type weight.
- If a full custom set is out of scope, use **one** modern open set as the base (Lucide, Material
  Symbols, Phosphor) and still draw the brand and hero marks original. Never mix icon families.
- Ship icons as inline SVG or a sprite, currentColor-driven so they theme with light/dark. Give each
  an accessible label (`aria-label` or `<title>`).

## i18n: en, pt-BR, es

All user-facing copy translatable. Three locales shipped: `en` (default), `pt-BR`, `es`.

- No hardcoded strings in components. Use a `t('key')` lookup.
- Files: `locales/{en,pt-BR,es}.json`, same key set in all three.
- Detect: `navigator.language` -> fallback `en`. User can switch; persist to `localStorage`.
- Set `<html lang="...">` dynamically. Format dates/numbers/currency with `Intl` per locale.
- Keep keys semantic (`cart.empty.title`), not English text as key.

```json
// locales/pt-BR.json
{ "cart.empty.title": "Seu carrinho está vazio", "action.continue": "Continuar" }
```

Plurals via the i18n lib's plural rules. RTL not required for these three.

## Favicon: context-aware

Generate a favicon that reflects the **product context** (its name, initial, domain symbol, brand
seed color), not a placeholder.

- Author as **SVG** (crisp, themeable). Use the brand seed; respect dark/light via
  `@media (prefers-color-scheme: dark)` inside the SVG or a separate dark file.
- Derive the mark from context: product initial/monogram, or a simple glyph matching the domain
  (e.g. a cart for commerce, a chart for analytics). Keep it legible at 16px.
- Ship sizes: `favicon.svg` (primary), `favicon.ico` 32, `apple-touch-icon.png` 180, plus a
  `site.webmanifest` with 192 + 512 maskable PNGs.
- Tags:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#FDFCFF">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1A1C1E">
```

State which symbol + seed you chose and why (the context link).

## Accessibility (non-negotiable)

- Contrast: body text >= 4.5:1, large text/UI >= 3:1, in **both** themes.
- Visible focus ring on every interactive element (`:focus-visible`).
- Hit target >= 44x44px. Respect `prefers-reduced-motion`.
- Semantic HTML + ARIA where needed. Label every input. Keyboard reachable.

## Before building

- If the repo already has a design system or theme, **use it**. Read 3 existing screens first.
- Confirm the framework's styling approach (CSS vars, Tailwind, SCSS, CSS-in-JS) and match it.
- Confirm whether an i18n lib already exists; reuse it.

## Deliver with a new UI

1. Token file (color roles + type + shape) for light **and** dark.
2. Theme toggle wired to system preference + persistence.
3. Modern font loaded with `font-display: swap`.
4. `locales/{en,pt-BR,es}.json` + `t()` wiring + lang switch.
5. Original, modern SVG icon set (currentColor, accessible labels). No emoji.
6. Context-aware favicon set + manifest + tags.
7. Designed empty / loading / error states.

## Forbidden

- Emojis anywhere (UI, icons, buttons, copy, empty states). Use MD3/modern icons instead.
- Em-dashes (`—`) or en-dashes (`–`) anywhere (copy, headings, comments, commits, PRs, docs).
- Stock/generic icons for brand or primary marks; mixing icon families.
- Colored left-border accent bars (`border-left`) for info, help, callouts, or supporting surfaces.
  Use an MD3 tonal container (see Info, help, and supporting surfaces).
- Reveals or expanders that toggle `display:none` with no animation.
- Page headers that are a bare wordmark with no eyebrow/title/subtitle hierarchy.
- Hardcoded colors instead of tokens/roles.
- A single theme (light-only or dark-only).
- Hardcoded user-facing strings.
- Placeholder favicon (default framework icon).
- lorem ipsum in shipped UI.
- Contrast below AA in either theme.

## Mark gaps

```
<!-- TBD - verify with design/tech lead: {seed color source, brand assets, locale copy owner} -->
```
