# Ingeniería de harness

La teoría sobre la que está construido harness-kit. Lee esta página para entender *por qué* el repo
tiene la forma que tiene: guides, sensors, evals, stages con gate.

## Agent = Model + Harness

El término **harness** es la forma corta de nombrar todo lo que hay en un agent de código, salvo el
modelo mismo.

```
Agent = Model + Harness
```

El modelo genera. El harness es el andamiaje a su alrededor: los prompts y guides que lo orientan antes
de que actúe, las herramientas que puede llamar, las verificaciones que atrapan sus errores después de
que actúa, los permisos, la memoria, el contexto que ve. Normalmente no se puede cambiar el modelo. Sí
se puede cambiar el harness. **Harness engineering** es la práctica de mejorar el harness para elevar la
probabilidad de una buena salida y dejar que el agent se corrija solo antes de que un humano vea el
resultado.

Fuente: Birgitta Böckeler, *Harness engineering for coding agent users*, de la serie *Exploring Gen AI*
de Martin Fowler, martinfowler.com (2026). El texto complementario, *Maintainability sensors for coding
agents*, desarrolla la mitad de los sensors.

## Feedforward y feedback

El harness tiene dos tipos de control, tomados de la teoría de control.

- **Controles feedforward (guides)** anticipan el comportamiento del agent y lo orientan *antes* de que
  actúe. Ejemplos: una guía de estilo de escritura, un template, una convención de código, un ejemplo de
  buena salida. En harness-kit son los [`guides/`](Guides).
- **Controles de feedback (sensors y evals)** observan *después* de que el agent actúa y lo ayudan a
  corregirse. Ejemplos: un linter, un test, una verificación de estructura, un review con puntaje. En
  harness-kit son los [`sensors/`](Sensors) y los [`evals/`](Evals).

El feedback rinde más cuando su señal está **optimizada para consumo de un LLM**: un sensor que no solo
dice "falló", sino que dice "falta la sección X; agrégala con estos campos", le da al agent exactamente
lo que necesita para arreglarse en el siguiente turno.

## Controles computacionales e inferenciales

Cortando por el otro eje, los controles son:

- **Computacionales (determinísticos)**: linters, tests, verificaciones de schema, reglas de estructura.
  Misma entrada, mismo veredicto, siempre. Baratos, rápidos, exactos, pero ciegos al significado. Los
  **sensors** de harness-kit son computacionales.
- **Inferenciales (basados en LLM)**: juicio semántico: "¿este PRD es claro?", "¿este diseño nombra sus
  trade-offs?". Resuelven el significado que ninguna regex alcanza, pero son probabilísticos y hay que
  calibrarlos. Los **evals** de harness-kit son inferenciales.

Hacen falta los dos. Una verificación de estructura no puede decirte que la prosa es vaga; y no se puede
confiar en un juez LLM para aplicar de forma determinística la regla "exactamente un heading H1". La
disciplina es empujar hacia un sensor todo lo que *sí* se puede volver determinístico, y reservar el
eval para el juicio semántico genuino.

## Qué regulan los controles

Böckeler plantea tres dimensiones que un harness regula:

1. **Comportamiento funcional**: ¿hace lo correcto? (tests, criterios de aceptación)
2. **Maintainability**: ¿está limpio, simple, dentro de la convención? (linters, estructura, estilo)
3. **Architecture fitness**: ¿encaja con el diseño y las restricciones previstas? (fitness functions,
   overrides de convención)

Las gates de harness-kit tocan las tres: los sensors aplican estructura y convenciones (maintainability,
architecture fitness), los evals puntúan claridad y rigor (intención funcional), y los archivos
`conventions/` de cada repo fijan el architecture fitness.

## Humano fuera, dentro o por encima del loop

Tres posturas de involucramiento humano, según cómo se relaciona el humano con el trabajo del agent:

- **Humano fuera del loop** (human outside the loop): totalmente autónomo, el agent entrega sin review.
  Raro, de alto riesgo.
- **Humano dentro del loop** (human in the loop): el humano revisa cada salida individual. Seguro, pero
  no escala: tu ritmo de review le pone techo al throughput del agent.
- **Humano por encima del loop** (human on the loop): el humano mantiene y mejora el *harness* (los guides,
  sensors, evals) en vez de inspeccionar cada salida. El harness revisa las salidas; el humano revisa el
  harness.

"Humanos por encima del loop" es la única postura que escala junto con el throughput del agent, y es la
postura para la que harness-kit fue diseñado. No se aprueba a mano la prosa de cada artefacto; se ajusta
la rubric una vez y la rubric juzga cada artefacto. Cuando el agent se desvía, se corrige el guide, no
la salida.

## Cómo lo materializa harness-kit

Cada stage de cada pipeline es un harness pequeño:

```
GUIDE     feedforward      how to write it          (guides/, templates/, examples/)
REF       context          what to pull in          (AGENTS.md, prior artifacts, conventions/)
SENSOR    deterministic    must-pass structure      (blocks approval, regex via sensor-runner.py)
EVAL      inferential      scored rubric            (LLM-judge, threshold 8.0, retry x3)
```

El artefacto solo avanza cuando el sensor pasa y el eval supera 8.0. Nada avanza por corazonada. Es la
misma división, computacional + inferencial, feedforward + feedback, aplicada a PRDs, PRPs, plans,
código, tests, PRs y (en el agent system-architect) System Design Docs.

La ganancia de escribir el harness en **markdown plano** (guides, sensors y evals son todos markdown;
solo el runner y los hooks son código) es que el harness queda legible y moldeable. Se puede leer
exactamente qué se va a verificar, y cambiarlo, sin tocar el modelo.

## Ver también

- [Guides](Guides): los controles feedforward
- [Sensors](Sensors): feedback determinístico
- [Evals](Evals): feedback inferencial
- [Pipeline y stages](Pipeline-and-Stages): cómo se arma un stage
- [Golden path](Golden-Path): el camino pavimentado a través de todos los stages

## Referencias

- Birgitta Böckeler, *Harness engineering for coding agent users*, martinfowler.com, 2026.
- Birgitta Böckeler, *Maintainability sensors for coding agents*, martinfowler.com, 2026.
- Martin Fowler, *Exploring Gen AI* (serie de ensayos).
