# Evals (feedback inferential)

Los evals son el control de feedback **inferential, basado en LLM**. Donde un [sensor](Sensors) revisa
la estructura de forma determinista, un eval juzga el *significado*: si este PRD es claro, si el
trade-off de este diseño es real, si este plan realmente se desprende del PRP. Un eval es un LLM-judge
puntuado de 0 a 10 contra una rubric, con un threshold de aprobación de **8.0** y **hasta 3 retries**.

## Por qué hacen falta controles inferential

Ningún regex te dice que el planteo del problema es vago, que la hipótesis es infalsable, o que un
diseño escondió su trade-off más difícil. Eso es criterio semántico, y solo un modelo de lenguaje puede
hacerlo con esta granularidad. El costo: es probabilístico, así que lo calibras con una rubric y pesos
en vez de confiar en un "califica esto del 1 al 10" pelado.

## Anatomía de un eval

Una rubric es un archivo markdown: dimensiones con peso, cada una con anclas en 0/5/10, un threshold, y
un formato de salida estricto.

```markdown
# Eval: Design Quality
Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

## Rubric
### Requirements rigor (weight 15%)
Numeric targets + back-of-envelope math?
- 10: numeric targets + sizing math
- 5: some numbers, no math
- 0: prose only
...

## On failure (total below 8.0)
Retry. Regenerate lowest-scoring sections only. Max 3 attempts.

## Output format
{ "scores": {...}, "weighted_total": 0.0, "feedback": ["dimension: issue with line ref"] }
```

`weighted_total = sum(score x weight%) / 100`. El judge debe citar una línea o sección cada vez que
puntúa una dimensión por debajo de 7, para que el feedback sea accionable y no una corazonada.

## El loop de retry

```
generate -> sensors (hard gate) -> eval (score)
   ^                                   |
   |          below 8.0                v
   +------ regenerate weak sections ---+   (max 3 attempts, then blocker)
```

Lo crítico: el retry regenera **solo las dimensiones con puntaje bajo**, no el artefacto completo, y el
feedback por dimensión del judge dice cuáles son. Después de 3 intentos fallidos, la stage devuelve un
blocker en vez de entregar algo por debajo del threshold.

## Los pesos codifican lo que importa

Los pesos son donde expresas prioridades. En la rubric de calidad de PRD, *completitud de métricas* y
*claridad* llevan el mayor peso, porque un PRD vive o muere por un problema nítido y un éxito medible.
En la rubric de calidad de diseño, *arquitectura + deep dives* y *disciplina de trade-off* dominan,
porque eso es lo que separa un diseño de staff de un diagrama de cajitas. Ajustar los pesos es una
acción de "human on the loop": cambias una vez lo que a la gate le importa, y aplica a todo artefacto
futuro.

## Calibración y anti-sello de goma

Un eval que siempre pasa no sirve de nada. Dos prácticas lo mantienen honesto:

- **Escalas ancladas.** Cada dimensión define cómo se ven el 0, el 5 y el 10, así el judge no adivina
  qué significa un "7".
- **Encuadre adversarial donde importa.** El eval `design-review-depth` del system-architect puntúa un
  *review* y reprueba explícitamente al que solo pone el sello: un review sin brechas nombradas, con
  severidad plana, o con consejos genéricos de "considera mejorar" saca puntaje bajo por diseño.

## Evals en harness-kit

| Stage | Evals |
|---|---|
| `prd` | `prd-quality`, `prd-readiness` |
| `prp` | `prp-quality`, `prp-context-readiness` |
| `plan` | `plan-quality` |
| `dev` | `dev-quality` |
| `pr` | `pr-quality` |
| system design | `design-quality`, `design-review-depth` |

## La variante PASS/FAIL: spec-satisfied

El loop spec-driven (`/sse:sdd`) usa otra forma de eval. En vez de un puntaje de 0 a 10,
`spec-satisfied` devuelve **PASS/FAIL** contra el `Success criteria (verifiable)` y los `Validation
gates` del PRP. Un `FAIL` reingresa al loop dev↔test con una pista en `next_iter_focus`; el loop corre
como máximo 3 iteraciones. Corre en una **sesión nueva**, sin contexto del worker, para que el judge no
quede sesgado por la narrativa de quien implementó. Este es un eval usado como *predicado de objetivo*
en lugar de puntaje de calidad.

## Sensor primero, eval después

El orden importa: los sensors corren antes que los evals. No tiene sentido gastar una llamada a un LLM
puntuando la prosa de un artefacto al que le falta la mitad de las secciones. La gate determinista
despeja primero las fallas baratas y objetivas; el eval juzga solo artefactos bien formados.

## Ver también

- [Sensors](Sensors): la gate determinista que corre primero
- [Guides](Guides): feedforward que reduce cuán seguido fallan los evals
- [Pipeline y stages](Pipeline-and-Stages): dónde se ubican los evals dentro de una stage

## Lo que el puntaje no es

El judge devuelve puntajes por dimensión y un total ponderado, y hasta hace poco nada verificaba que el
total se desprendiera de los puntajes. Ahora sí: pasa el JSON del judge por el verificador de puntaje,
que lee los pesos de la rubric y recalcula.

```
.claude/scripts/eval-score.py --rubric evals/prd-quality.md --scores judge.json
```

Exit 0 imprime el número que el marker de aprobación debe llevar. Exit 2 significa que el judge infló
el total, puntuó una dimensión que la rubric no pesa, o se saltó una que sí pesa, y en ese caso el
puntaje no significa nada y no apruebas con base en él.

Eso arregla solo la mitad computable. Quedan dos límites en pie, y vale la pena ser franco sobre ellos:

- **Los puntajes no están validados contra etiquetas humanas.** 8.0 es una convención, no un límite
  calibrado. [Husain](https://hamel.dev/blog/posts/llm-judge/) sostiene que las escalas del 1 al 10 sin
  calibrar significan cosas distintas para distintos evaluadores, y que los juicios binarios más la
  concordancia humana medida son lo que vuelve confiable a un eval. Todavía no hacemos eso.
- **Un evaluador nuevo no es uno imparcial.** Lanzar un judge sin contexto previo le quita el interés
  del autor en el texto, pero los LLM judges siguen inflando puntajes para salida de su propia familia
  ([Panickssery et al.](https://arxiv.org/abs/2410.21819)). Un Claude nuevo juzgando a Claude sigue
  siendo autopreferencia. Arreglarlo en serio requiere otra familia de modelo o una persona.

Lee el feedback, no solo el número. El puntaje es una señal que atrapa artefactos débiles, no una
medición.
