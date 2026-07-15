# Designer Skill

Un skill transversal del agent `staff-software-engineer`, que se aplica al construir **algo nuevo** con
UI: una app, una página, una feature o una landing. Codifica los defaults visuales y de UX para que una
interfaz hecha desde cero salga con aspecto deliberado y moderno, no de plantilla por defecto. Se apila
sobre el skill de área (web/mobile); las convenciones por repo en `.claude/conventions/web.md` siguen
ganando, y si el repo ya tiene un design system el agent usa ese.

Archivo del skill:
[`skills/designer/SKILL.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/staff-software-engineer/skills/designer/SKILL.md).
Lo leen `/sse:plan` y `/sse:dev` cuando el trabajo incluye una UI nueva.

## Por qué un skill de diseño

La mayoría de las UIs hechas por IA converge al mismo look genérico: todo centrado, el azul por defecto
del framework, degradados en cada superficie, emoji como ícono, lorem ipsum, un solo tema, solo en
inglés. El designer skill es un guide de feedforward ([Guides](Guides)) que empuja al agent hacia una
vara más alta antes de que escriba un solo componente, igual que el guide de estilo de código moldea el
código. Es opinado a propósito.

## Material Design 3 como sistema

Usa M3 como sistema de tokens, no como el look literal de Google. El punto es la estructura: diseñar con
roles y escalas, nunca con valores hardcodeados.

- **Roles de color.** Define `primary`, `on-primary`, `primary-container`, `secondary`, `tertiary`,
  `surface`, `surface-container` (del más bajo al más alto), `on-surface`, `on-surface-variant`,
  `outline`, `error`. Derívalos todos de un único color semilla (M3 dynamic color), y elige la semilla
  según el contexto del producto, no el morado por defecto.
- **Escala tipográfica.** display / headline / title / body / label, cada una en L/M/S, mapeadas a
  clases CSS.
- **Escala de forma.** none 0, xs 4, s 8, m 12, l 16, xl 28, full. Cards `l`, botones `full` o `m`.
- **Elevación tonal.** Seis niveles con capas de tint de `surface-container` más una sombra sutil.
  Prefiere el tint del container antes que drop shadows pesadas.
- **State layers.** hover 8%, focus 10%, pressed 10% del color `on-*` sobre el componente.
- **Movimiento.** Easing enfático de M3 `cubic-bezier(.2,0,0,1)`, estándar 200-300ms, pequeño 100ms.

## Dark y light, ambos obligatorios

Nunca entregues un solo tema.

- Preferencia del sistema primero (`prefers-color-scheme`), toggle del usuario después, elección
  persistida en `localStorage` y reflejada en `:root[data-theme]`.
- Dos conjuntos de tokens, light y dark. El dark es tonal, no negro puro: una surface cercana a
  `#1A1C1E`, elevada con tints de container más claros en vez de sombras.
- Verifica el contraste en ambos temas (ver Accesibilidad).

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { --surface:#FDFCFF; --on-surface:#1A1C1E; --primary:#0B57D0; }
:root[data-theme="dark"]  { --surface:#1A1C1E; --on-surface:#E3E2E6; --primary:#A8C7FA; }
```

## Tipografía moderna

- Por defecto `Inter` (variable) para UI y cuerpo de texto; alternativa nativa de M3, `Roboto Flex`.
  Self-host o carga con `font-display: swap`.
- Opcionalmente una tipografía display solo para hero/headline (`Space Grotesk`, `Sora`,
  `Plus Jakarta Sans`).
- Números tabulares para datos (`font-variant-numeric: tabular-nums`).
- Stack: `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## Acabado nivel Behance

La vara de "nuevo y bueno" es el mejor trabajo de UI en Behance. En concreto:

- **Grilla de espaciado de 8pt** (4/8/12/16/24/32/48/64). Whitespace generoso; deja respirar al layout.
- **Jerarquía fuerte.** Un punto focal claro por vista. Headline con carácter, cuerpo tranquilo. Tamaño,
  peso y espacio cargan la jerarquía antes que el color.
- **Paleta contenida.** Una semilla de marca, neutros, un acento. El color se gana la atención.
- **Componentes precisos.** Radio consistente, grillas alineadas, alineación óptica, ningún elemento
  huérfano.
- **Contenido real.** Textos y datos realistas, nunca lorem. Los estados vacío, de carga y de error se
  diseñan, no se dejan para después.
- **Microinteracciones.** Feedback de hover, focus y press en cada elemento interactivo. Sutil y rápido.
- **Íconos originales y modernos** (ver abajo), nunca emoji.

## Iconografía: original, moderna, nunca emoji

- **Nunca uses emojis.** Ni como íconos, ni en botones, labels, títulos, estados vacíos o textos. Los
  emojis se renderizan distinto en cada plataforma, rompen la consistencia visual y se leen como algo
  sin terminar. Regla dura.
- **Crea íconos originales.** Diseña un set SVG propio para las acciones clave y las marcas del
  producto, sobre una grilla consistente (por ejemplo 24px, trazo de 2px, uniones redondeadas) con un
  solo lenguaje visual. El logo/glifo de marca y las acciones primarias deben ser originales, no de
  stock.
- **Estilo moderno.** Línea limpia o duotono, ópticamente equilibrado, legible a 16-20px, ajustado al
  pixel, con el peso del trazo emparejado al peso tipográfico.
- Si un set propio completo queda fuera de alcance, usa **un** set abierto moderno como base (Lucide,
  Material Symbols, Phosphor) y aun así dibuja originales las marcas de brand y hero. Nunca mezcles
  familias de íconos.
- Entrega como SVG inline o sprite, manejado con `currentColor` para que los íconos sigan el tema
  light/dark; dale a cada uno una etiqueta accesible (`aria-label` o `<title>`).

## Internacionalización (en, pt-BR, es)

Todo string visible para el usuario es traducible. Salen tres locales: inglés (default), portugués de
Brasil, español.

- Nada de strings hardcodeados; un lookup `t('key')` con claves semánticas (`cart.empty.title`).
- `locales/{en,pt-BR,es}.json`, con conjuntos de claves idénticos en los tres.
- Detecta `navigator.language`, con fallback a `en`; el usuario puede cambiarlo, persiste la elección.
- Define `<html lang>` de forma dinámica; formatea fechas, números y moneda con `Intl` por locale;
  plurales según las reglas de plural de la librería de i18n.

## Favicon consciente del contexto

Genera un favicon que refleje el contexto del producto, no un placeholder.

- Créalo como **SVG** (nítido, tematizable), usando la semilla de marca, consciente de light/dark.
- Deriva la marca del contexto: la inicial/monograma del producto, o un glifo acorde al dominio (un
  carrito para commerce, un gráfico para analytics). Legible a 16px.
- Entrega `favicon.svg` (primario), `favicon.ico` 32, `apple-touch-icon.png` 180 y un `site.webmanifest`
  con PNGs maskable de 192 y 512, más meta `theme-color` por scheme.
- Indica qué símbolo y qué semilla se eligieron y por qué (el vínculo con el contexto).

## Accesibilidad (no negociable)

- Contraste: texto de cuerpo >= 4.5:1, texto grande y UI >= 3:1 (WCAG 2.2 AA), en **ambos** temas.
- Anillo `:focus-visible` visible en cada elemento interactivo. Área de toque >= 44x44px.
- Respeta `prefers-reduced-motion`. HTML semántico, inputs etiquetados, alcanzable por teclado.

## Qué entrega el agent con una UI nueva

1. Archivo de tokens (roles de color, tipografía, forma) para light y dark.
2. Toggle de tema conectado a la preferencia del sistema y con persistencia.
3. Tipografía moderna cargada con `font-display: swap`.
4. `locales/{en,pt-BR,es}.json` más el cableado de `t()` y un selector de idioma.
5. Set de íconos SVG original y moderno (currentColor, etiquetas accesibles), sin emoji.
6. Set de favicon consciente del contexto, manifest y link tags.
7. Estados vacío, de carga y de error diseñados.

## Prohibido

Emojis en cualquier lado (UI, íconos, botones, textos); íconos de stock o genéricos para la marca o las
marcas primarias; mezclar familias de íconos; colores hardcodeados en vez de tokens; un solo tema;
strings de usuario hardcodeados; un favicon placeholder; lorem ipsum en UI entregada; contraste por
debajo de AA en cualquiera de los dos temas.

## Ver también

- [Agents](Agents) y [Guides](Guides)
- [Pipeline y stages](Pipeline-and-Stages), donde `/sse:plan` y `/sse:dev` leen este skill

## Referencias

- Especificación de Material Design 3, m3.material.io (roles de color, escala tipográfica, elevación,
  movimiento).
- WCAG 2.2, Web Content Accessibility Guidelines (contraste, foco, áreas de toque).
- Tipografía Inter, rsms.me/inter; Roboto Flex (Google Fonts).
- `Intl` (ECMAScript Internationalization API) para formateo consciente del locale.
- Web App Manifest y buenas prácticas de favicon (MDN).
