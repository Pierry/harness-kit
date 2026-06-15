---
name: designer
description: Visual + UX design defaults for new UIs. Material Design 3, dark/light theme, modern type, Behance-grade polish, i18n (en, pt-BR, es), context-aware favicon. Apply when building something new. Project conventions in .claude/conventions/web.md override these defaults.
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
  gratuitous animation.

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

## Behance-grade polish (the "new and good" bar)

Inspiration: top Behance UI work. What that means concretely:

- **Generous whitespace.** 8pt spacing grid (4/8/12/16/24/32/48/64). Let layouts breathe.
- **Strong hierarchy.** One clear focal point per view. Big confident headline, calm body.
- **Restrained palette.** 1 brand seed + neutrals + 1 accent. Color earns attention, not decorates.
- **Intentional contrast.** Size, weight, and space carry hierarchy before color does.
- **Crisp components.** Consistent radius, aligned grids, optical alignment, no orphaned elements.
- **Real content.** Design with realistic copy and data, never lorem. Empty/loading/error states
  designed, not afterthoughts.
- **Micro-interactions.** Hover, focus, press feedback on every interactive element. Subtle, fast.
- **Imagery/iconography** consistent set (one icon family, e.g. Material Symbols or Lucide).

Avoid generic AI-template look: centered everything, default Bootstrap blues, gradient-on-everything,
emoji as icons.

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
5. Context-aware favicon set + manifest + tags.
6. Designed empty / loading / error states.

## Forbidden

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
