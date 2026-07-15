# Wiki do harness-kit

A base de conhecimento do [harness-kit](https://github.com/Pierry/harness-kit): um conjunto de agents do
Claude Code que levam uma ideia crua até um PR merged por um único pipeline com gates, mais um agent
system-architect que transforma um problema em um System Design Doc rigoroso.

O repo guarda a forma condensada, voltada para o agent (guides, sensors e evals como markdown enxuto).
Esta wiki é a profundidade voltada para gente: a teoria por trás do harness, como cada controle funciona
e o material de estudo completo, com referências para cada system design.

## O harness

Como e por que o harness-kit é construído do jeito que é.

| Página | O que cobre |
|---|---|
| [Harness Engineering](Harness-Engineering) | `Agent = Model + Harness`, feedforward vs feedback, controles computacionais vs inferenciais, humanos on the loop (Böckeler/Fowler) |
| [Guides](Guides) | controles de feedforward: templates, exemplos, estilo de escrita, convenções |
| [Sensores](Sensors) | feedback determinístico: checagens de estrutura, o sensor runner, gates rígidas |
| [Evals](Evals) | feedback inferencial: rubricas de LLM-judge, threshold 8.0, retry, spec-satisfied |
| [Pipeline e stages](Pipeline-and-Stages) | os seis stages com gate, anatomia de um stage, markers, tokens, status bar, loop SDD |
| [Golden Path](Golden-Path) | a estrada pavimentada, as cinco propriedades, os desvios, pavimentação por disciplina |
| [Agents](Agents) | product-manager, staff-software-engineer, system-architect |
| [Designer Skill](Designer-Skill) | M3, tema dark/light, tipografia moderna, acabamento nível Behance, i18n, favicon para novas UIs |

**Comece por aqui:** [Harness Engineering](Harness-Engineering) explica o modelo mental inteiro; todo o
resto é uma visão detalhada de uma parte.

## v5: autonomia e subagents

O pipeline está saindo de *humanos in the loop* (responder uma pergunta antes de cada artefato) para
*humanos on the loop* (aprovar a direção em duas gates, tudo entre elas roda sozinho), conduzido por um
orquestrador que despacha subagents pequenos e de propósito único.

| Página | O que cobre |
|---|---|
| [Autonomia](Autonomy) | o stage `intake`, resolve-mark-proceed, autonomia com gates, feedforward acima de feedback |
| [Orquestração e subagents](Orchestration-and-Subagents) | orquestrador + subagents folha, a divisão adversarial writer/critic, tiering de modelo, restrições do Claude Code |

Estas páginas descrevem o modelo v5, hoje rodando em todos os stages. A forma canônica é
[`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md);
alguns refinamentos (tiering com Haiku, `repos.md` por org) ainda aparecem marcados como *(planned)* no
próprio texto.

## System design

O agent `system-architect` e seus playbooks por tópico. Cada episódio da série System Design vira um
skill mais uma página detalhada aqui: teoria, arquitetura de referência, trade-offs e citações.

| Página | Problema de design |
|---|---|
| [Método de system design](System-Design-Method) | o método de 13 stages, os três pilares, contas de guardanapo, o cânone |
| [URL Shortener](URL-Shortener) (#1) | lookup de chave read-heavy, geração de short-code, cache, abuso |
| [Rate Limiter](Rate-Limiter) (#2) | throttling distribuído, token bucket, fail-open, orçamentos multi-região |
| [Search Engine](Search-Engine) (#3) | web crawler, indexação, ranking, atendimento de queries em escala |

Novos episódios chegam como novos playbooks e novas páginas. Candidatos: API gateway, fila distribuída,
news feed, cache distribuído, sistema de notificações.

## Como as duas metades se conectam

Um System Design Doc é um stage opcional na frente do pipeline principal: um design forte alimenta um
PRP mais afiado e um plan mais aterrado. A mesma forma de harness, guides, sensors, evals e aprovação
com gate, roda nas duas metades.

## Referências globais

- Birgitta Böckeler, *Harness engineering for coding agent users* e *Maintainability sensors for coding
  agents*, martinfowler.com, 2026.
- Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017.
- Jeff Dean, *Designs, Lessons and Advice from Building Large Distributed Systems*, LADIS, 2009.
- Werner Vogels (design for failure), Pat Helland (imutabilidade, transações distribuídas), Michael
  Nygard (*Release It!*), John Ousterhout (*A Philosophy of Software Design*).
