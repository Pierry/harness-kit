# Wiki do harness-kit

O [harness-kit](https://github.com/Pierry/harness-kit) é um conjunto de agents do Claude Code que levam uma ideia até um merged PR por um único pipeline com gates, mais um agent system-architect que escreve System Design Docs. O repo guarda os arquivos enxutos voltados para o agent. Esta wiki guarda a teoria e o material de estudo. Comece por [Harness Engineering](Harness-Engineering).

# O harness

| Página | O que cobre |
|---|---|
| [Harness Engineering](Harness-Engineering) | `Agent = Model + Harness`, feedforward e feedback, humanos on the loop |
| [Referências](References) | as fontes por trás de cada escolha de design |
| [Guides](Guides) | templates, exemplos, estilo de escrita, convenções |
| [Sensores](Sensors) | checagens determinísticas de estrutura e gates rígidos |
| [Evals](Evals) | rubrics de checks atômicos, judge `local` ou `jev`, aprovação em 8.0 |
| [Pipeline e stages](Pipeline-and-Stages) | os seis stages, markers, tokens, ferramentas de contexto, loop SDD |
| [Graph Engineering](Graph-Engineering) | ids de requisito, manifesto de rastreabilidade, gate de escopo, grafo FalkorDB |
| [Golden Path](Golden-Path) | `/golden-path`, suas cinco propriedades, desvios |
| [Agents](Agents) | product-manager, staff-software-engineer, system-architect |
| [Pipelines dos agents](Agent-Pipelines) | o fluxo de stages de cada agent |
| [Designer Skill](Designer-Skill) | M3, tema dark e light, i18n, favicon para novas UIs |

# Autonomia e subagents

Você aprova a direção em dois gates e tudo entre eles roda sozinho. Um stage `intake` coleta o contexto primeiro, e um orquestrador despacha subagents de propósito único.

| Página | O que cobre |
|---|---|
| [Autonomia](Autonomy) | `intake`, resolve-mark-proceed, `/pipeline:run` |
| [Orquestração e subagents](Orchestration-and-Subagents) | orquestrador e folhas, divisão entre writer e critic, tiering de modelo |

A forma canônica está em [`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md). O tiering com Haiku e o `repos.md` por organização ainda estão *(planejados)*.

# System design

O agent `system-architect` roda um playbook por episódio da série System Design. Um design doc é um stage opcional na frente do pipeline principal: ele alimenta um PRP e um plan mais precisos.

| Página | Problema de design |
|---|---|
| [Método de system design](System-Design-Method) | o método de 13 stages, três pilares, números de back-of-envelope |
| [URL Shortener](URL-Shortener) (#1) | lookup com muita leitura, geração de código curto, cache, abuso |
| [Rate Limiter](Rate-Limiter) (#2) | token bucket, fail-open, orçamentos multi-região |
| [Search Engine](Search-Engine) (#3) | crawler, indexação, ranking, serving de consultas |

Os próximos candidatos são API gateway, fila distribuída, news feed, cache distribuído e sistema de notificações.

# Referências gerais

Birgitta Böckeler, *Harness engineering for coding agent users* e *Maintainability sensors for coding agents*, martinfowler.com, 2026. Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017. Jeff Dean, *Designs, Lessons and Advice from Building Large Distributed Systems*, LADIS, 2009. Werner Vogels sobre design para falha, Pat Helland sobre imutabilidade, *Release It!* de Michael Nygard, *A Philosophy of Software Design* de John Ousterhout. A pesquisa sobre evals está em [Referências](References).
