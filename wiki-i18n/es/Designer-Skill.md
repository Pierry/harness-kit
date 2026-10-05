# Designer Skill

Un skill transversal de `staff-software-engineer`, que se aplica cuando el trabajo construye algo nuevo con UI: una app, una página, una feature o una landing. Se apila sobre el área skill `web` o `mobile`. `{repo}/.claude/conventions/web.md` tiene prioridad sobre él, y un repo que ya tiene un design system conserva ese sistema.

Archivo del skill: [`skills/designer/SKILL.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/staff-software-engineer/skills/designer/SKILL.md). `/sse:plan` y `/sse:dev` lo leen para trabajo de UI nueva. Cuando no está claro si aplica, `/sse:dev` marca `NOT FOUND - NEEDS REVIEW: designer-skill applicability` y sigue sin él.

# Por qué

Las UIs hechas por IA convergen en un mismo aspecto: todo centrado, azul por defecto, íconos con emoji, lorem ipsum, un solo tema, solo en inglés. El skill es un [guide](Guides) feedforward que sube la vara antes del primer componente.

# Material Design 3

M3 es obligatorio y se usa como sistema de tokens. El color sale de los roles de M3 (`primary`, `on-primary`, `*-container`, `surface`, `surface-container`, `on-surface-variant`, `outline`, `error`) derivados de una sola semilla elegida a partir del contexto del producto. El CSS de los componentes nunca lleva hex crudo.

La tipografía sigue display, headline, title, body y label, cada una en L, M y S, mapeadas a clases una sola vez. La forma va de none 0, xs 4, s 8, m 12, l 16, xl 28 a full; las cards usan `l`, los botones `full` o `m`, las sheets `xl`. La elevación tiene 6 niveles de tintes de `surface-container` más una sombra sutil. Las capas de estado son hover 8%, focus 10% y pressed 10% del color `on-*`. El movimiento usa el easing enfatizado `cubic-bezier(.2,0,0,1)`, 200 a 300ms el estándar y 100ms el chico.

Los inputs son text fields de M3, de 56px de alto con label flotante. Los encabezados de página tienen un eyebrow, un título display y un subtítulo.

# Oscuro y claro

Se entregan los dos temas. Primero va la preferencia del sistema, después un toggle del usuario que escribe `data-theme` y `localStorage`. El oscuro usa una superficie tintada `#1A1C1E`, nunca negro puro.

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { --surface:#FDFCFF; --on-surface:#1A1C1E; --primary:#0B57D0; }
:root[data-theme="dark"]  { --surface:#1A1C1E; --on-surface:#E3E2E6; --primary:#A8C7FA; }
```

# Tipografía

La UI carga una fuente variable de verdad, y el stack del sistema nunca es el aspecto final. El cuerpo elige una entre `Geist`, `Instrument Sans`, `General Sans`, `Manrope` e `Inter Tight`; Inter queda como fallback. Display elige una entre `Bricolage Grotesque`, `Clash Display`, `Sora`, `Fraunces` y `Space Grotesk` con peso de 600 a 800. Los datos usan `font-variant-numeric: tabular-nums`.

Las fuentes cargan con `font-display: swap`, embebidas como data URI `woff2` en base64 cuando la superficie corre offline o bajo una CSP estricta.

# Color, profundidad, movimiento

La paleta es vívida: una semilla saturada, un segundo acento y gradientes en el hero, en los botones primarios y en los números focales.

Las superficies llevan sombras tintadas en capas y brillo de acento. Las vistas animan la entrada, la interacción, los cambios de valor y el mostrar y ocultar en ambas direcciones, nunca un salto con `display:none`. El movimiento queda bajo `prefers-reduced-motion` y anima solo `transform` y `opacity`.

Los callouts y textos de ayuda usan un contenedor tonal (`secondary-container` o `surface-container-high`) con un radio real y un ícono `info`. Una barra de acento de color en el borde izquierdo está prohibida.

# Pulido nivel Behance

El agent busca trabajos actuales de Behance y Dribbble en el dominio del producto y dice qué tomó. Los layouts usan una grilla de 8pt, un punto focal por vista, textos realistas y estados vacío, de carga y de error diseñados. Una suma de partes recibe una visualización en CSS o SVG (barra apilada, donut, sparkline) en lugar de una lista de números.

# Íconos

Los emojis están prohibidos en todas partes. La marca y las acciones primarias son SVGs originales en una grilla de 24px con trazo de 2px; el resto sale de un solo set (Material Symbols, Lucide, Phosphor), nunca mezclados. Los íconos usan `currentColor` y llevan `aria-label` o `<title>`.

# Textos e i18n

El texto visible para el usuario no tiene rayas largas ni medias en ningún idioma. Cada string pasa por `t('key')` con claves semánticas como `cart.empty.title`. `locales/{en,pt-BR,es}.json` comparten un mismo conjunto de claves; la app detecta `navigator.language`, cae a `en` como respaldo, guarda la elección del usuario, define `<html lang>` y formatea con `Intl`.

# Favicon

El favicon es una marca SVG sacada del contexto del producto (un monograma, un carrito para comercio) en la semilla de la marca, legible a 16px. El set es `favicon.svg`, `favicon.ico` de 32, `apple-touch-icon.png` de 180 y `site.webmanifest` con PNGs maskable de 192 y 512. El agent dice qué símbolo y qué semilla eligió y por qué.

# Accesibilidad

El contraste es de al menos 4.5:1 para el texto del cuerpo y 3:1 para texto grande y UI (WCAG 2.2 AA) en los dos temas. Cada elemento interactivo tiene un anillo `:focus-visible` y un área táctil de 44x44px, y se alcanza con el teclado.

# Qué se entrega

Una UI nueva se entrega con tokens claros y oscuros, un toggle de tema, una fuente cargada, los tres archivos de idioma con selector de idioma, íconos originales, el set de favicon, profundidad y movimiento, y estados vacío, de carga y de error diseñados.

# Ver también

[Agents](Agents), [Guides](Guides), [Pipeline y stages](Pipeline-and-Stages).

# Referencias

Material Design 3, m3.material.io. WCAG 2.2. Inter, rsms.me/inter, y Roboto Flex en Google Fonts. `Intl` de ECMAScript. MDN sobre el Web App Manifest y los favicons.
