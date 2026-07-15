# Orquestación y subagents

> **Estado: live (v5).** La topología de orquestador y hojas está en pie en todas las stages: `intake`
> es un subagent de solo lectura, el eval de cada stage se despacha a un evaluador nuevo que no escribió
> el artefacto, y los inputs siguen resolver-marcar-continuar. La forma canónica vive en
> [`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md).
> El model tiering a Haiku para los chequeos más baratos sigue *(planned)*.

El pipeline original de harness-kit lo cargan dos agents monolíticos: `product-manager` corre `prd` y
después `prp` inline, y `staff-software-engineer` corre `plan → dev → test → pr` inline. Dentro de cada
agent, los sensors y los evals corren en el mismo contexto que el autor. Esta página explica por qué v5
rompe eso en un **orquestador más subagents chicos y de propósito único**, y, igual de importante, dónde
deliberadamente *no* lo hace.

## Por qué subagents

Un subagent es un contexto nuevo y aislado, invocado a través de la Task tool. Dividir el trabajo en
subagents rinde en exactamente tres situaciones, y v5 usa todas:

1. **Aislamiento de contexto.** Una stage que lee cientos de archivos (`intake`, `dev`) no debería
   arrastrar ese bulto a las stages posteriores. Cada subagent arranca limpio y devuelve solo un
   resultado destilado.
2. **Paralelismo.** El trabajo genuinamente independiente corre en paralelo: un panel de revisores, o
   `dev` abriéndose sobre módulos independientes.
3. **Separación adversarial.** El agent que escribe un artefacto no puede ser el agent que lo califica.
   Un crítico nuevo, sin nada invertido en el texto, da una nota honesta.

La tercera es la razón más fuerte. Hoy el mismo agent escribe un PRD y después lo evalúa, que es
corregir la propia tarea: la nota se infla porque quien califica está apegado al trabajo. Un evaluador
separado, arrancado desde cero y que solo recibe el artefacto, no tiene nada que defender.

No es una idea nueva en harness-kit. El loop de SDD ya corre su eval `spec-satisfied` en una **sesión
nueva, sin contexto del worker** (ver [Pipeline y stages](Pipeline-and-Stages)). v5 generaliza ese caso
único y lo convierte en la regla para toda gate.

## La trampa de la descomposición excesiva

Cada salto a un subagent tiene costo: arrancar un contexto nuevo, releer archivos que no hereda (los
subagents no comparten memoria), más latencia y más tokens. Así que el objetivo **no** es un subagent
por paso. Divide solo cuando el salto compra uno de los tres beneficios de arriba. Si no, deja el
trabajo inline o, mejor, en un script determinístico.

La línea divisoria es criterio versus determinismo:

- Un chequeo que es una regla estructural, "¿el PRD tiene las secciones obligatorias?", es un **script
  de sensor**. No necesita modelo, y un modelo solo lo haría más lento y menos confiable.
- Un chequeo que exige leer y sopesar, "¿esta hipótesis es realmente testeable?", es un **eval
  subagent**.

harness-kit ya mantiene sus sensors determinísticos como scripts. v5 preserva eso. La descomposición
agrega subagents para *criterio y aislamiento*, no para trabajo que el código ya hace mejor.

## Tres responsabilidades, separadas

El movimiento central es dejar de enredar tres responsabilidades distintas dentro de un solo agent:

| Responsabilidad | Quién la posee en v5 | Regla |
|---|---|---|
| **Coordinación**: secuencia, estado, markers, retries, gates | un **orquestador** (la sesión principal) | Nunca escribe un artefacto. Solo despacha y graba estado. |
| **Generación**: escribir el PRD, el PRP, el plan, el código | **subagents autores** | Stateless. Inputs explícitos, salida estructurada. |
| **Verificación**: sensor y eval | **subagents verificadores**, separados del autor | Quien califica nunca escribió lo que califica. |

Los agents monolíticos mezclaban los tres. Separarlos es lo que vuelve confiables a las gates y limpios
a los contextos.

## La topología

```
/pipeline:run "<one-line idea>"
  │  orchestrator = main session: owns .pipeline-state.json, markers, gates
  │
  ├─ intake        subagent   harvest repo + context-library → intake.md
  │      ↓ orchestrator reads unknowns[], decides the PRD gate
  ├─ prd-author    subagent   write PRD
  ├─ prd-sensor    script     structural pass/fail (no model)
  ├─ prd-eval      subagent   adversarial score, fresh context
  │      ↓ score ≥ 8.0 → orchestrator writes approval marker → next stage
  ├─ prp-author / prp-eval
  ├─ planner
  ├─ dev × N       subagents  fan out only over independent modules
  ├─ tester
  ├─ reviewer × 3  subagents  parallel, distinct lenses (correctness · security · repro)
  └─ pr-author
```

El orquestador es un coordinador, no un trabajador. Instancia cada hoja, lee su retorno estructurado y
graba la transición de estado resultante. Las hojas nunca se hablan entre sí; toda la información fluye
por el orquestador y por los artefactos en disco.

## El corte adversarial

La regla que vuelve honestas a las gates:

> El subagent que escribe un artefacto nunca es el subagent que lo evalúa.

El evaluador arranca sin ninguna memoria de cómo se escribió el artefacto. Recibe solo el artefacto y la
rubric, y se le pide encontrar lo que está mal, no defender lo que está ahí. Para gates de alto riesgo,
un **panel** reemplaza al juez único: tres evaluadores con lentes distintas corren en paralelo y decide
la mayoría. La diversidad de lente atrapa modos de falla que un solo revisor, o tres revisores
idénticos, dejarían pasar.

## Model tiering

Separar responsabilidades permite correr cada subagent en el modelo del tamaño justo:

| Trabajo | Modelo | Por qué |
|---|---|---|
| Sensors determinísticos | *(ninguno, es script)* | Una regla estructural no necesita inferencia. |
| Criterio mecánico y barato | Haiku *(planned)* | Rápido, barato, suficiente para chequeos angostos. |
| Autoría y eval adversarial | Opus | Las partes que necesitan razonamiento de verdad. |

Un agent monolítico tiene que correr todo en un solo tier. La descomposición deja que el trabajo barato
sea barato y reserva el modelo fuerte para autoría y criterio.

## Las restricciones de Claude Code moldean el diseño

Los subagents en Claude Code son **hojas stateless**: no pueden mutar estado compartido, no heredan
memoria de quien los llama, y el anidamiento es limitado (un subagent no instancia libremente sus
propios subagents). Esto no es una limitación para pelear; dicta un diseño limpio:

- El **orquestador es dueño de todo el estado.** `.claude/.pipeline-state.json` y los archivos de marker
  los escribe el orquestador, a través del `pipeline.py` y el `marker.sh` que ya existen, nunca una
  hoja.
- Las hojas **retornan, no graban.** Un subagent llena un artefacto y reporta un resultado
  estructurado. El orquestador lee ese resultado y ejecuta la transición de estado.
- La **maquinaria de hooks, markers y tokens queda intacta.** Los subagents encajan por debajo de ella:
  una hoja escribe el artefacto, el orquestador cambia el estado, y los mismos hooks de post-escritura
  disparan como antes.

Nada de lo que funciona hoy se tira. Los subagents entran como hojas debajo de la capa de coordinación
que ya existe.

## Contratos

Una orquestación confiable necesita contratos explícitos. A cada subagent se le da:

- **Inputs explícitos**: rutas de archivo, no "el contexto". A `prd-author` se le entrega la ruta del
  `intake.md` y las rutas de los guides, no una instrucción vaga de "usa lo que sabes".
- **Salida estructurada**: una forma definida que el orquestador puede parsear y sobre la cual ramificar.
  Por ejemplo, `intake` retorna `{ squad, problem, repos[], customers[], unknowns[] }`, y el orquestador
  lee `unknowns[]` para decidir si la gate del PRD necesita al humano.

Sin contratos, la orquestación degenera en adivinar qué produjo una hoja. Con ellos, el control de flujo
es determinístico aunque las hojas sean inferenciales.

## Cómo fue el rollout: primero una rebanada vertical

v5 no reconstruyó los dos monolitos de una vez. Habría sido un cambio grande y difícil de debuggear. El
rollout probó primero una **sola rebanada vertical**, la stage `prd`, con el patrón nuevo, de punta a
punta:

```
intake (subagent) → prd-author → prd-sensor (script) → prd-eval (subagent, fresh context)
```

Una vez que esa rebanada funcionó contra un repositorio real, se volvió el template, capturado en
[`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md).
Cada otra stage (`prp`, `plan`, `dev`, `test`, `pr` y las stages de `system-design`) pasó a ser una
réplica de ese patrón ya validado, en vez de un experimento simultáneo: cada una lee sus inputs vía
resolver-marcar-continuar y despacha su eval a un evaluador nuevo. Las stages nuevas siguen el mismo
archivo.

## Ver también

- [Autonomía](Autonomy): el subagent de intake y la autonomía con gates
- [Pipeline y stages](Pipeline-and-Stages): las stages que dirige el orquestador
- [Agents](Agents): los agents que se están descomponiendo
- [Ingeniería de harness](Harness-Engineering): controles computacionales versus inferenciales
