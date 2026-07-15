# Agents

harness-kit trae tres agents. Cada uno vive en `.claude/agents/<name>/` con su propio README, sensors,
evals, guides y skills, y está registrado en
[`AGENTS.md`](https://github.com/Pierry/harness-kit/blob/main/AGENTS.md). Los tres también se pueden
invocar como sub-agents desde la herramienta Task.

## product-manager

Convierte un problema en un spec listo para ingeniería. Dos artefactos, dos skills:

- **`prd`**: Product Requirements Document, orientado al negocio.
- **`prp`**: Product Requirements Prompt, el handoff a ingeniería.

Entrada: `/product-manager:run` (PRD → PRP completo), o `/product-manager:prd` / `:prp` por separado.
Pasa por las gates de los sensors y evals `prd-structure`/`prd-quality` y `prp-*`. Puede publicar en
Confluence cuando `JIRA_USERNAME` + `JIRA_API_TOKEN` están configurados.

## staff-software-engineer

Convierte un PRP aprobado en un PR mergeado. Elige el **area skill** correcto a partir de los archivos
del repo:

- **`backend`**, **`web`**, **`mobile`**, **`devops`**: convenciones de cada disciplina, se pueden
  sobrescribir por repo con `.claude/conventions/{area}.md`.
- **`designer`**: un skill transversal que se aplica al construir una UI nueva: Material Design 3, tema
  dark/light, tipografía moderna, acabado nivel Behance, i18n (en, pt-BR, es), favicon sensible al
  contexto. Se monta encima del area skill. Ver [Skill designer](Designer-Skill).

Entrada: `/sse:run` (plan → dev → test → pr → monitor), `/sse:run --local` (sin PR), o los comandos de
un solo stage. La **variante SDD** `/sse:sdd` corre un loop guiado por el spec (planea una vez,
dev↔test↔eval hasta satisfacer el PRP, tope de 3 iteraciones, sin PR automático). Ver
[Pipeline y stages](Pipeline-and-Stages).

## system-architect

Convierte un sistema o problema en un **System Design Doc** riguroso y después corre un **design
review** adversarial. Así como el agent SSE elige un area skill, este agent elige un **topic skill**:
uno por cada problema clásico de system design, sacado de la serie de podcasts System Design:

- **`design`**: fallback genérico para cualquier sistema.
- **`review`**: review adversarial, nivel staff, de un diseño existente.
- **`url-shortener`** ([#1](URL-Shortener)), **`rate-limiter`** ([#2](Rate-Limiter)),
  **`search-engine`** ([#3](Search-Engine)): playbooks por tema.

Entrada: `/system-design:run` (design → review), `/system-design:design`, `/system-design:review`. Pasa
por las gates de los sensors `design-structure`/`design-rigor` y los evals
`design-quality`/`design-review-depth`. La teoría a fondo y las referencias de cada tema viven en esta
wiki. Método: [Método de system design](System-Design-Method).

## El patrón que comparten

Los tres siguen la misma forma de harness: guides (feedforward), sensors + evals (feedback), un marker
de aprobación por artefacto, contabilidad de tokens por fase, y un skill al que el orquestador
despacha. Los agents product-manager y staff-software-engineer se encadenan en el
[golden path](Golden-Path) de seis stages; el agent system-architect es un stage opcional previo.

## v5: de monolitos a orquestador + hojas

Hoy cada agent corre sus stages inline, y los sensors y evals corren en el mismo contexto que el autor.
La v5 descompone esto en un **orquestador** (la sesión principal, dueña del estado y de las gates) que
despacha a **subagents hoja** pequeños y de propósito único: un recolector de `intake`, autores por
stage, evaluadores adversariales que nunca escribieron el artefacto que califican, y paneles paralelos
de revisores. Los agents de arriba siguen siendo los dueños conceptuales de sus stages; por dentro,
cada stage pasa a ser un conjunto de hojas que el orquestador coordina. Ver
[Orquestación y subagents](Orchestration-and-Subagents) y [Autonomía](Autonomy).

## Ruteo

Cuando escribes un slash command, el punto de entrada no tiene ambigüedad. Cuando describes el trabajo
en lenguaje natural, la sesión principal consulta la tabla de ruteo en
[`AGENTS.md`](https://github.com/Pierry/harness-kit/blob/main/AGENTS.md):

| Intención | Ruta |
|---|---|
| idea → PR mergeado | `/golden-path` |
| redactar un spec | `product-manager` |
| entregar un PRP aprobado | `staff-software-engineer` |
| diseñar un sistema a escala | `system-architect` |

## Agregar un agent

1. Crea `.claude/agents/<name>.md` (o `<name>/agent.md` con los assets incluidos).
2. Regístralo en `AGENTS.md`, en la sección correcta.
3. Agrega `.claude/commands/<name>.md` si es invocable por slash command.
4. Conecta los hooks de ciclo de vida en `.claude/runtime/hooks/<name>/` si los necesita.

## Ver también

- [Pipeline y stages](Pipeline-and-Stages) · [Golden path](Golden-Path) · [Ingeniería de harness](Harness-Engineering)
