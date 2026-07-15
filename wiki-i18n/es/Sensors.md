# Sensors (feedback determinista)

Los sensors son el control de feedback: observan el artefacto después de que el agent lo escribe y
devuelven un pass/fail duro. Un sensor que falla **bloquea la aprobación**, y el agent regenera hasta
que pase.

Cada sensor declara **cómo se aplica**, y esa distinción es todo el punto:

| `Execution:` | Aplicado por | ¿Puede reportar un pass? |
|---|---|---|
| `computational` | `sensor-runner.py`, determinista, mismo veredicto siempre | sí, realmente revisó |
| `inferential` | un modelo o una persona aplicando criterio | **nunca** como `pass`, solo como `inferential` |

Esta es la división computational/inferential de Böckeler, y harness-kit la aprendió por las malas.
Tres sensors llegaron a declararse gates duras y deterministas mientras escribían sus chequeos en
prosa, para la cual el runner no tenía ningún handler. El runner devolvía 0, y el log de calidad los
registraba como `passed` en cada corrida, contra un chequeo que nunca ocurrió. Un sensor que no puede
reportar un pass que no se ganó vale más que uno que siempre dice que sí.

Corre `python3 .claude/scripts/check-sensors.py` para imprimir el registro de enforcement: cada sensor,
su tipo de ejecución, y los chequeos que de verdad conecta.

## Qué es un sensor

Un sensor es un archivo markdown simple que describe chequeos, más un pequeño runner en Python que los
aplica con regex de verdad. El markdown es la spec; el runner es el enforcement. Forma de ejemplo:

```markdown
# Sensor: PRD Structure
Type: deterministic
Execution: computational
Mode: hard gate

## Required sections
- Problem and Hypothesis
- Customers
- ...

## Forbidden tokens
- lorem, TODO, FIXME, placeholder

## Markdown rules
- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## On failure
Block publish. Return missing sections, forbidden tokens, rule violations.
Agent regenerates failed parts only.
```

## Cómo funciona el runner

`sensor-runner.py` extrae las secciones conocidas del markdown del sensor y las contrasta contra el
artefacto:

- **Required sections**: por cada bullet arma un regex de heading (tolerante a prefijos numerados, tipo
  `## 3) ...`) y falla si el heading no está.
- **Forbidden tokens**: falla si aparece alguno (atrapa `TODO`, `lorem`, tokens de template sin llenar
  como `{System Name}`).
- **Markdown rules**: exactamente un H1, sin em-dash, sin dibujo de cajas en ASCII, mínimo de bloques
  mermaid, etcétera.

Los exit codes cargan la distinción:

| Código | Significado |
|---|---|
| `0` | todos los chequeos pasaron |
| `1` | un chequeo falló. El agent arregla solo las partes que fallaron |
| `2` | la spec del sensor está **rota**: declara `computational` pero no conecta ningún chequeo que el runner entienda. No es un pass, es un bug en el sensor |
| `3` | el sensor es `inferential`. El runner se niega a correrlo, y quien lo llama registra `inferential`, nunca `pass` |

El exit 2 existe porque la alternativa es el silencio. Un sensor cuyos chequeos el runner no puede
parsear solía devolver 0 para siempre, lo que se lee como "revisado y todo bien" cuando la verdad es
"nunca miró". Un hook PostToolUse dispara el runner al guardar y devuelve el feedback al agent.

El match de headings es indulgente a propósito: se ignora un paréntesis al final y se permite un
prefijo descriptivo, así que `## Design doc, required sections (all present, in order)` resuelve a
`Required sections`. El bug original era exactamente ese: el runner aceptaba solo `(all must be
present, in order)`, tres sensors escribieron `(all present, in order)`, y unas 30 aserciones de
sección escritas no hacían nada.

## Por qué determinista

La estructura no es cuestión de opinión, así que no debería costar una llamada a un LLM ni quedar
sujeta al humor de un modelo. Empujar cada regla verificable hacia un sensor:

- hace la gate **rápida y gratis** (cero tokens),
- la hace **exacta** (sin falsos "se ve bien"),
- libera al [eval](Evals) para juzgar solo lo que de verdad necesita criterio semántico.

Esta es la jugada central de la ingeniería de harness: haz determinista lo que puedas, infiere solo lo
que no quede otra.

## Sensors en harness-kit

Cada stage tiene sus propios sensors. Una muestra:

| Stage | Sensors |
|---|---|
| `prd` | `prd-structure`, `prd-acceptance-criteria` |
| `prp` | `prp-structure`, `prp-context-quality`, `prp-links`, `link-validator` |
| `plan` | `plan-structure` |
| `dev` | `dev-structure`, `code-maintainability` (computational), `code-conventions`, `test-coverage` (inferential) |
| system design | `design-structure`, `review-structure` (computational), `design-rigor` (inferential) |

`code-maintainability` es el que sale del documento y mira el código. Corre lo que el repo realmente
configura (npm `lint`/`typecheck`, ruff, ktlint, checkstyle, gitleaks) y nunca una config impuesta.
Cuando un repo no configura nada que conozca, sale con 4, **no revisado**, en vez de pasar. Nada
corrió, así que nada se sabe.

`design-rigor` es el contraejemplo honesto. Quiere metas numéricas, cuentas de servilleta visibles, al
menos tres trade-offs y una fase de rebanada vertical. Eso necesita criterio, así que es `inferential`:
un modelo lo aplica y el log lo dice. Pasó mucho tiempo diciéndose una gate dura y determinista
mientras no revisaba nada en absoluto.

## Feedback optimizado para el agent

El valor de un sensor no está solo en el veredicto, está en el **mensaje**. "missing required section:
'Success Metrics'" le dice al agent exactamente qué agregar. Una buena salida de sensor se lee como
instrucciones para el siguiente turno, no como un stack trace. Eso es lo que convierte al feedback
determinista en un loop de autocorrección en vez de un muro.

## Escribir un sensor

- Declara **`Execution:`** con honestidad. Si el runner no puede revisarlo, es `inferential`, y decirlo
  no te cuesta nada. Reclamar `computational` y expresar el chequeo en prosa es como terminas con un
  sensor que reporta verde para siempre sin mirar nada.
- Expresa los chequeos computational en una sección que el runner parsee: `Required sections`,
  `Forbidden sections`, `Required tokens`, `Forbidden tokens`, `Markdown rules`. Cualquier otra cosa es
  documentación, no enforcement.
- Mantén los chequeos **objetivos**: si una persona puede estar en desacuerdo, eso va en un eval o en
  un sensor inferential.
- Nombra la **falla con precisión**, para que el arreglo sea obvio.
- Usa **forbidden tokens** para atrapar placeholders de template sin llenar (`{N}`, `{...}`, `TBD`).
- Márcalo como **hard gate**; los sensors no tienen threshold, pasan o bloquean.
- Corre `python3 .claude/scripts/check-sensors.py` antes de commitearlo. CI también lo corre, y la
  suite de tests verifica que todo sensor computational rechace un artefacto vacío, así que un sensor
  que no revisa nada rompe el build en vez de salir a producción.

## Ver también

- [Evals](Evals): la mitad inferential que juzga el significado
- [Ingeniería de harness](Harness-Engineering): controles computational vs inferential
- [Referencias](References): la literatura sobre la que esto se construyó
- Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html),
  martinfowler.com. El origen de la división computational/inferential, del sensor de mantenibilidad, y
  de la advertencia sobre la "illusion of quality" (ilusión de calidad) que produce un sensor que no
  revisa nada.
