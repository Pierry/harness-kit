# Designer Skill

Um skill transversal do agent `staff-software-engineer`, aplicado quando você constrói **algo novo**
com UI: um app, uma página, uma feature ou uma landing. Ele codifica os defaults visuais e de UX para
que uma interface criada do zero saia com cara de coisa pensada e moderna, não de template padrão. Ele
se acumula sobre o skill de área (web/mobile); as convenções por repo em `.claude/conventions/web.md`
continuam vencendo, e se o repo já tem um design system o agent usa esse.

Arquivo do skill:
[`skills/designer/SKILL.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/staff-software-engineer/skills/designer/SKILL.md).
Lido por `/sse:plan` e `/sse:dev` quando o trabalho inclui uma UI nova.

## Por que um skill de design

A maioria das UIs feitas por IA converge para o mesmo visual genérico: tudo centralizado, o azul padrão
do framework, gradiente em toda superfície, emoji como ícone, lorem ipsum, um tema só, só em inglês. O
designer skill é um guide de feedforward ([Guides](Guides)) que empurra o agent para uma régua mais alta
antes de ele escrever um único componente, do mesmo jeito que o guide de estilo de código molda o
código. Ele é opinativo de propósito.

## Material Design 3 como sistema

Use M3 como sistema de tokens, não como visual literal do Google. O ponto é estrutura: projetar com
papéis e escalas, nunca com valores chumbados.

- **Papéis de cor.** Defina `primary`, `on-primary`, `primary-container`, `secondary`, `tertiary`,
  `surface`, `surface-container` (do mais baixo ao mais alto), `on-surface`, `on-surface-variant`,
  `outline`, `error`. Derive tudo de uma única cor semente (M3 dynamic color), e escolha a semente pelo
  contexto do produto, não pelo roxo padrão.
- **Escala tipográfica.** display / headline / title / body / label, cada uma em L/M/S, mapeadas para
  classes CSS.
- **Escala de forma.** none 0, xs 4, s 8, m 12, l 16, xl 28, full. Cards `l`, botões `full` ou `m`.
- **Elevação tonal.** Seis níveis via camadas de tint de `surface-container` mais uma sombra sutil.
  Prefira o tint do container em vez de drop shadows pesadas.
- **State layers.** hover 8%, focus 10%, pressed 10% da cor `on-*` sobre o componente.
- **Movimento.** Easing enfático do M3 `cubic-bezier(.2,0,0,1)`, padrão 200-300ms, pequeno 100ms.

## Dark e light, os dois obrigatórios

Nunca entregue um tema só.

- Preferência do sistema primeiro (`prefers-color-scheme`), toggle do usuário depois, escolha
  persistida em `localStorage` e refletida em `:root[data-theme]`.
- Dois conjuntos de tokens, light e dark. O dark é tonal, não preto puro: uma surface na faixa de
  `#1A1C1E`, elevada com tints de container mais claros em vez de sombras.
- Verifique contraste nos dois temas (veja Acessibilidade).

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { --surface:#FDFCFF; --on-surface:#1A1C1E; --primary:#0B57D0; }
:root[data-theme="dark"]  { --surface:#1A1C1E; --on-surface:#E3E2E6; --primary:#A8C7FA; }
```

## Tipografia moderna

- Default `Inter` (variável) para UI e corpo de texto; alternativa nativa do M3, `Roboto Flex`.
  Self-host ou carregue com `font-display: swap`.
- Opcionalmente uma fonte de display só para hero/headline (`Space Grotesk`, `Sora`,
  `Plus Jakarta Sans`).
- Números tabulares para dados (`font-variant-numeric: tabular-nums`).
- Stack: `"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## Acabamento nível Behance

A régua de "novo e bom" é o topo do Behance UI. Na prática:

- **Grid de espaçamento de 8pt** (4/8/12/16/24/32/48/64). Whitespace generoso; deixe o layout respirar.
- **Hierarquia forte.** Um ponto focal claro por tela. Headline confiante, corpo calmo. Tamanho, peso e
  espaço carregam a hierarquia antes da cor.
- **Paleta contida.** Uma semente de marca, neutros, um acento. Cor precisa merecer atenção.
- **Componentes precisos.** Raio consistente, grids alinhados, alinhamento óptico, nenhum elemento
  órfão.
- **Conteúdo real.** Texto e dados realistas, nunca lorem. Estados de vazio, loading e erro são
  desenhados, não lembrados depois.
- **Micro-interações.** Feedback de hover, focus e press em todo elemento interativo. Sutil e rápido.
- **Ícones originais e modernos** (veja abaixo), nunca emoji.

## Iconografia: original, moderna, nunca emoji

- **Nunca use emojis.** Nem como ícone, nem em botões, labels, títulos, estados vazios ou texto. Emoji
  renderiza diferente em cada plataforma, quebra a consistência visual e passa impressão de coisa
  inacabada. Regra dura.
- **Crie ícones originais.** Desenhe um set SVG próprio para as ações-chave e marcas do produto, em um
  grid consistente (por exemplo 24px, traço de 2px, juntas arredondadas) com uma única linguagem visual.
  O logo/glifo de marca e as ações primárias devem ser originais, não de banco.
- **Estilo moderno.** Linha limpa ou duotone, opticamente equilibrado, legível em 16-20px, encaixado no
  pixel, com peso de traço casado com o peso da tipografia.
- Se um set próprio completo estiver fora de escopo, use **um** set aberto moderno como base (Lucide,
  Material Symbols, Phosphor) e ainda assim desenhe as marcas de brand e hero originais. Nunca misture
  famílias de ícone.
- Entregue como SVG inline ou sprite, dirigido por `currentColor` para os ícones seguirem o tema
  light/dark; dê a cada um um label acessível (`aria-label` ou `<title>`).

## Internacionalização (en, pt-BR, es)

Toda string voltada ao usuário é traduzível. Três locales saem juntos: inglês (default), português do
Brasil, espanhol.

- Nada de string chumbada; um lookup `t('key')` com chaves semânticas (`cart.empty.title`).
- `locales/{en,pt-BR,es}.json`, com conjuntos de chave idênticos nos três.
- Detecte `navigator.language`, caia para `en`; o usuário pode trocar, persista a escolha.
- Defina `<html lang>` dinamicamente; formate datas, números e moeda com `Intl` por locale; plurais
  pelas regras de plural da biblioteca de i18n.

## Favicon consciente do contexto

Gere um favicon que reflita o contexto do produto, não um placeholder.

- Escreva como **SVG** (nítido, tematizável), usando a semente da marca, ciente de light/dark.
- Derive a marca do contexto: a inicial/monograma do produto, ou um glifo que combine com o domínio (um
  carrinho para commerce, um gráfico para analytics). Legível em 16px.
- Entregue `favicon.svg` (primário), `favicon.ico` 32, `apple-touch-icon.png` 180 e um
  `site.webmanifest` com PNGs maskable de 192 e 512, mais meta `theme-color` por scheme.
- Diga qual símbolo e qual semente foram escolhidos e por quê (o elo com o contexto).

## Acessibilidade (inegociável)

- Contraste: texto de corpo >= 4.5:1, texto grande e UI >= 3:1 (WCAG 2.2 AA), nos **dois** temas.
- Anel `:focus-visible` visível em todo elemento interativo. Alvo de toque >= 44x44px.
- Respeite `prefers-reduced-motion`. HTML semântico, inputs com label, alcançável por teclado.

## O que o agent entrega com uma UI nova

1. Arquivo de tokens (papéis de cor, tipografia, forma) para light e dark.
2. Toggle de tema ligado à preferência do sistema e com persistência.
3. Fonte moderna carregada com `font-display: swap`.
4. `locales/{en,pt-BR,es}.json` mais a fiação do `t()` e um seletor de idioma.
5. Set de ícones SVG original e moderno (currentColor, labels acessíveis), sem emoji.
6. Conjunto de favicon consciente do contexto, manifest e link tags.
7. Estados de vazio, loading e erro desenhados.

## Proibido

Emojis em qualquer lugar (UI, ícones, botões, texto); ícones genéricos ou de banco para marca ou marcas
primárias; misturar famílias de ícone; cores chumbadas em vez de tokens; um tema só; strings voltadas ao
usuário chumbadas; favicon placeholder; lorem ipsum em UI entregue; contraste abaixo de AA em qualquer
um dos temas.

## Veja também

- [Agents](Agents) e [Guides](Guides)
- [Pipeline e stages](Pipeline-and-Stages), onde `/sse:plan` e `/sse:dev` leem este skill

## Referências

- Especificação do Material Design 3, m3.material.io (papéis de cor, escala tipográfica, elevação,
  movimento).
- WCAG 2.2, Web Content Accessibility Guidelines (contraste, foco, alvos).
- Tipografia Inter, rsms.me/inter; Roboto Flex (Google Fonts).
- `Intl` (ECMAScript Internationalization API) para formatação ciente de locale.
- Web App Manifest e boas práticas de favicon (MDN).
