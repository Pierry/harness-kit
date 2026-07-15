# Agents

O harness-kit vem com três agents. Cada um vive em `.claude/agents/<name>/` com seu próprio README,
sensors, evals, guides e skills, e está registrado em
[`AGENTS.md`](https://github.com/Pierry/harness-kit/blob/main/AGENTS.md). Os três também podem ser
invocados como sub-agents pela ferramenta Task.

## product-manager

Transforma um problema em um spec pronto para engenharia. Dois artefatos, dois skills:

- **`prd`**: Product Requirements Document, voltado ao negócio.
- **`prp`**: Product Requirements Prompt, o handoff para engenharia.

Entrada: `/product-manager:run` (PRD → PRP completo), ou `/product-manager:prd` / `:prp` isolados.
Passa pelas gates dos sensors e evals `prd-structure`/`prd-quality` e `prp-*`. Publica no Confluence
quando `JIRA_USERNAME` + `JIRA_API_TOKEN` estão definidos.

## staff-software-engineer

Transforma um PRP aprovado em um PR mergeado. Escolhe o **area skill** certo a partir dos arquivos do
repo:

- **`backend`**, **`web`**, **`mobile`**, **`devops`**: convenções de cada disciplina, sobrescritíveis
  por repo via `.claude/conventions/{area}.md`.
- **`designer`**: um skill transversal, aplicado quando você constrói uma UI nova: Material Design 3,
  tema dark/light, tipografia moderna, acabamento nível Behance, i18n (en, pt-BR, es), favicon
  sensível ao contexto. Entra por cima do area skill. Veja [Skill designer](Designer-Skill).

Entrada: `/sse:run` (plan → dev → test → pr → monitor), `/sse:run --local` (sem PR), ou os comandos de
stage único. A **variante SDD** `/sse:sdd` roda um loop guiado por spec (plana uma vez, dev↔test↔eval
até o PRP ser satisfeito, teto de 3 iterações, sem PR automático). Veja
[Pipeline e stages](Pipeline-and-Stages).

## system-architect

Transforma um sistema ou problema em um **System Design Doc** rigoroso e depois roda um **design
review** adversarial. Assim como o agent SSE escolhe um area skill, este agent escolhe um **topic
skill**: um por problema clássico de system design, tirado da série de podcasts System Design:

- **`design`**: fallback genérico para qualquer sistema.
- **`review`**: review adversarial, nível staff, de um design existente.
- **`url-shortener`** ([#1](URL-Shortener)), **`rate-limiter`** ([#2](Rate-Limiter)),
  **`search-engine`** ([#3](Search-Engine)): playbooks por tópico.

Entrada: `/system-design:run` (design → review), `/system-design:design`, `/system-design:review`.
Passa pelas gates dos sensors `design-structure`/`design-rigor` e dos evals
`design-quality`/`design-review-depth`. A teoria a fundo e as referências de cada tópico vivem nesta
wiki. Método: [Método de system design](System-Design-Method).

## O padrão que eles compartilham

Os três seguem o mesmo formato de harness: guides (feedforward), sensors + evals (feedback), um marker
de aprovação por artefato, contabilidade de tokens por fase, e um skill para o qual o orquestrador
despacha. Os agents product-manager e staff-software-engineer se encadeiam no
[golden path](Golden-Path) de seis stages; o agent system-architect é um stage opcional na frente
dele.

## v5: de monolitos para orquestrador + folhas

Hoje cada agent roda seus stages inline, e os sensors e evals rodam no mesmo contexto de quem escreveu
o artefato. A v5 decompõe isso em um **orquestrador** (a sessão principal, dona do estado e das gates)
que despacha para **subagents folha** pequenos, de propósito único: um coletor de `intake`, autores
por stage, avaliadores adversariais que nunca escreveram o artefato que corrigem, e painéis paralelos
de revisores. Os agents acima continuam sendo os donos conceituais dos seus stages; por dentro, cada
stage vira um conjunto de folhas que o orquestrador coordena. Veja
[Orquestração e subagents](Orchestration-and-Subagents) e [Autonomia](Autonomy).

## Roteamento

Quando você digita um slash command, o ponto de entrada não tem ambiguidade. Quando você descreve o
trabalho em linguagem natural, a sessão principal consulta a tabela de roteamento em
[`AGENTS.md`](https://github.com/Pierry/harness-kit/blob/main/AGENTS.md):

| Intenção | Rota |
|---|---|
| ideia → PR mergeado | `/golden-path` |
| rascunhar um spec | `product-manager` |
| entregar um PRP aprovado | `staff-software-engineer` |
| projetar um sistema em escala | `system-architect` |

## Adicionando um agent

1. Crie `.claude/agents/<name>.md` (ou `<name>/agent.md` com os assets junto).
2. Registre em `AGENTS.md`, na seção certa.
3. Adicione `.claude/commands/<name>.md` se ele for invocável por slash command.
4. Ligue os hooks de ciclo de vida em `.claude/runtime/hooks/<name>/` se ele precisar.

## Veja também

- [Pipeline e stages](Pipeline-and-Stages) · [Golden path](Golden-Path) · [Engenharia de harness](Harness-Engineering)
