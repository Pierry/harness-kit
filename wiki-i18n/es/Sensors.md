# Sensors (feedback determinista)

Un sensor lee el artefacto después de que el agent lo escribe y devuelve pass o fail. Un sensor que falla bloquea la aprobación, y el agent regenera las partes que fallaron hasta que pasa.

Cada sensor declara cómo se aplica:

| `Execution:` | Lo aplica | Puede reportar pass |
|---|---|---|
| `computational` | `sensor-runner.py`, el mismo veredicto cada vez | sí |
| `inferential` | un modelo o una persona que aplica criterio | nunca; se registra como `inferential` |

Esta es la división de Böckeler. Tres sensors de harness-kit decían ser gates duros mientras escribían checks en prosa que el runner no podía parsear; el log registraba `passed` en cada corrida para checks que nunca corrieron. `python3 .claude/scripts/check-sensors.py` imprime cada sensor, su tipo de ejecución y los checks que conecta.

# Qué es un sensor

Un sensor es una spec en markdown; un runner en Python la aplica con regex.

```markdown
# Sensor: PRD Structure
Type: deterministic
Execution: computational
Mode: hard gate

## Required sections
- Problem and Hypothesis
- Customers

## Forbidden tokens
- lorem, TODO, FIXME, placeholder

## Markdown rules
- exactly 1 H1 heading
- no em-dash
```

# Cómo funciona el runner

`.claude/runtime/scripts/{agent}/sensor-runner.py` parsea cinco secciones: `Required sections`, `Forbidden sections`, `Required tokens`, `Forbidden tokens` (o `Forbidden patterns`), `Markdown rules`. Las secciones requeridas se vuelven regex de encabezado que toleran prefijos como `## 3) ...`. Todo lo demás en el archivo es documentación y no se aplica.

| Salida | Significado |
|---|---|
| `0` | pasaron todos los checks |
| `1` | falló un check; el agent corrige solo las partes que fallaron |
| `2` | spec rota: `computational` sin ningún check que el runner entienda |
| `3` | `inferential`; el runner lo rechaza y quien lo llama registra `inferential`, nunca `pass` |

Un hook PostToolUse corre el runner al guardar y devuelve el feedback al agent. El match de encabezados ignora un paréntesis al final, así `## Design doc, required sections (all present, in order)` se resuelve como `Required sections`. El bug original: el runner solo aceptaba `(all must be present, in order)`, tres sensors escribieron `(all present, in order)`, y unas 30 aserciones no hacían nada.

# Por qué determinista

Un sensor no cuesta tokens, da la misma respuesta cada vez y le deja al [eval](Evals) solo lo que necesita juicio semántico. Haz determinista lo que puedas e infiere solo lo que debas.

# Sensors por stage

| Stage | Sensors |
|---|---|
| `prd` | `prd-structure`, `prd-acceptance-criteria` |
| `prp` | `prp-structure`, `prp-context-quality`, `prp-links` (corre `link-validator.py`) |
| `plan` | `plan-structure` |
| `dev` | `dev-structure`, `code-maintainability`, `code-conventions` y `test-coverage` (ambos inferential) |
| `test` | `test-structure` |
| `pr` | `pr-structure` |
| entrada `sdd` | `prp-has-acceptance-criteria` (inferential) |
| system design | `design-structure`, `review-structure`, `design-rigor` (inferential) |

`code-maintainability` revisa código. Corre lo que el repo configura (`lint` y `typecheck` de npm, ruff, ktlint, checkstyle, gitleaks), nunca una configuración impuesta, y sale con 4 (no revisado) cuando no encuentra nada que conozca. `design-rigor` exige metas numéricas, cálculos de back-of-envelope, tres trade-offs y una fase de vertical slice; eso necesita criterio, así que es `inferential`.

# Escribir un sensor

Declara `Execution:` con honestidad: si el runner no puede revisarlo, es `inferential`. Pon los checks computacionales en las cinco secciones que se parsean, mantenlos objetivos y usa forbidden tokens para atrapar placeholders como `{N}` y `TBD`. Escribe el mensaje de falla como una instrucción, por ejemplo "missing required section: 'Success Metrics'".

Corre `python3 .claude/scripts/check-sensors.py` antes de hacer commit. CI también lo corre, y un test verifica que cada sensor computacional rechaza un artefacto vacío.

# Ver también

[Evals](Evals), [Harness Engineering](Harness-Engineering), [Referencias](References). Fuente: Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html).
