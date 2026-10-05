# Ingeniería de harness

# Agent = Model + Harness

El harness es todo lo que hay en un agent de código excepto el modelo.

```
Agent = Model + Harness
```

El harness son los guides, herramientas, checks, permisos, memoria y contexto alrededor del modelo. Rara vez cambias el modelo; cambias el harness, para que una buena salida sea más probable y el agent se corrija antes de que una persona vea el resultado.

Fuente: Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), en la serie *Exploring Gen AI* de Martin Fowler (2026). El artículo complementario, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html), desarrolla la mitad de los sensors.

# Feedforward y feedback

Los controles de feedforward orientan al agent antes de que actúe: guías de estilo, templates, convenciones, ejemplos. En harness-kit son los [guides](Guides). Los controles de feedback observan después de que actúa y le permiten autocorregirse: linters, tests, chequeos de estructura, revisiones con puntaje. En harness-kit son los [sensors](Sensors) y los [evals](Evals). El feedback funciona mejor escrito para el modelo: "missing section X; add it with these fields".

# Controles computacionales e inferenciales

Los controles computacionales son deterministas: misma entrada, mismo veredicto, baratos, ciegos al significado. Los controles inferenciales usan un modelo para el juicio semántico, como saber si un diseño nombra sus trade-offs; son probabilísticos y necesitan calibración.

La mayoría de los sensors de harness-kit son computacionales; los que necesitan criterio declaran `Execution: inferential` y nunca reportan un pass. Los evals son inferenciales, puntuados por un evaluador de Claude o por Jev (mira [Evals](Evals)). Lleva a un sensor todo lo que puedas y deja el eval para el significado.

# Qué regulan los controles

Böckeler nombra tres dimensiones: comportamiento funcional (tests, criterios de aceptación), mantenibilidad (linters, estructura, estilo) y aptitud de arquitectura (fitness functions, overrides de convenciones). En harness-kit, los sensors aplican estructura y convenciones, los evals puntúan claridad y rigor, y los archivos `.claude/conventions/` por repo fijan la aptitud de arquitectura.

# Humanos fuera, dentro o encima del loop

Fuera del loop, el agent entrega sin revisión, lo que es raro y de alto riesgo. Dentro del loop, una persona revisa cada salida, lo que limita el throughput a la velocidad de revisión. Encima del loop (on the loop), la persona mantiene el harness y el harness revisa las salidas. harness-kit está construido para on the loop, la única postura que escala: ajustas una rubric una vez, y cuando el agent se desvía corriges el guide, no la salida.

# Cómo lo aplica harness-kit

Cada stage de cada pipeline es un pequeño harness:

| Capa | Control | Qué hace | Dónde |
|---|---|---|---|
| Guide | feedforward | cómo escribirlo | `guides/`, `templates/`, `examples/` |
| Referencia | contexto | qué traer | `AGENTS.md`, artefactos previos, `conventions/` |
| Sensor | computacional o inferencial | estructura obligatoria, bloquea la aprobación | `sensors/`, corrido por `sensor-runner.py` |
| Eval | inferencial | rubric ponderada de checks de sí o no, threshold 8.0, retry hasta 3 veces | `evals/`, verificado por `eval-score.py` |

Un artefacto avanza solo cuando sus sensors pasan y su eval supera 8.0, para PRDs, PRPs, planes, código, tests, PRs y System Design Docs. Guides, sensors y evals son markdown plano; solo runners, scripts y hooks son código, así puedes leer y cambiar lo que se revisa.

# Ver también

[Guides](Guides), [Sensores](Sensors), [Evals](Evals), [Pipeline y stages](Pipeline-and-Stages), [Golden Path](Golden-Path), [Referencias](References).
