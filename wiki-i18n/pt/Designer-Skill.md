# Designer Skill

Um skill transversal do `staff-software-engineer`, aplicado quando o trabalho constrói algo novo com UI: um app, uma página, uma feature ou uma landing. Ele se soma ao skill de área `web` ou `mobile`. O `{repo}/.claude/conventions/web.md` vence sobre ele, e um repo que já tem design system mantém esse sistema.

Arquivo do skill: [`skills/designer/SKILL.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/staff-software-engineer/skills/designer/SKILL.md). O `/sse:plan` e o `/sse:dev` leem esse arquivo em trabalho de UI nova. Quando não está claro se ele se aplica, o `/sse:dev` marca `NOT FOUND - NEEDS REVIEW: designer-skill applicability` e segue sem ele.

# Por quê

UIs feitas por IA convergem para um mesmo visual: tudo centralizado, azul padrão, ícones de emoji, lorem ipsum, um tema só, só em inglês. O skill é um [guide](Guides) de feedforward que sobe a régua antes do primeiro componente.

# Material Design 3

O M3 é obrigatório e usado como sistema de tokens. A cor vem dos papéis do M3 (`primary`, `on-primary`, `*-container`, `surface`, `surface-container`, `on-surface-variant`, `outline`, `error`), derivados de uma única semente escolhida a partir do contexto do produto. O CSS dos componentes nunca tem hex cru.

A tipografia segue display, headline, title, body e label, cada um em L, M e S, mapeados para classes uma vez. A forma é none 0, xs 4, s 8, m 12, l 16, xl 28, full; cards usam `l`, botões `full` ou `m`, sheets `xl`. A elevação tem 6 níveis de tons de `surface-container` mais uma sombra sutil. As camadas de estado são hover 8%, focus 10% e pressed 10% da cor `on-*`. O movimento usa a curva enfatizada `cubic-bezier(.2,0,0,1)`, 200 a 300ms no padrão e 100ms nos pequenos.

Os inputs são text fields do M3, com 56px de altura e label flutuante. Os cabeçalhos de página têm um eyebrow, um título display e um subtítulo.

# Escuro e claro

Os dois temas vão juntos. A preferência do sistema vem primeiro, depois um toggle do usuário que grava `data-theme` e `localStorage`. O escuro usa uma superfície tingida `#1A1C1E`, nunca preto puro.

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { --surface:#FDFCFF; --on-surface:#1A1C1E; --primary:#0B57D0; }
:root[data-theme="dark"]  { --surface:#1A1C1E; --on-surface:#E3E2E6; --primary:#A8C7FA; }
```

# Tipografia

A UI carrega uma fonte variável de verdade, e a pilha do sistema nunca é o visual final. O corpo usa uma entre `Geist`, `Instrument Sans`, `General Sans`, `Manrope` e `Inter Tight`; a Inter é fallback. O display usa uma entre `Bricolage Grotesque`, `Clash Display`, `Sora`, `Fraunces` e `Space Grotesk`, com peso de 600 a 800. Dados usam `font-variant-numeric: tabular-nums`.

As fontes carregam com `font-display: swap`, embutidas como data URI `woff2` em base64 quando a superfície roda offline ou sob uma CSP restrita.

# Cor, profundidade, movimento

A paleta é viva: uma semente saturada, um segundo acento e gradientes no hero, nos botões primários e nos números de destaque.

As superfícies ganham sombras em camadas e tingidas, e brilho de acento. As views animam entrada, interação, mudança de valor, e o mostrar e esconder nos dois sentidos, nunca um corte seco de `display:none`. O movimento fica sob `prefers-reduced-motion` e anima só `transform` e `opacity`.

Callouts e textos de ajuda usam um container tonal (`secondary-container` ou `surface-container-high`) com raio de verdade e um ícone `info`. Uma barra de acento colorida na borda esquerda é proibida.

# Acabamento nível Behance

O agent pesquisa trabalhos atuais no Behance e no Dribbble do domínio do produto e diz o que aproveitou. Os layouts usam grid de 8pt, um ponto focal por view, texto realista e estados de vazio, carregamento e erro desenhados. Uma soma de partes ganha um visual em CSS ou SVG (barra empilhada, donut, sparkline) em vez de uma lista de números.

# Ícones

Emojis são proibidos em todo lugar. A marca e as ações primárias são SVGs originais num grid de 24px com traço de 2px; o resto vem de um único conjunto (Material Symbols, Lucide, Phosphor), nunca misturado. Os ícones usam `currentColor` e levam `aria-label` ou `<title>`.

# Texto e i18n

O texto voltado ao usuário não tem travessão nem meia-risca em nenhum idioma. Toda string passa por `t('key')` com chaves semânticas como `cart.empty.title`. Os arquivos `locales/{en,pt-BR,es}.json` compartilham um mesmo conjunto de chaves; o app detecta `navigator.language`, cai para `en`, persiste a escolha do usuário, define `<html lang>` e formata com `Intl`.

# Favicon

O favicon é uma marca em SVG tirada do contexto do produto (um monograma, um carrinho para comércio) na cor semente da marca, legível em 16px. O conjunto é `favicon.svg`, `favicon.ico` 32, `apple-touch-icon.png` 180 e `site.webmanifest` com PNGs maskable de 192 e 512. O agent diz qual símbolo e qual semente escolheu, e por quê.

# Acessibilidade

O contraste é de pelo menos 4.5:1 para texto de corpo e 3:1 para texto grande e UI (WCAG 2.2 AA), nos dois temas. Todo elemento interativo tem um anel de `:focus-visible` e uma área de toque de 44x44px, e é alcançável pelo teclado.

# O que vai junto

Uma UI nova sai com tokens claro e escuro, um toggle de tema, uma fonte carregada, os três arquivos de locale com seletor de idioma, ícones originais, o conjunto de favicon, profundidade e movimento, e estados de vazio, carregamento e erro desenhados.

# Veja também

[Agents](Agents), [Guides](Guides), [Pipeline e stages](Pipeline-and-Stages).

# Referências

Material Design 3, m3.material.io. WCAG 2.2. Inter, rsms.me/inter, e Roboto Flex no Google Fonts. ECMAScript `Intl`. MDN sobre o Web App Manifest e favicons.
