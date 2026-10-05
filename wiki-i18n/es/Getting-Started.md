# Primeros pasos

Esta página te lleva desde no tener nada instalado hasta un pull request mergeado. Cubre las cuatro formas de correr harness-kit: sin extras, con el judge Jev, con graph engineering, y con ambos. Todos los setups usan los mismos comandos; las opciones solo cambian lo que pasa dentro de algunos pasos.

# Por qué vale la pena

Un agent de IA escribe código rápido, y en la velocidad se esconden los errores caros: el problema nunca se escribió, nunca se definió qué es "terminado", el código ignora tus convenciones y la revisión fue un vistazo. harness-kit convierte cada uno de esos puntos en un paso que tiene que aprobarse antes de que empiece el siguiente, y los escribe por ti.

| Sin harness-kit | Con harness-kit |
|---|---|
| El ticket vive en tu cabeza o en un hilo de chat | Un PRD con el problema, los clientes y una métrica de éxito numérica |
| "Terminado" es lo que el agent decidió | Un PRP con criterios de aceptación que puedes revisar uno por uno |
| El agent edita lo que encuentra | Un plan que nombra los archivos y, con graph engineering, un gate que falla ante cualquier otro archivo |
| Revisar es leer un diff y esperar lo mejor | Cada documento puntuado contra una rubric, reintentado hasta que aprueba con 8.0 |
| Nadie recuerda por qué el código es así | Cada requisito vinculado al código que lo implementa y al test que lo comprueba |
| La calidad depende del día | Los mismos seis pasos cada vez, con un historial de puntajes que puedes seguir |

Pones tu atención en dos decisiones, si la dirección es correcta y si el PR está listo, en vez de escribir specs a mano y perseguir convenciones.

# Elige un setup

Puedes cambiar de opinión en cualquier momento con un comando, así que empieza con el default.

| Setup | Ideal para | Qué agrega | Qué necesita | Costo |
|---|---|---|---|---|
| Sin extras (default) | probarlo, equipos chicos, la mayoría de las features | el pipeline completo con gates | Claude Code, `python3`, `git`, `gh` | nada extra |
| Judge Jev | cuando quieres un judge que no sea Claude calificando a Claude | calidad puntuada por Jev, un modelo distinto, en menos de un segundo por documento; Claude toma el control cuando Jev duda | una API key de TypeSafe | unos $0.04 por millón de tokens |
| Graph engineering | codebases compartidos, trabajo regulado, todo lo que tengas que auditar después | ids de requisito, un archivo de trazabilidad en cada PR, un gate de alcance, vínculos que pasan a VALIDATED o STALE | nada extra (`manifest`); Python 3.12, una key gratuita de NVIDIA y `joern` para la base de datos de grafo (`full`) | gratis |
| Grafo y Jev | equipos que quieren un judge neutral y trazabilidad completa | ambos de arriba | ambos de arriba | unos $0.04 por millón de tokens |

# Instalación

Dentro de Claude Code:

```
/plugin marketplace add Pierry/harness-kit
/plugin install harness-kit@harness-kit
```

Reinicia Claude Code para que cargue el plugin. Abre el repositorio en el que quieres trabajar y corre:

```
/harness-kit:install
```

Copia los agents, comandos y hooks en `.claude/`, agrega `AGENTS.md` y `CLAUDE.md`, y hace dos preguntas. Respóndelas según tu setup.

| Pregunta | Sin extras | Judge Jev | Graph engineering | Grafo y Jev |
|---|---|---|---|---|
| Judge de eval | `local` | `jev` | `local` | `jev` |
| Graph engineering | `off` | `off` | `manifest` o `full` | `manifest` o `full` |

Reinicia Claude Code una vez más para que aparezcan los comandos. Tu propia barra de estado queda como estaba.

# Configura Jev (solo setups con Jev)

Crea una key en [console.typesafe.ai/keys](https://console.typesafe.ai/keys) y corre `/hk:eval jev`. Te pregunta si la key ya está en una variable de entorno o si quieres pegarla. Una key pegada va a `.claude/settings.local.json`, que git ignora; nunca termina en un archivo commiteado. Reinicia Claude Code si acabas de agregar la key. Revísala cuando quieras con `python3 .claude/scripts/hk-config.py get eval`.

# Configura el grafo (solo setups con grafo)

`/hk:graph manifest` no necesita nada más. Para la base de datos de grafo, corre `/hk:graph full` y después:

```
python3 .claude/scripts/graph.py setup
python3 .claude/scripts/graph.py index-code
python3 .claude/scripts/graph.py status
```

`/hk:graph full` pide una key gratuita de NVIDIA build en [build.nvidia.com](https://build.nvidia.com), que Graphiti usa para leer tus documentos de decisión; sin ella las capas de código y de trazabilidad siguen funcionando. `setup` crea un entorno virtual pequeño con FalkorDB embebido y Graphiti. `index-code` construye una vez el grafo de llamadas de tu código con Joern; en un repo grande tarda minutos. `status` muestra qué está listo y avisa si NVIDIA retiró un modelo configurado. Para cargar documentos de decisión, corre `python3 .claude/scripts/graph.py ingest docs/decisions/*.md`.

# Paso 1: escribe el brief

Un brief son cuatro líneas. Escríbelo después de `/golden-path`, o completa el [brief builder](https://pierry.github.io/harness-kit/brief/), que revisa cada campo y te da el prompt para pegar.

```
/golden-path

Squad: checkout
Problem: Returning guests abandon checkout when a card is declined once.
Hypothesis: If we add one-tap retry, completion rises 5 points.
Success metric: checkout completion, from 71% to 76% within 30 days
```

`/golden-path` se detiene para pedir tu aprobación después de cada paso. Si quieres que se detenga solo dos veces, usa `/pipeline:run "<idea>"`; primero reúne contexto del repo y se pausa en las mismas dos decisiones descritas en los pasos 2 y 6.

# Paso 2: el PRD y tu primera decisión

El agent product manager escribe `.claude/runtime/outputs/pm/prd/{feature_id}.md`: problema, clientes, alcance, métricas de éxito con línea base, rollout y riesgos. Un script revisa que cada sección esté. Después el eval lo puntúa en ocho dimensiones, cada una dividida en checks pequeños de sí o no, y por debajo de 8.0 el agent reescribe solo los checks que fallaron.

En los setups sin extras y con grafo lo puntúa un subagent nuevo de Claude. En los setups con Jev, Jev responde cada check en una llamada, y si sus respuestas dudosas pueden cambiar el resultado, decide un subagent de Claude. Lees el PRD y apruebas la dirección. Esta es la decisión que más pesa: un problema equivocado detectado aquí cuesta una reescritura, no una feature.

# Paso 3: el PRP

El agent convierte el PRD en una spec de ingeniería en `.claude/runtime/outputs/pm/prp/{feature_id}.md`, con los archivos a cambiar, los patrones a seguir, enlaces a la documentación de las librerías, comandos de validación y criterios de aceptación. Busca en tu código con semble, repowise o grep, lo que tengas.

Con graph engineering cada criterio de aceptación recibe un id estable como `REQ-001`, y se crea `trace/{feature_id}.yml` con esos requisitos. Desde aquí todo se basa en el id, no en el texto.

# Paso 4: el plan

El agent staff engineer escribe el plan: qué cambia, en qué archivos, en qué orden, con riesgos y casos de test.

Con graph engineering el plan primero asienta los archivos de trazabilidad anteriores, y los vínculos de features ya mergeadas pasan a VALIDATED o STALE. Después, por cada requisito, pide el conocimiento relacionado y los símbolos de código con más probabilidad de verse afectados, y registra cada elección como un vínculo PROPOSED con su evidencia y su confianza. La lista de esos archivos se vuelve el alcance: los únicos archivos que el siguiente paso puede cambiar. Con `full` también ve quién llama a cada símbolo, así el radio de impacto entra en los riesgos.

# Paso 5: dev

El agent implementa el plan en commits pequeños y corre tus linters y type checkers a través de los sensors del harness. Sigue tus convenciones de `.claude/conventions/` cuando las tienes.

Con graph engineering cada commit se registra como un vínculo IMPLEMENTS, y el hash del commit se verifica contra git antes de escribirlo. Antes de que termine el paso, el gate de alcance compara el diff con el plan. Un solo archivo fuera del alcance hace fallar el paso. Para cambiar un archivo que no estaba en el plan, el agent tiene que agregarlo con un motivo escrito, que después aparece en el resumen de dev para que lo veas.

# Paso 6: test, el PR y tu segunda decisión

El agent corre tu suite de tests e informa si pasa o falla, con las fallas por nombre. Con graph engineering cada test que comprueba un requisito se registra como VERIFIED_BY, y los requisitos sin test se listan como brechas.

Después prepara el pull request: título, resumen, plan de test y enlaces. Con graph engineering valida el archivo de trazabilidad, le hace commit y agrega una tabla de trazabilidad a la descripción del PR: cada requisito, el código que afecta, su estado y el test que lo comprueba. Apruebas, y el PR se abre como draft.

# Paso 7: merge

Un monitor vigila el PR y limpia el pipeline cuando se mergea. Empieza la siguiente feature con un brief nuevo. Con graph engineering el siguiente plan asienta los vínculos de esta feature, así lo que esta feature comprobó, y lo que los cambios posteriores rompieron, queda visible para la siguiente.

# Qué cambia entre los setups

| Paso | Sin extras | Judge Jev | Graph engineering | Grafo y Jev |
|---|---|---|---|---|
| Puntuación | subagent de Claude | Jev, Claude cuando duda | subagent de Claude | Jev, Claude cuando duda |
| PRP | criterios | criterios | criterios con ids `REQ`, archivo de trazabilidad | criterios con ids `REQ`, archivo de trazabilidad |
| Plan | archivos a cambiar | archivos a cambiar | vínculos con evidencia, los archivos se vuelven el alcance | vínculos con evidencia, los archivos se vuelven el alcance |
| Dev | convenciones y linters | convenciones y linters | más gate de alcance, vínculos IMPLEMENTS | más gate de alcance, vínculos IMPLEMENTS |
| Test | reporte | reporte | más vínculos VERIFIED_BY | más vínculos VERIFIED_BY |
| PR | resumen y plan de test | resumen y plan de test | más tabla de trazabilidad | más tabla de trazabilidad |

# Cambiar de opinión

`/hk:eval local` o `/hk:eval jev` cambia el judge. `/hk:graph off`, `manifest` o `full` cambia graph engineering; apagarlo deja intactos los archivos de trazabilidad que ya están en git. `/pipeline:continue` retoma una feature donde se detuvo, y `hk status` muestra dónde es eso.

# Adónde seguir

[Golden Path](Golden-Path) para cada desvío, [Evals](Evals) y [Jev y System One](Jev-and-System-One) para cómo funciona la puntuación, [Graph Engineering](Graph-Engineering) y [Teoría de grafos](Graph-Theory) para la trazabilidad y el grafo, y [Pipeline y stages](Pipeline-and-Stages) para lo que escribe cada paso.
