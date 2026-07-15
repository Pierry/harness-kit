# Pipeline y stages

harness-kit lleva una feature a través de seis stages con gate:

```
prd → prp → plan → dev → test → pr
```

> **v5 (en vivo):** un nuevo stage [`intake`](Autonomy) corre antes de `prd`. Recolecta contexto del repo y
> de la context library para que el pipeline corra sin detenerse a pedir inputs, y ahora cada stage sigue
> el patrón [orchestrator-plus-leaf-subagents](Orchestration-and-Subagents): inputs via
> resolve-mark-proceed, evals despachados a un evaluador nuevo. Los seis stages con gate de abajo siguen
> iguales; el intake va delante de ellos y la maquinaria de gating no cambia.

Los dos primeros pertenecen al agent **product-manager**, los últimos cuatro al agent
**staff-software-engineer**. Cada stage es un pequeño [harness](Harness-Engineering): un guide le dice al
agent cómo escribir, las references le dan contexto, un [sensor](Sensors) impone estructura, un
[eval](Evals) puntúa la calidad, y un marker de aprobación habilita el stage siguiente.

## Anatomía de cada stage

```
GUIDE     how to write it          pipeline.md · coding-style.md · templates/
REF       context to pull in       AGENTS.md · prp/<feature>.md · conventions/{area}.md
SENSOR    must-pass structure      deterministic, blocks approval
EVAL      scored rubric            LLM-judge, threshold 8.0, retry x3
```

El flujo dentro de un stage:

1. El agent lee los guides y las references y escribe el artefacto en
   `.claude/runtime/outputs/{pm,sse}/{stage}/{feature_id}.md`.
2. Al guardar, los **sensors** determinísticos se disparan. Una falla bloquea y devuelve feedback; el
   agent corrige solo las partes que fallaron.
3. El **eval** puntúa el artefacto de 0 a 10. Debajo de 8.0 reintenta (hasta 3 veces), regenerando solo
   las dimensiones con puntaje bajo.
4. Al pasar, el agent agrega un **marker de aprobación** `<!-- approved: {date} score={n} -->`.
5. Se registra el **gasto de tokens** de la fase y se anexa un comentario inline `<!-- tokens: ... -->`.

El marker de aprobación es la gate: el stage siguiente lo busca antes de arrancar.

## Los stages

| Stage | Agent | Artefacto | Gates (sensors · evals) |
|---|---|---|---|
| `prd` | product-manager | Product Requirements Document | `prd-structure`, `prd-acceptance-criteria` · `prd-quality`, `prd-readiness` |
| `prp` | product-manager | Product Requirements Prompt (handoff a eng) | `prp-structure`, `prp-context-quality`, `prp-links`, `link-validator` · `prp-quality`, `prp-context-readiness` |
| `plan` | staff-software-engineer | plan técnico | `plan-structure` · `plan-quality` |
| `dev` | staff-software-engineer | código + commits | `code-conventions`, `test-coverage`, `dev-structure` · `dev-quality` |
| `test` | staff-software-engineer | reporte de la corrida de tests | `test-structure` · `test-quality` |
| `pr` | staff-software-engineer | pull request | `pr-structure` · `pr-quality` · arma el `pr-monitor` |

System design (el agent **system-architect**) es un *stage opcional delante de `prp`/`plan`*: un
[System Design Doc](Home) sólido alimenta un PRP más afilado y un plan bien fundado. No forma parte del
pipeline por defecto de seis stages.

## Markers de aprobación y contabilidad de tokens

- **Marker de aprobación**: `<!-- approved: YYYY-MM-DD score=N -->` (el PRP además lleva
  `ready-for-handoff: true`). Su presencia es lo que permite que empiece el stage siguiente.
- **Tokens**: los hooks encierran cada fase con markers de inicio y fin, luego `token-phase.py` suma el
  uso a partir del transcript de Claude y escribe
  `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`. Todos los stages de una misma feature
  escriben en el **mismo** archivo reusando el `feature_id`, así que el costo de todo el ciclo de vida
  queda en un solo lugar. La contabilidad de tokens nunca bloquea un stage; si el transcript no se puede
  leer, registra el error y sale limpio.

## Barra de estado

Un indicador en vivo sigue a la feature activa a través de todos los stages:

```
idle · /product-manager:run · /sse:run · /pipeline:continue
billing-fix [prd+prp+plan+dev+test+pr] · prp approved · plan drafting · next /sse:plan · sensor: plan-structure
billing-fix · complete (prd/prp/plan/dev/test/pr)
```

El estado persiste en `.claude/.pipeline-state.json`. Al cerrar la sesión y volver a abrirla,
`/pipeline:continue` retoma en el siguiente stage pendiente. Cuando el PR se mergea, el monitor limpia el
estado automáticamente.

## Comandos de un solo stage y desvíos

Cada stage es también su propio comando, así que se puede correr solo la parte que hace falta:

```
/product-manager:prd | :prp
/sse:plan | :dev | :test | :pr
/sse:run --local        plan → dev → test, no PR
/pipeline:continue      resume next pending stage
/pipeline:reset         abandon the active run
```

Los mismos sensors, los mismos evals, los mismos artefactos. Se pierde la comodidad de un solo comando, no
el gating.

## La variante SDD (loop guiado por spec)

`/sse:sdd` reemplaza el `dev → test` de un solo tiro por un loop con objetivo:

```
prd → prp → plan → [dev ↔ test ↔ spec-satisfied eval]  →  [user gate]  →  pr
                         ↑ loop, cap 3 iterations          stops local
```

- Un sensor de pre-vuelo `prp-has-acceptance-criteria` bloquea si el PRP no es testeable.
- El predicado del loop se arma con `Success criteria (verifiable)` + `Validation gates` del PRP.
- El eval `spec-satisfied` de cada iteración corre en una **sesión nueva** (sin contexto del worker) y
  devuelve PASS/FAIL, no un puntaje. FAIL reingresa con una pista `next_iter_focus`.
- El PR **nunca** se abre automáticamente; hay que revisar el transcript en
  `.claude/runtime/outputs/sse/sdd/{feature_id}.md` y correr `/sse:pr` cuando esté listo.

## Vea también

- [Golden Path](Golden-Path): correr los seis stages con un solo comando
- [Sensors](Sensors) y [Evals](Evals): las gates en detalle
- [Agents](Agents): quién es dueño de cada stage
