# Autonomía

> **Estado: live (v5).** La stage `intake` y la disposición resolver-marcar-continuar están desplegadas
> en todas las stages (prd, prp, plan, dev, test, pr y system-design). La forma canónica vive en
> [`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md).
> Algunos refinamientos siguen *(planned)* y están marcados en el texto: model tiering a Haiku para
> chequeos baratos, y el llenado del `context-library/repos.md` de cada organización a partir de la
> plantilla que ya viene en el repo.

El diseño original de harness-kit se detiene y le pide inputs al humano antes de cada artefacto: el
agent de PRD pregunta squad, problema, clientes, hipótesis y link de la apuesta; el agent de PRP
pregunta las rutas del repo. Cada pregunta es un punto donde la corrida se detiene. El trabajo de
autonomía elimina las preguntas *triviales* sin eliminar las *decisiones reales*, para que un solo
comando lleve una idea de punta a punta y solo se detenga donde el humano realmente aporta criterio.

## Las preguntas son falta de contexto disfrazada

Un agent pregunta cuando no tiene contexto para avanzar. Hay dos maneras de eliminar la pregunta:

1. **Borrarla y dejar que el agent adivine.** Eso produce artefactos seguros de sí mismos y
   equivocados: un squad alucinado, una métrica inventada, un cliente verosímil pero falso. Peor que
   preguntar.
2. **Darle al agent una forma de encontrar la respuesta por su cuenta.** El repositorio, su historial y
   la context library ya contienen casi todo lo que las preguntas intentaban pescar. Léelos primero,
   pregunta solo lo que es genuinamente externo.

harness-kit toma el segundo camino. Es lo mismo que pasa cuando se suelta a un coding agent en un
repositorio bien estructurado, sin ninguna configuración a medida: lee el código, el README, los
commits recientes, e infiere la intención. El trabajo de autonomía vuelve ese paso de lectura
**explícito y obligatorio**, para que la inferencia ocurra antes de que surja cualquier pregunta.

En términos de harness engineering, esto es un cambio de **feedback** a **feedforward** (ver
[Ingeniería de harness](Harness-Engineering)). Preguntarle al humano a mitad de la corrida es feedback:
el agent produce un hueco y espera una corrección. Cosechar contexto al inicio es feedforward: al agent
se le entrega lo que necesita antes de empezar, y el hueco nunca se forma.

## La stage de intake

La autonomía se apoya en una nueva primera stage, `intake`, que corre antes de `prd`. Es un
[subagent](Orchestration-and-Subagents) cuyo único trabajo es reunir contexto y volcarlo en un solo
artefacto que lee el resto del pipeline.

```
intake  →  prd  →  prp  →  plan  →  dev  →  test  →  pr
  │
  └─ reads:  target repo (code, README, recent commits, open PRs/issues)
             context-library/ (business-info, squads/, metrics/, decisions/)
             git remotes and repo registry
  └─ emits:  .claude/runtime/outputs/intake/{feature_id}.md
             { squad, problem, customers[], hypothesis, repos[], metrics, unknowns[] }
```

Como es un subagent, intake corre en un contexto aislado. Su exploración pesada, potencialmente
cientos de archivos leídos, nunca contamina el contexto de las stages que siguen. Ellas reciben solo el
`intake.md` destilado, no la búsqueda cruda.

El artefacto de intake es la fuente única de las respuestas que el agent de PRD solía pedir. El agent
de PRD ya no interroga al humano; lee el `intake.md`.

## Resolver, marcar, continuar

Cada input que el pipeline necesita tiene una de tres disposiciones. Esto reemplaza el binario
*preguntar-o-bloquear*.

| Disposición | Cuándo | Qué pasa |
|---|---|---|
| **Resolver** | La respuesta está en el repo o en la context library | Intake escribe el valor en `intake.md`. Cero contacto humano. |
| **Marcar** | La respuesta es genuinamente imposible de deducir del contexto disponible (por ejemplo, un link de apuesta, la meta de un ejecutivo) | Intake escribe `NOT FOUND - NEEDS REVIEW: {detail}` y lo agrega a `unknowns[]`. La corrida **continúa.** |
| **Continuar** | Siempre | El pipeline nunca se bloquea por un input faltante a mitad de la corrida. Los desconocidos aparecen en la siguiente gate, no como interrupción. |

Los evals ya toleran una cantidad acotada de markers sin resolver (`prp-context-quality` solo bloquea
por encima de cinco markers `NEEDS REVIEW`/`TBD`). La autonomía se apoya en esa tolerancia que ya
existe: unos pocos desconocidos honestos son aceptables y visibles; no son razón para detenerse.

La regla en una línea: **resuelve desde el contexto, marca lo que no puedas, nunca te detengas a
preguntar.**

## Autonomía con gates: humanos supervisando el loop, no dentro de él

La autonomía total no es el objetivo. Generar sin supervisión y sin ningún checkpoint humano es
peligroso y caro de deshacer. El objetivo es mover al humano de **dentro del loop** (respondiendo un
input antes de cada artefacto) a **por encima del loop** (aprobando la dirección en los puntos donde
revisar es barato y equivocarse es caro), una distinción tomada de los textos de harness engineering de
Böckeler.

harness-kit pone gates humanas solo en fronteras de alto apalancamiento y baja reversibilidad:

```
intake → prd → [ GATE: approve direction ] → prp → plan →
dev → test → [ GATE: approve PR before it opens ] → pr
```

- **La gate del PRD** le cuesta al humano unos 30 segundos y evita una corrida entera de dev apuntada
  en la dirección equivocada. Es el checkpoint más valioso del pipeline.
- **La gate del PR** protege la única acción hacia afuera y difícil de retractar: abrir un pull
  request.

Todo lo que hay entre las gates corre sin interrupción. Dos decisiones, no una docena de preguntas.

Una flag `--yolo` elimina incluso esas gates para flujos confiables y de bajo riesgo, colapsando el
pipeline entero en un solo comando sin supervisión. La respeta el orquestador `/pipeline:run`.

## Qué sigue siendo determinístico

No toda pregunta eliminada necesita un LLM. Algunas son una consulta, y una consulta debería ser
código, no inferencia:

- **Rutas de repo.** Un registro en `context-library/repos.md` mapea `squad → repo paths`, así las
  stages de PRP y SSE resuelven los objetivos por lookup de tabla en vez de preguntar. Se distribuye
  como `repos-template.md`; cada organización llena el suyo *(planned por organización)*. Cuando el
  registro no tiene entrada, intake recurre a autodetectar desde el directorio de trabajo actual y los
  remotes de git.
- **feature_id.** Ya se computa de forma determinística como `{YYYY-MM-DD}-{squad}-{slug}`.

Mantener esto en código lo hace barato y confiable, y reserva los agents para las partes que realmente
requieren criterio.

## Cómo se enchufa al harness existente

La autonomía agrega una stage y cambia la disposición de los inputs. **No** reemplaza la maquinaria de
gating:

- Los sensors y los evals siguen disparando en cada stage. Un PRD producido de forma autónoma se mide
  contra las mismas barras de `prd-structure` y `prd-quality` que uno guiado a mano.
- Los markers, la contabilidad de tokens y `.pipeline-state.json` quedan iguales. Intake es solo otra
  stage que escribe un artefacto y cambia el estado por los mismos hooks.
- `/pipeline:continue` sigue retomando en la próxima stage pendiente, así que una corrida autónoma que
  falla a mitad de camino es tan retomable como cualquier otra.

El pipeline se vuelve más independiente sin volverse menos gobernado. Las gates que hacen confiable el
resultado siguen exactamente donde estaban.

## Ver también

- [Orquestación y subagents](Orchestration-and-Subagents): el subagent de intake y el orquestador dueño
  del estado
- [Pipeline y stages](Pipeline-and-Stages): dónde se ubica intake y cómo funcionan las gates
- [Ingeniería de harness](Harness-Engineering): feedforward versus feedback, humanos por encima del
  loop versus dentro de él
