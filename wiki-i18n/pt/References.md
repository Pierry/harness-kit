# Referências

A literatura sobre a qual o harness-kit foi construído, e o que cada fonte de fato mudou aqui. Fontes que
só confirmaram o que já fazíamos não valem uma linha; estas são as que nos custaram um commit.

## O harness

**Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)**
(martinfowler.com). A fundação. Guides são **feedforward**, orientam o agent antes de ele agir. Sensors
são **feedback**, observam depois e permitem que ele se corrija sozinho. Ambos vêm em dois tipos de
execução: **computacional** (determinístico, roda em CPU, barato o bastante para toda mudança) e
**inferencial** (precisa do julgamento de um modelo). O pipeline inteiro tem esse formato, e o
`Execution: computational | inferential` em cada sensor é essa taxonomia levada ao pé da letra.

**Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html)**
(martinfowler.com). A continuação, e o artigo mais caro desta página.

Três achados caíram direto no código:

1. *"The agent reliably ignores sensor checks unless hardwired via hooks or extensions"* (o agent ignora
   de forma confiável as checagens de sensor, a menos que estejam ligadas na marra via hooks ou
   extensões), e guides em markdown, sozinhos, são **"quite unreliable"** (bastante pouco confiáveis).
   `code-conventions.md` era um arquivo markdown pedindo educadamente que o agent rodasse o linter. O
   [`code-maintainability`](Sensors) agora roda.
2. O alerta sobre *"a false sense of security and an illusion of quality"* (uma falsa sensação de
   segurança e uma ilusão de qualidade). Tínhamos construído exatamente isso: sensors se declarando
   gates duros e determinísticos enquanto não checavam nada, e um log de qualidade registrando `passed`
   em toda execução. Daí o exit 3 (`inferential`, nunca é um pass) e o exit 2 (um sensor computacional
   que não liga checagem nenhuma está quebrado, não passando).
3. Os limites que contêm complexidade, número máximo de argumentos de função, tamanho de arquivo, tamanho
   de função, complexidade ciclomática, *"weren't even active in ESLint's default preset, I had to
   configure maximums for them first"* (nem estavam ativos no preset default do ESLint, tive que
   configurar os máximos antes). Vale o mesmo para o ruff. Agora estão configurados no `pyproject.toml`, e
   o CI roda eles. Isso achou dívida real na hora.

O alerta dela sobre **sobrecarga de feedback**, *"sending it into a spiral of over-engineered
refactorings"* (jogando o agent numa espiral de refatorações sobre-engenheiradas), é o motivo de a única
violação de complexidade que encontramos ser um ignore nomeado por arquivo, com o motivo escrito, em vez
de uma refatoração de código sem teste só para satisfazer uma regra criada ontem.

**Fowler, [Agentic Programming](https://martinfowler.com/bliki/AgenticProgramming.html)**
(martinfowler.com). Dá nome à virada que o pipeline pressupõe: humanos param de digitar código e passam a
revisá-lo, *"still responsible for what the software does"* (ainda responsáveis pelo que o software faz),
mas via *"code review, examining test results, and reviewing outputs from other sensors"* (code review,
exame de resultados de teste e revisão de saídas de outros sensors). Harness engineering é a habilidade
central. É esse o
argumento para as duas gates humanas estarem onde estão.

## Evals e o judge

**Husain, [Using LLM-as-a-Judge for evaluation](https://hamel.dev/blog/posts/llm-judge/)** e
[Your AI product needs evals](https://hamel.dev/blog/posts/evals/). A crítica que acerta em cheio nossas
rubricas: escalas de 1 a 10 não calibradas são interpretadas de um jeito diferente por cada avaliador,
julgamentos binários são mais confiáveis, e o que realmente importa é a **concordância medida entre o
judge e rótulos humanos**. O harness-kit ainda não faz isso. Nosso threshold de 8.0 é uma convenção, não
uma fronteira calibrada, e o
[pipeline-pattern.md](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md)
diz isso em voz alta em vez de deixar implícito que a nota é uma medição.

**Panickssery et al., [Self-Preference Bias in LLM-as-a-Judge](https://arxiv.org/abs/2410.21819)**
(arXiv). Judges LLM preferem sistematicamente texto da própria família, acompanhando a perplexidade: dão
nota mais alta ao que lhes é familiar do que humanos dariam. Despachar um avaliador *novo*, o que fazemos,
remove o contexto do autor, mas não isso. Um Claude novo julgando prosa de Claude continua sendo
auto-preferência. Uma mitigação honesta seria outra família de modelo ou rótulos humanos; não temos nem
uma nem outra ainda, e a wiki não deveria fingir o contrário.

Esses dois juntos são o motivo de o `eval-score.py` existir. Ele não consegue tornar o julgamento
confiável, mas a aritmética nunca foi questão de julgamento: ele lê os pesos da rubrica e recalcula o
total, então, no mínimo, o número decorre das notas.

## Testando o próprio harness

A maior lição não precisa de citação. O harness-kit colocava gate em todo artefato que produzia e não
tinha nada colocando gate nele mesmo: sem testes, sem CI, sem linter. Foi assim que a divergência de uma
palavra num heading desativou cerca de 30 asserções de seção em três sensors e ninguém notou. O teste que
teria pego isso no dia zero tem quatro linhas, e hoje ele é genérico sobre todo sensor, inclusive os que
ainda não foram escritos.

O harness precisa de um harness.

## O cânone de engenharia (system-architect)

O [método de system design](System-Design-Method) bebe de Kleppmann (*Designing Data-Intensive
Applications*), dos números de latência do Jeff Dean, de Vogels sobre consistência eventual, de Helland
sobre dados por fora vs por dentro, de Nygard (*Release It!*) sobre padrões de estabilidade e de
Ousterhout (*A Philosophy of Software Design*) sobre complexidade. Isso alimenta a rubrica de design e as
dez perguntas de staff, não a mecânica do harness.

## Veja também

- [Engenharia de harness](Harness-Engineering): a teoria, a fundo
- [Sensors](Sensors) e [Evals](Evals): as duas metades do feedback, como foram implementadas
- [Pipelines dos agents](Agent-Pipelines): onde fica cada gate em cada agent
