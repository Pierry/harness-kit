# Agents

harness-kit trae tres agents, registrados en [`AGENTS.md`](https://github.com/Pierry/harness-kit/blob/main/AGENTS.md). Cada uno vive en `.claude/agents/<name>/` con su propio README, guides, sensors, evals y skills, y cada uno también se puede llamar como subagent desde la herramienta Task.

# product-manager

Escribe el PRD (orientado al negocio) y el PRP (el traspaso a ingeniería). Corre `/product-manager:run` para ambos, o `/product-manager:prd` y `/product-manager:prp` por separado. Los sensors `prd-structure`, `prd-acceptance-criteria`, `prp-structure`, `prp-context-quality` y `prp-links` controlan la estructura; los evals `prd-quality`, `prd-readiness`, `prp-quality` y `prp-context-readiness` controlan la calidad. Con `JIRA_USERNAME` y `JIRA_API_TOKEN` definidos, puede publicar en Confluence.

# staff-software-engineer

Lleva un PRP aprobado hasta un merged PR. Elige un area skill según los archivos del repo: `backend`, `web`, `mobile` o `devops`, cada uno sobrescribible por repo con `.claude/conventions/{area}.md`. El skill `designer` se suma encima cuando construyes una UI nueva; mira [Designer Skill](Designer-Skill).

Corre `/sse:run` para plan, dev, test, pr y monitor de merge, `/sse:run --local` para parar antes del PR, o cualquier stage por separado. `/sse:sdd` planifica una vez y luego repite dev, test y un eval spec-satisfied hasta cumplir el PRP, con un tope de 3 iteraciones y sin PR automático. Mira [Pipeline y stages](Pipeline-and-Stages).

# system-architect

Escribe un System Design Doc y luego corre una revisión adversarial de nivel staff que devuelve ship, revise o block. Elige un topic skill por problema clásico: `url-shortener` ([#1](URL-Shortener)), `rate-limiter` ([#2](Rate-Limiter)), `search-engine` ([#3](Search-Engine)), con `design` como fallback genérico y `review` para la pasada de revisión.

Corre `/system-design:run`, `/system-design:design` o `/system-design:review`. Lo controlan los sensors `design-structure`, `design-rigor` y `review-structure` y los evals `design-quality` y `design-review-depth`. El método está en [Método de system design](System-Design-Method).

# La forma compartida

Los tres usan guides como feedforward, sensors y evals como feedback, un marker de aprobación por artefacto y contabilidad de tokens por fase. product-manager y staff-software-engineer se encadenan en el [golden path](Golden-Path) de seis stages; system-architect es un stage previo opcional.

Cada stage corre como un orquestador más subagents hoja. La sesión principal es dueña del estado y de los gates, y despacha un recolector `intake`, autores por stage y evaluadores que nunca escribieron el artefacto que califican. El evaluador es un subagent nuevo de Claude o Jev, según `/hk:eval`; mira [Evals](Evals) y [Orquestación y subagents](Orchestration-and-Subagents).

# Ruteo

Un slash command elige su punto de entrada. Para pedidos en lenguaje natural, la sesión principal lee la tabla de ruteo de `AGENTS.md`:

| Intención | Ruta |
|---|---|
| idea a merged PR, sin intervención | `/pipeline:run "<idea>"` |
| idea a merged PR | `/golden-path` |
| recolectar contexto | `/intake:run` |
| redactar una spec | `product-manager` |
| entregar un PRP aprobado | `staff-software-engineer` |
| diseñar un sistema a escala | `system-architect` |

# Agregar un agent

Crea `.claude/agents/<name>.md`, o `<name>/agent.md` cuando agrupa assets, y regístralo en `AGENTS.md`. Agrega `.claude/commands/<name>.md` si recibe un slash command. Pon los hooks de ciclo de vida en `.claude/runtime/hooks/<name>/` y conéctalos en `.claude/settings.json`.

Mira también [Pipeline y stages](Pipeline-and-Stages), [Golden Path](Golden-Path), [Harness Engineering](Harness-Engineering).
