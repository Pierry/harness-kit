# Wiki de harness-kit

La base de conocimiento de [harness-kit](https://github.com/Pierry/harness-kit): un conjunto de agents de
Claude Code que llevan una idea cruda hasta un PR merged por un único pipeline con gates, más un agent
system-architect que convierte un problema en un System Design Doc riguroso.

El repo guarda la forma condensada, orientada al agent (guides, sensors y evals como markdown escueto).
Esta wiki es la profundidad orientada a personas: la teoría detrás del harness, cómo funciona cada
control y el material de estudio completo, con referencias para cada system design.

## El harness

Cómo y por qué harness-kit está construido de la manera en que está.

| Página | Qué cubre |
|---|---|
| [Harness Engineering](Harness-Engineering) | `Agent = Model + Harness`, feedforward vs feedback, controles computacionales vs inferenciales, humanos on the loop (Böckeler/Fowler) |
| [Guides](Guides) | controles de feedforward: templates, ejemplos, estilo de escritura, convenciones |
| [Sensores](Sensors) | feedback determinista: chequeos de estructura, el sensor runner, gates duras |
| [Evals](Evals) | feedback inferencial: rúbricas de LLM-judge, threshold 8.0, retry, spec-satisfied |
| [Pipeline y stages](Pipeline-and-Stages) | los seis stages con gate, anatomía de un stage, markers, tokens, status bar, loop SDD |
| [Golden Path](Golden-Path) | el camino pavimentado, las cinco propiedades, los desvíos, pavimentado por disciplina |
| [Agents](Agents) | product-manager, staff-software-engineer, system-architect |
| [Designer Skill](Designer-Skill) | M3, tema dark/light, tipografía moderna, acabado nivel Behance, i18n, favicon para nuevas UIs |

**Empieza acá:** [Harness Engineering](Harness-Engineering) explica el modelo mental completo; todo lo
demás es una vista detallada de una parte.

## v5: autonomía y subagents

El pipeline está pasando de *humanos in the loop* (responder una pregunta antes de cada artefacto) a
*humanos on the loop* (aprobar la dirección en dos gates, todo lo que hay en medio corre solo),
conducido por un orquestador que despacha subagents chicos y de propósito único.

| Página | Qué cubre |
|---|---|
| [Autonomía](Autonomy) | el stage `intake`, resolve-mark-proceed, autonomía con gates, feedforward por encima de feedback |
| [Orquestación y subagents](Orchestration-and-Subagents) | orquestador + subagents hoja, la división adversarial writer/critic, tiering de modelo, restricciones de Claude Code |

Estas páginas describen el modelo v5, hoy en marcha en todos los stages. La forma canónica es
[`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md);
un par de refinamientos (tiering con Haiku, `repos.md` por org) siguen marcados como *(planned)* en el
propio texto.

## System design

El agent `system-architect` y sus playbooks por tema. Cada episodio de la serie System Design se
convierte en un skill más una página detallada acá: teoría, arquitectura de referencia, trade-offs y
citas.

| Página | Problema de diseño |
|---|---|
| [Método de system design](System-Design-Method) | el método de 13 stages, los tres pilares, cuentas de servilleta, el canon |
| [URL Shortener](URL-Shortener) (#1) | lookup de clave read-heavy, generación de short-code, cache, abuso |
| [Rate Limiter](Rate-Limiter) (#2) | throttling distribuido, token bucket, fail-open, presupuestos multi-región |
| [Search Engine](Search-Engine) (#3) | web crawler, indexación, ranking, atención de queries a escala |

Los episodios nuevos llegan como playbooks nuevos y páginas nuevas. Candidatos: API gateway, cola
distribuida, news feed, cache distribuido, sistema de notificaciones.

## Cómo se conectan las dos mitades

Un System Design Doc es un stage opcional al frente del pipeline principal: un diseño fuerte alimenta un
PRP más filoso y un plan más aterrizado. La misma forma de harness, guides, sensors, evals y aprobación
con gate, corre en las dos mitades.

## Referencias globales

- Birgitta Böckeler, *Harness engineering for coding agent users* y *Maintainability sensors for coding
  agents*, martinfowler.com, 2026.
- Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017.
- Jeff Dean, *Designs, Lessons and Advice from Building Large Distributed Systems*, LADIS, 2009.
- Werner Vogels (design for failure), Pat Helland (inmutabilidad, transacciones distribuidas), Michael
  Nygard (*Release It!*), John Ousterhout (*A Philosophy of Software Design*).
