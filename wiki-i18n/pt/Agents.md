# Agents

O harness-kit traz três agents, registrados em [`AGENTS.md`](https://github.com/Pierry/harness-kit/blob/main/AGENTS.md). Cada um mora em `.claude/agents/<name>/` com seu próprio README, guides, sensors, evals e skills, e cada um também pode ser chamado como subagent pela Task tool.

# product-manager

Escreve o PRD (voltado para o negócio) e o PRP (a passagem para engenharia). Rode `/product-manager:run` para os dois, ou `/product-manager:prd` e `/product-manager:prp` sozinhos. Os sensors `prd-structure`, `prd-acceptance-criteria`, `prp-structure`, `prp-context-quality` e `prp-links` fazem o gate de estrutura; os evals `prd-quality`, `prd-readiness`, `prp-quality` e `prp-context-readiness` fazem o gate de qualidade. Com `JIRA_USERNAME` e `JIRA_API_TOKEN` definidos, ele pode publicar no Confluence.

# staff-software-engineer

Leva um PRP aprovado até um merged PR. Ele escolhe uma area skill pelos arquivos do repo: `backend`, `web`, `mobile` ou `devops`, cada uma sobrescrevível por repo com `.claude/conventions/{area}.md`. A skill `designer` entra por cima quando você constrói uma UI nova; veja [Designer Skill](Designer-Skill).

Rode `/sse:run` para plan, dev, test, pr e monitor de merge, `/sse:run --local` para parar antes do PR, ou qualquer stage sozinho. `/sse:sdd` planeja uma vez e depois repete dev, test e um eval spec-satisfied até o PRP ser atendido, com limite de 3 iterações e sem PR automático. Veja [Pipeline e stages](Pipeline-and-Stages).

# system-architect

Escreve um System Design Doc e depois roda uma review adversarial de nível staff que devolve ship, revise ou block. Ele escolhe uma topic skill por problema clássico: `url-shortener` ([#1](URL-Shortener)), `rate-limiter` ([#2](Rate-Limiter)), `search-engine` ([#3](Search-Engine)), com `design` como fallback genérico e `review` para a passada de review.

Rode `/system-design:run`, `/system-design:design` ou `/system-design:review`. Os sensors `design-structure`, `design-rigor` e `review-structure` e os evals `design-quality` e `design-review-depth` fazem o gate. O método está em [Método de system design](System-Design-Method).

# A forma comum

Os três usam guides como feedforward, sensors e evals como feedback, um approval marker por artefato e contagem de tokens por fase. product-manager e staff-software-engineer se encadeiam no [golden path](Golden-Path) de seis stages; system-architect é um stage opcional na frente.

Cada stage roda como um orquestrador mais subagents folha. A sessão principal é dona do estado e dos gates e despacha um coletor `intake`, autores por stage e avaliadores que nunca escreveram o artefato que avaliam. O avaliador é um subagent Claude novo ou o Jev, conforme `/hk:eval`; veja [Evals](Evals) e [Orquestração e subagents](Orchestration-and-Subagents).

# Roteamento

Um slash command escolhe seu ponto de entrada. Para pedidos em linguagem comum, a sessão principal lê a tabela de roteamento em `AGENTS.md`:

| Intenção | Rota |
|---|---|
| ideia até merged PR, sem intervenção | `/pipeline:run "<idea>"` |
| ideia até merged PR | `/golden-path` |
| coletar contexto | `/intake:run` |
| rascunhar uma spec | `product-manager` |
| entregar um PRP aprovado | `staff-software-engineer` |
| projetar um sistema em escala | `system-architect` |

# Adicionando um agent

Crie `.claude/agents/<name>.md`, ou `<name>/agent.md` quando ele traz assets, e registre em `AGENTS.md`. Adicione `.claude/commands/<name>.md` se ele usar um slash command. Coloque os hooks de ciclo de vida em `.claude/runtime/hooks/<name>/` e ligue-os em `.claude/settings.json`.

Veja também [Pipeline e stages](Pipeline-and-Stages), [Golden Path](Golden-Path), [Harness Engineering](Harness-Engineering).
