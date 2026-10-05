# Pipeline y stages

harness-kit lleva una feature por seis stages con gates:

```
prd → prp → plan → dev → test → pr
```

El agent product-manager es dueño de los dos primeros y el agent staff-software-engineer de los últimos cuatro. Un stage [`intake`](Autonomy) corre al frente: recolecta el repo y la context library para que ningún stage se detenga a preguntar, y después cada stage corre como un [orquestador con subagents hoja](Orchestration-and-Subagents). `/pipeline:run` conduce de `intake` a `pr` con dos gates humanos, después del PRD y antes del PR.

# Anatomía de un stage

Cada stage es un pequeño [harness](Harness-Engineering): guides como `pipeline.md` y `templates/` dicen cómo escribir, referencias como `prp/<feature>.md` y `conventions/{area}.md` dan contexto, un [sensor](Sensors) bloquea la estructura mala y un [eval](Evals) puntúa la calidad.

El agent escribe el artefacto en `.claude/runtime/outputs/{pm,sse}/{stage}/{feature_id}.md`. Al guardar, los sensors se disparan, y una falla devuelve feedback para que el agent corrija solo las partes que fallaron. Después el judge responde los checks atómicos de sí o no de la rubric, y `eval-score.py` recalcula el total ponderado de 0 a 10 a partir de los pesos de la rubric.

El judge es un evaluador nuevo de Claude (`local`, el default) o Jev de TypeSafe AI (`jev`), definido por proyecto con `/hk:eval`. Por debajo de 8.0 el stage reintenta hasta 3 veces, regenerando solo los checks que fallaron. Al aprobar, el agent agrega `<!-- approved: {date} score={n} -->`, y el siguiente stage busca ese marker antes de empezar.

# Los stages

| Stage | Agent | Artefacto | Sensors | Evals |
|---|---|---|---|---|
| `prd` | product-manager | Product Requirements Document | `prd-structure`, `prd-acceptance-criteria` | `prd-quality`, `prd-readiness` |
| `prp` | product-manager | Product Requirements Prompt | `prp-structure`, `prp-context-quality`, `prp-links` | `prp-quality`, `prp-context-readiness` |
| `plan` | staff-software-engineer | plan técnico | `plan-structure` | `plan-quality` |
| `dev` | staff-software-engineer | código y commits | `dev-structure`, `code-conventions`, `code-maintainability`, `test-coverage` | `dev-quality` |
| `test` | staff-software-engineer | reporte de la corrida de tests | `test-structure` | `test-quality` |
| `pr` | staff-software-engineer | pull request | `pr-structure` | `pr-quality`, luego activa `pr-monitor` |

`prp-links` corre `link-validator.py`. Los evals de readiness y `spec-satisfied` siempre usan Claude, sin importar qué judge elijas. El system design, del agent system-architect, es un stage previo opcional antes de `prp` o `plan` y queda fuera de estos seis.

# Markers de aprobación y tokens

El marker es `<!-- approved: YYYY-MM-DD score=N -->`, y el PRP además lleva `ready-for-handoff: true`. Su presencia permite que empiece el siguiente stage.

Hooks envuelven cada fase, y `token-phase.py` suma el uso del transcript de Claude en `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`, un archivo por agent para todo el ciclo de vida porque cada stage reutiliza el `feature_id`. La contabilidad de tokens nunca bloquea un stage; con un transcript ilegible registra el error y sale limpia.

# Estado del pipeline

`hk status` muestra la feature activa. La misma línea puede ser la status line de Claude Code, pero solo si instalas con `HK_STATUSLINE=1`; por defecto el harness no toca tu status line, porque una configuración de proyecto la reemplazaría.

```
idle · /product-manager:run · /sse:run · /pipeline:continue
billing-fix · prp approved · plan drafting · next /sse:plan
billing-fix · complete
```

El estado vive en `.claude/.pipeline-state.json`. Reabre una sesión y `/pipeline:continue` retoma en el siguiente stage pendiente. Cuando el PR se mergea, el monitor limpia el estado.

# Herramientas de contexto

Los stages que leen el repo objetivo corren `.claude/scripts/context-tools.sh` una vez y usan lo que esté instalado. semble encuentra código por intención y devuelve archivo y línea, repowise explica módulos, mide el riesgo de tocarlos y lista los tests que cubren un cambio, context7 trae la documentación actual de librerías, y joern o graphify dicen quién llama a qué. Sin ninguno, el stage vuelve a grep. [context-strategy.md](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/context-strategy.md) asigna una herramienta a cada pregunta.

# Comandos de un solo stage

Cada stage también es su propio comando, con los mismos sensors y evals. La lista de desvíos está en [Golden Path](Golden-Path#salirse-del-camino).

# El loop SDD

`/sse:sdd` reemplaza la pasada única de dev y test por un loop con objetivo:

```
prd → prp → plan → [dev ↔ test ↔ spec-satisfied eval] → [user gate] → pr
                         loop, cap 3 iterations           stops local
```

El sensor previo `prp-has-acceptance-criteria` bloquea un PRP que no se puede testear. El predicado del loop sale de `Success criteria (verifiable)` y `Validation gates` del PRP. El eval `spec-satisfied` de cada iteración corre en una sesión nueva de Claude y devuelve PASS o FAIL; un FAIL vuelve a entrar con una pista `next_iter_focus`.

El PR nunca se abre solo. Lees el transcript en `.claude/runtime/outputs/sse/sdd/{feature_id}.md` y corres `/sse:pr` cuando estés listo.

Mira también [Golden Path](Golden-Path), [Sensores](Sensors), [Evals](Evals), [Agents](Agents).
