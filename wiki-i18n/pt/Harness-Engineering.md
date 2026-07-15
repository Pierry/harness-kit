# Engenharia de harness

A teoria em cima da qual o harness-kit foi construído. Leia esta página para entender *por que* o repo
tem o formato que tem: guides, sensors, evals, stages com gate.

## Agent = Model + Harness

O termo **harness** é a forma curta de dizer tudo o que existe em um agent de código, menos o modelo em si.

```
Agent = Model + Harness
```

O modelo gera. O harness é o andaime em volta dele: os prompts e guides que o direcionam antes de ele
agir, as ferramentas que ele pode chamar, as verificações que pegam os erros dele depois de ele agir,
as permissões, a memória, o contexto que ele enxerga. Normalmente você não consegue mudar o modelo.
Você consegue mudar o harness. **Harness engineering** é a prática de melhorar o harness para aumentar
a probabilidade de uma boa saída e deixar o agent se corrigir antes que um humano veja o resultado.

Fonte: Birgitta Böckeler, *Harness engineering for coding agent users*, na série *Exploring Gen AI* de
Martin Fowler, martinfowler.com (2026). O texto companheiro, *Maintainability sensors for coding
agents*, desenvolve a metade dos sensors.

## Feedforward e feedback

O harness tem dois tipos de controle, emprestados da teoria de controle.

- **Controles feedforward (guides)** antecipam o comportamento do agent e o direcionam *antes* de ele
  agir. Exemplos: um guia de estilo de escrita, um template, uma convenção de código, um exemplo de boa
  saída. No harness-kit, são os [`guides/`](Guides).
- **Controles de feedback (sensors e evals)** observam *depois* de o agent agir e ajudam ele a se
  corrigir. Exemplos: um linter, um test, uma checagem de estrutura, um review pontuado. No harness-kit,
  são os [`sensors/`](Sensors) e os [`evals/`](Evals).

O feedback é mais poderoso quando o sinal dele é **otimizado para consumo por LLM**: um sensor que não
diz apenas "falhou", mas diz "falta a seção X; adicione com estes campos", dá ao agent exatamente o que
ele precisa para se consertar no próximo turno.

## Controles computacionais e inferenciais

Cortando pelo outro eixo, os controles são:

- **Computacionais (determinísticos)**: linters, tests, checagens de schema, regras de estrutura. Mesma
  entrada, mesmo veredito, sempre. Baratos, rápidos, exatos, mas cegos para significado. Os **sensors**
  do harness-kit são computacionais.
- **Inferenciais (baseados em LLM)**: julgamento semântico: "este PRD está claro?", "este design nomeia
  os trade-offs dele?". Dão conta do significado que nenhuma regex alcança, mas são probabilísticos e
  precisam de calibração. Os **evals** do harness-kit são inferenciais.

Você precisa dos dois. Uma checagem de estrutura não consegue te dizer que o texto está vago; e não dá
para confiar em um juiz LLM para aplicar de forma determinística a regra "exatamente um heading H1". A
disciplina é empurrar para dentro de um sensor tudo o que *dá* para tornar determinístico, e reservar o
eval para o julgamento semântico de verdade.

## O que os controles regulam

Böckeler descreve três dimensões que um harness regula:

1. **Comportamento funcional**: ele faz a coisa certa? (tests, critérios de aceite)
2. **Maintainability**: está limpo, simples, dentro da convenção? (linters, estrutura, estilo)
3. **Architecture fitness**: encaixa no design e nas restrições pretendidas? (fitness functions,
   overrides de convenção)

As gates do harness-kit tocam as três: os sensors aplicam estrutura e convenções (maintainability,
architecture fitness), os evals pontuam clareza e rigor (intenção funcional), e os arquivos
`conventions/` de cada repo fixam o architecture fitness.

## Humano fora, dentro ou acima do loop

Três posturas de envolvimento humano, pela forma como o humano se relaciona com o trabalho do agent:

- **Humano fora do loop** (human outside the loop): totalmente autônomo, o agent entrega sem review.
  Raro, alto risco.
- **Humano dentro do loop** (human in the loop): o humano revisa cada saída individual. Seguro, mas não
  escala: sua velocidade de review limita o throughput do agent.
- **Humano acima do loop** (human on the loop): o humano mantém e melhora o *harness* (os guides,
  sensors, evals) em vez de inspecionar cada saída. O harness revisa as saídas; o humano revisa o
  harness.

"Humanos acima do loop" é a única postura que escala junto com o throughput do agent, e é a postura para
a qual o harness-kit foi desenhado. Você não aprova na mão o texto de cada artefato; você ajusta a
rubric uma vez e a rubric julga todos os artefatos. Quando o agent desvia, você conserta o guide, não a
saída.

## Como o harness-kit materializa isso

Todo stage de todo pipeline é um harness pequeno:

```
GUIDE     feedforward      how to write it          (guides/, templates/, examples/)
REF       context          what to pull in          (AGENTS.md, prior artifacts, conventions/)
SENSOR    deterministic    must-pass structure      (blocks approval, regex via sensor-runner.py)
EVAL      inferential      scored rubric            (LLM-judge, threshold 8.0, retry x3)
```

O artefato só avança quando o sensor passa e o eval supera 8.0. Nada avança por achismo. É a mesma
divisão, computacional + inferencial, feedforward + feedback, aplicada a PRDs, PRPs, plans, código,
tests, PRs e (no agent system-architect) System Design Docs.

O retorno de escrever o harness em **markdown puro** (guides, sensors e evals são todos markdown; só o
runner e os hooks são código) é que o harness fica legível e maleável. Você consegue ler exatamente o
que vai ser checado, e mudar isso, sem encostar no modelo.

## Veja também

- [Guides](Guides): os controles feedforward
- [Sensors](Sensors): feedback determinístico
- [Evals](Evals): feedback inferencial
- [Pipeline e stages](Pipeline-and-Stages): como um stage é montado
- [Golden path](Golden-Path): a estrada pavimentada por todos os stages

## Referências

- Birgitta Böckeler, *Harness engineering for coding agent users*, martinfowler.com, 2026.
- Birgitta Böckeler, *Maintainability sensors for coding agents*, martinfowler.com, 2026.
- Martin Fowler, *Exploring Gen AI* (série de ensaios).
