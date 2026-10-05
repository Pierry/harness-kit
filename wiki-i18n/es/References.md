# Referencias

Cada fuente de esta página cambió algo en el código.

# El harness

Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (martinfowler.com), es la base: los guides son feedforward, los sensors son feedback, y ambos son computacionales (deterministas) o inferenciales (juicio del modelo). `Execution: computational | inferential` en cada sensor es esa taxonomía escrita al pie de la letra.

Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html) (martinfowler.com), nos costó tres commits. Primero, *"the agent reliably ignores sensor checks unless hardwired via hooks or extensions"*, y los guides en markdown por sí solos son *"quite unreliable"*. `code-conventions.md` le pedía al agent que corriera el linter; ahora [`code-maintainability`](Sensors) lo corre.

Segundo, su advertencia sobre *"a false sense of security and an illusion of quality"*. harness-kit había construido eso: sensors que se llamaban a sí mismos gates duras y deterministas sin revisar nada, y un log de calidad que registraba `passed` en cada corrida. De ahí salieron el exit 3 (`inferential`, nunca un pase) y el exit 2 (un sensor computacional sin check conectado está roto).

Tercero, los límites de complejidad (máximo de argumentos, largo de archivo, largo de función, complejidad ciclomática) *"weren't even active in ESLint's default preset"*. Con Ruff pasa lo mismo. Ahora están definidos en `pyproject.toml`, el CI los corre, y encontraron deuda real de inmediato. Su advertencia sobre la sobrecarga de feedback, *"sending it into a spiral of over-engineered refactorings"*, explica por qué la única violación encontrada es un ignore por archivo con nombre y con su motivo por escrito, en lugar de un refactor de código sin tests.

Fowler, [Agentic Programming](https://martinfowler.com/bliki/AgenticProgramming.html) (martinfowler.com): las personas dejan de escribir código y pasan a revisarlo, *"still responsible for what the software does"*. Por eso las dos gates humanas están donde están.

# Evals y el judge

Wataoka et al., [Self-Preference Bias in LLM-as-a-Judge](https://arxiv.org/abs/2410.21819), y Panickssery et al., [LLM Evaluators Recognize and Favor Their Own Generations](https://arxiv.org/abs/2404.13076), muestran que un judge califica la salida de su propia familia de modelos más alto que las personas; un evaluador nuevo no corrige esto. De ahí `/hk:eval jev`: Jev de [TypeSafe AI](https://typesafe.ai) es de otra familia, lo que reduce el sesgo sin eliminarlo.

[CheckEval](https://arxiv.org/abs/2403.18771) y [TICK](https://arxiv.org/abs/2410.03608) muestran que las checklists atómicas de sí o no aumentan el acuerdo entre judges. Por eso cada dimensión de la rubric ahora lleva líneas `- check:` y `- absent:` y su nota es la proporción de checks cumplidos.

Jung et al., [Trust or Escalate](https://arxiv.org/abs/2407.18370), explica por qué una corrida de Jev escala al evaluador Claude cuando las respuestas inciertas podrían cambiar el pase o la falla. La [guía de Jev 1.13](https://docs.typesafe.ai/model-jaggedness/jev-1.13) (un juicio por pregunta, nada de contar, filtrar estado) definió cómo se escriben los checks y por qué el artefacto se envía dividido por sección.

Husain, [Using LLM-as-a-Judge for evaluation](https://hamel.dev/blog/posts/llm-judge/) y [Your AI product needs evals](https://hamel.dev/blog/posts/evals/), sostiene que las escalas de 1 a 10 sin calibrar significan cosas distintas para cada evaluador y que la confianza viene del acuerdo medido con etiquetas humanas, unas 100 por modo de falla. harness-kit todavía no tiene etiquetas humanas; 8.0 es una convención, no un límite calibrado, como dice [pipeline-pattern.md](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md). El log `jev-judge.jsonl` empieza ese conjunto, y `eval-score.py` hace que la aritmética se calcule en lugar de juzgarse.

# Probar el propio harness

harness-kit ponía una gate a cada artefacto que producía y no tenía nada que lo controlara a él: ni tests, ni CI, ni linter. Una diferencia de una palabra en un encabezado desactivó cerca de 30 aserciones de sección en tres sensors y nadie lo notó. El test que lo detecta tiene cuatro líneas y corre sobre cada sensor, incluso los que todavía no existen. El harness necesita un harness.

# El canon de ingeniería (system-architect)

El [método de system design](System-Design-Method) se basa en Kleppmann (*Designing Data-Intensive Applications*), los números de latencia de Jeff Dean, Vogels sobre consistencia eventual, Helland sobre los datos de afuera y los de adentro, Nygard (*Release It!*) sobre patrones de estabilidad, y Ousterhout (*A Philosophy of Software Design*) sobre complejidad. Ellos dan forma a la rubric de design y a las diez preguntas de staff.

# Ver también

[Harness Engineering](Harness-Engineering), [Sensors](Sensors), [Evals](Evals), [Pipelines de los agents](Agent-Pipelines).
