# Referencias

La literatura sobre la que está construido harness-kit, y lo que cada fuente cambió de verdad acá. Las
fuentes que solo confirmaron lo que ya hacíamos no merecen un renglón; estas son las que nos costaron un
commit.

## El harness

**Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)**
(martinfowler.com). La base. Los guides son **feedforward**, orientan al agent antes de que actúe. Los
sensors son **feedback**, observan después y le permiten corregirse solo. Ambos vienen en dos tipos de
ejecución: **computacional** (determinista, corre en CPU, barato para cada cambio) e **inferencial**
(necesita el juicio de un modelo). El pipeline entero tiene esa forma, y el
`Execution: computational | inferential` en cada sensor es esa taxonomía llevada al pie de la letra.

**Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html)**
(martinfowler.com). La continuación, y el artículo más caro de esta página.

Tres hallazgos aterrizaron directo en el código:

1. *"The agent reliably ignores sensor checks unless hardwired via hooks or extensions"* (el agent ignora
   de manera confiable las verificaciones de los sensors, salvo que estén cableadas vía hooks o
   extensiones), y los guides en markdown, por sí solos, son **"quite unreliable"** (bastante poco
   confiables). `code-conventions.md` era un archivo markdown que le pedía amablemente al agent que
   corriera el linter. [`code-maintainability`](Sensors) ahora lo corre.
2. La advertencia sobre *"a false sense of security and an illusion of quality"* (una falsa sensación de
   seguridad y una ilusión de calidad). Habíamos construido exactamente eso: sensors que se declaraban
   gates duras y deterministas mientras no verificaban nada, y un log de calidad que los registraba como
   `passed` en cada corrida. De ahí el exit 3 (`inferential`, nunca es un pass) y el exit 2 (un sensor
   computacional que no cablea ninguna verificación está roto, no pasando).
3. Los límites que acotan la complejidad, cantidad máxima de argumentos por función, largo de archivo,
   largo de función, complejidad ciclomática, *"weren't even active in ESLint's default preset, I had to
   configure maximums for them first"* (ni siquiera estaban activos en el preset default de ESLint, tuve
   que configurar los máximos primero). Con ruff pasa lo mismo. Ya están configurados en
   `pyproject.toml`, y CI los corre. Eso encontró deuda real de inmediato.

Su advertencia sobre la **sobrecarga de feedback**, *"sending it into a spiral of over-engineered
refactorings"* (mandándolo a una espiral de refactorizaciones sobre-ingenierizadas), es la razón de que
la única violación de complejidad que encontramos sea un ignore nombrado por archivo, con el motivo
escrito, en vez de una refactorización de código sin tests para satisfacer una regla agregada ayer.

**Fowler, [Agentic Programming](https://martinfowler.com/bliki/AgenticProgramming.html)**
(martinfowler.com). Le pone nombre al giro que el pipeline da por sentado: los humanos dejan de tipear
código y pasan a revisarlo, *"still responsible for what the software does"* (todavía responsables de lo
que el software hace), pero a través de *"code review, examining test results, and reviewing outputs from
other sensors"* (code review, examinar resultados de tests y revisar las salidas de otros sensors).
Harness engineering es la habilidad central. Este es el argumento de por qué las dos gates humanas están donde están.

## Los evals y el judge

**Husain, [Using LLM-as-a-Judge for evaluation](https://hamel.dev/blog/posts/llm-judge/)** y
[Your AI product needs evals](https://hamel.dev/blog/posts/evals/). La crítica que le pega de lleno a
nuestras rubricas: las escalas de 1 a 10 sin calibrar las interpreta distinto cada evaluador, los juicios
binarios son más confiables, y lo que realmente importa es la **concordancia medida entre el judge y
etiquetas humanas**. harness-kit todavía no hace eso. Nuestro threshold de 8.0 es una convención, no una
frontera calibrada, y
[pipeline-pattern.md](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md)
lo dice en voz alta en vez de dar a entender que el puntaje es una medición.

**Panickssery et al., [Self-Preference Bias in LLM-as-a-Judge](https://arxiv.org/abs/2410.21819)**
(arXiv). Los judges LLM prefieren sistemáticamente el texto de su propia familia, siguiendo la
perplejidad: puntúan más alto lo que les resulta familiar de lo que lo harían los humanos. Despachar un
evaluador *nuevo*, que es lo que hacemos, elimina el contexto del autor, pero no esto. Un Claude nuevo
juzgando prosa de Claude sigue siendo auto-preferencia. Una mitigación honesta es otra familia de modelo o
etiquetas humanas; no tenemos ninguna de las dos todavía, y la wiki no debería aparentar lo contrario.

Estos dos juntos son la razón de que exista `eval-score.py`. No puede volver confiable el juicio, pero la
aritmética nunca fue una cuestión de juicio: lee los pesos de la rubrica y recalcula el total, así que, al
menos, el número se desprende de los puntajes.

## Probar el harness mismo

La lección más grande no necesita cita. harness-kit le ponía gate a cada artefacto que producía y no tenía
nada poniéndole gate a sí mismo: sin tests, sin CI, sin linter. Así fue como una diferencia de una palabra
en un heading desactivó unas 30 aserciones de sección en tres sensors y nadie se dio cuenta. El test que
lo habría atrapado el día cero tiene cuatro líneas, y hoy es genérico sobre todos los sensors, incluidos
los que todavía no se escribieron.

El harness necesita un harness.

## El canon de ingeniería (system-architect)

El [método de system design](System-Design-Method) toma de Kleppmann (*Designing Data-Intensive
Applications*), de los números de latencia de Jeff Dean, de Vogels sobre consistencia eventual, de Helland
sobre datos por fuera vs por dentro, de Nygard (*Release It!*) sobre patrones de estabilidad y de
Ousterhout (*A Philosophy of Software Design*) sobre complejidad. Todo eso alimenta la rubrica de diseño y
las diez preguntas de staff, no la mecánica del harness.

## Ver también

- [Ingeniería de harness](Harness-Engineering): la teoría, en profundidad
- [Sensors](Sensors) y [Evals](Evals): las dos mitades del feedback, tal como están implementadas
- [Pipelines de los agents](Agent-Pipelines): dónde se ubica cada gate en cada agent
