# Guides (controles de feedforward)

Guides orientam o agent **antes** de ele agir. São a metade feedforward do harness: antecipar o que o
agent vai fazer e moldar isso lá na frente, para que ele acerte de primeira. No harness-kit, guides são
markdown puro no diretório `guides/` de cada agent.

## Por que feedforward importa

Feedback (sensors, evals) pega o erro depois que ele já aconteceu, e custa um retry. Feedforward evita o
erro. Um bom guide tira trabalho do loop caro de feedback e coloca numa instrução barata, dada logo de
início. Se um artefato falha sempre na mesma dimensão do eval, o conserto quase nunca é um eval mais
rígido, é um guide melhor.

## Tipos de guide no harness-kit

| Guide | Papel |
|---|---|
| `pipeline.md` | as regras de operação de um agent: stages, política de retry, markers de aprovação, contabilidade de tokens |
| `writing-style.md` | voz, palavras banidas, pontuação, quando usar tabela em vez de bullet, mermaid em vez de ASCII |
| `*-guidelines.md` | regras específicas por artefato (ex.: `prd-guidelines.md`, `prp-guidelines.md`) |
| `templates/*.md` | o esqueleto exato que o artefato precisa preencher |
| `examples/good-*.md` | um artefato de alta qualidade, já preenchido, que o agent imita |
| `design-method.md` (system-architect) | o método e o cânone com que o agent raciocina |
| `conventions-override.md` (SSE) | como as conventions de cada repo se sobrepõem aos defaults do agent |

## Templates e examples também são guides

Uma template é o controle de feedforward mais forte que existe: ela transforma a estrutura desejada no
caminho de menor resistência. O agent preenche um esqueleto em vez de inventar um formato. Junte a isso
um **bom exemplo**, um artefato concreto, preenchido, escrito no padrão, e o agent passa a ter o formato
e também a textura de um bom resultado. O harness-kit traz, por exemplo, `good-prd-example.md`,
`good-prp-example.md` e `good-system-design-example.md`.

> **Por que prosa natural em templates/examples e caveman no resto?** Guides internos, sensors e evals
> são escritos de forma telegráfica ("caveman") para economizar tokens de input. Mas templates e examples
> são prosa de *artefato* de referência, lida por stakeholders externos, então ficam em inglês natural.
> Eles ensinam ao agent como soa um bom resultado.

## Conventions: o feedforward que você sobrescreve por repo

O agent staff-software-engineer tem defaults embutidos por disciplina. Um repo consumidor sobrescreve
esses defaults colocando arquivos em `.claude/conventions/`:

```
{your-repo}/.claude/conventions/{backend,web,mobile,devops}.md
```

Quando o arquivo existe, o agent o lê por cima dos defaults e **o projeto vence**. É a "pavimentação por
disciplina" do [golden path](Golden-Path): uma pista afinada por disciplina, expressa como feedforward
que o time controla. É também um controle de **architecture fitness**, as conventions fixam o formato ao
qual o código precisa se encaixar.

## Voz e palavras banidas

`writing-style.md` é um controle de feedforward contra encheção de linguiça de IA. Ele bane as marcas
registradas (delve, leverage, utilize, robust, "in today's fast-paced world"), proíbe travessões, exige
mermaid em vez de ASCII e empurra especificidade (números reais, nomes reais, citações reais) no lugar de
prosa genérica. A dimensão de eval correspondente pontua a voz, então o guide e o eval se reforçam.

## Escrevendo um bom guide

- **Seja concreto.** "Comece pela decisão, depois o motivo" vale mais que "escreva com clareza".
- **Mostre, não só descreva.** Um par bom/ruim de duas linhas ensina mais rápido que um parágrafo de regras.
- **Deixe o caminho certo fácil.** Uma template que o agent preenche vale mais que dez regras em prosa.
- **Otimize a mensagem de falha para o próximo turno.** Se um sensor referencia o guide no feedback,
  escreva de um jeito que o agent consiga agir direto em cima dele.
- **Leve falhas repetidas para cima.** Quando a mesma dimensão do eval insiste em pontuar baixo, escreva
  ou afie o guide em vez de apertar a gate.

## Veja também

- [Engenharia de harness](Harness-Engineering): feedforward vs feedback
- [Sensors](Sensors) e [Evals](Evals): a metade de feedback cuja carga os guides aliviam
