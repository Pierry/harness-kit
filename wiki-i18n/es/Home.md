# Wiki de harness-kit

[harness-kit](https://github.com/Pierry/harness-kit) es un conjunto de agents de Claude Code que llevan una idea hasta un merged PR por un único pipeline con gates, más un agent system-architect que escribe System Design Docs. El repo guarda los archivos escuetos orientados al agent. Esta wiki guarda la teoría y el material de estudio. Empieza por [Harness Engineering](Harness-Engineering).

# El harness

| Página | Qué cubre |
|---|---|
| [Harness Engineering](Harness-Engineering) | `Agent = Model + Harness`, feedforward y feedback, humanos on the loop |
| [Referencias](References) | las fuentes detrás de cada decisión de diseño |
| [Guides](Guides) | templates, ejemplos, estilo de escritura, convenciones |
| [Sensores](Sensors) | chequeos deterministas de estructura y gates duros |
| [Evals](Evals) | rubrics de checks atómicos, judge `local` o `jev`, aprobación en 8.0 |
| [Pipeline y stages](Pipeline-and-Stages) | los seis stages, markers, tokens, herramientas de contexto, loop SDD |
| [Graph Engineering](Graph-Engineering) | ids de requisito, manifiesto de trazabilidad, gate de alcance, grafo FalkorDB |
| [Golden Path](Golden-Path) | `/golden-path`, sus cinco propiedades, desvíos |
| [Agents](Agents) | product-manager, staff-software-engineer, system-architect |
| [Pipelines de los agents](Agent-Pipelines) | el flujo de stages de cada agent |
| [Designer Skill](Designer-Skill) | M3, tema oscuro y claro, i18n, favicon para nuevas UIs |

# Autonomía y subagents

Apruebas la dirección en dos gates y todo lo que hay en medio corre solo. Un stage `intake` recolecta el contexto primero, y un orquestador despacha subagents de propósito único.

| Página | Qué cubre |
|---|---|
| [Autonomía](Autonomy) | `intake`, resolve-mark-proceed, `/pipeline:run` |
| [Orquestación y subagents](Orchestration-and-Subagents) | orquestador y hojas, división entre writer y critic, tiering de modelo |

La forma canónica está en [`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md). El tiering con Haiku y el `repos.md` por organización siguen *(planeados)*.

# System design

El agent `system-architect` corre un playbook por episodio de la serie System Design. Un design doc es un stage previo opcional antes del pipeline principal: alimenta un PRP y un plan más precisos.

| Página | Problema de diseño |
|---|---|
| [Método de system design](System-Design-Method) | el método de 13 etapas, tres pilares, números de back-of-envelope |
| [URL Shortener](URL-Shortener) (#1) | lookup con mucha lectura, generación de códigos cortos, caché, abuso |
| [Rate Limiter](Rate-Limiter) (#2) | token bucket, fail-open, presupuestos multirregión |
| [Search Engine](Search-Engine) (#3) | crawler, indexación, ranking, servicio de consultas |

Los próximos candidatos son API gateway, cola distribuida, news feed, caché distribuida y sistema de notificaciones.

# Referencias globales

Birgitta Böckeler, *Harness engineering for coding agent users* y *Maintainability sensors for coding agents*, martinfowler.com, 2026. Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017. Jeff Dean, *Designs, Lessons and Advice from Building Large Distributed Systems*, LADIS, 2009. Werner Vogels sobre diseñar para la falla, Pat Helland sobre inmutabilidad, *Release It!* de Michael Nygard, *A Philosophy of Software Design* de John Ousterhout. La investigación sobre evals está en [Referencias](References).
