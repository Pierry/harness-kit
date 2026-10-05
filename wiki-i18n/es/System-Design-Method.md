# Método de System Design

Cada playbook de tema aplica esta lente. Léela antes de cualquier design puntual.

System design es una cadena de decisiones bajo restricción: qué ingerir, qué almacenar, qué computar, qué servir. Cada stage recorta desperdicio y conserva señal. El mejor design elige bien qué hacer, y no hace más que eso.

# La forma de cualquier sistema

Casi todo sistema no trivial tiene cuatro capacidades.

| Capacidad | Ejemplo en search engine | General |
|---|---|---|
| Descubrir / ingerir | crawler | traer datos (API, eventos, uploads, crawl) |
| Entender / modelar | parser, extractor | parsear, validar, enriquecer, normalizar |
| Organizar | inverted index | almacenar para query eficiente (index, schema, partición) |
| Servir | camino de query | responder solicitudes dentro de un budget de latencia |

A su lado hay dos planos de apoyo. El plano de metadatos y política guarda reglas, agendamiento, dedup, config y cuotas. El plano de observabilidad y control guarda métricas, debugging, replay, backfill y listas de permitidos y bloqueados.

# Los tres pilares (Kleppmann, DDIA)

Evalúa cada design contra reliability, scalability y maintainability. Son la columna no funcional.

Reliability significa que el sistema funciona correctamente ante fallas de hardware, bugs de software y errores humanos. Werner Vogels: "everything fails all the time". Las herramientas son los stability patterns de Nygard: timeouts, retries con backoff exponencial, circuit breakers, bulkheads, idempotencia. Un sistema confiable asume que sus dependencias fallan y se degrada a propósito.

Scalability significa aguantar el crecimiento de la carga. Define primero los parámetros de carga (QPS, tamaño del payload, fan-out, razón lectura/escritura), y después describe la performance bajo esa carga (p50, p95, p99, throughput). Prefiere la escala horizontal y particiona por una clave que evite hot spots. Una afirmación de escalabilidad es la respuesta a "si la carga crece X, cuál es el plan".

Maintainability significa operable, simple y evolucionable. *A Philosophy of Software Design* de Ousterhout pide deep modules: interfaces simples sobre una implementación significativa. La complejidad se acumula en las dependencias y en la oscuridad. La observabilidad es parte del design desde el inicio.

# Números que todo ingeniero debería conocer (Jeff Dean)

Úsalos para cuentas rápidas. Son órdenes de magnitud.

| Operación | Tiempo |
|---|---|
| Referencia a cache L1 | ~1 ns |
| Predicción de branch fallida | ~5 ns |
| Referencia a memoria principal | ~100 ns |
| Comprimir 1 KB | ~2 us |
| Lectura aleatoria en SSD | ~16 us |
| Leer 1 MB secuencial de memoria | ~10 us |
| Leer 1 MB secuencial de SSD | ~50 us |
| Ida y vuelta dentro del mismo datacenter | ~0.5 ms |
| Leer 1 MB secuencial de disco | ~5 ms |
| Seek de disco | ~2 ms |
| Ida y vuelta de California a Países Bajos | ~150 ms |

Muestra siempre la cuenta de dimensionamiento. Si no puedes hacerla, todavía no entiendes la escala.

```
QPS         = DAU x actions/day / 86400
peak QPS    = avg x (2 to 10)
storage     = records x bytes/record x replication x retention
bandwidth   = QPS x payload
```

# El método de 13 stages

Un System Design Doc recorre estos stages, y el [template](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/templates/system-design.md) los refleja.

| Stage | Qué cubre |
|---|---|
| 1. Problema y contexto | Encuadre en una línea: quién, escala, interno o web-scale. |
| 2. Requisitos | Funcionales, más no funcionales con números: SLO de latencia, throughput, disponibilidad, modelo de consistencia, techo de costo. |
| 3. Modelo mental | Flujo de punta a punta como diagrama mermaid. Ver el camino completo antes de cualquier componente. |
| 4. Arquitectura de alto nivel | Componentes, mermaid y los dos planos de apoyo. |
| 5. Deep dives | Los 2 o 3 componentes que cargan el riesgo: estructuras de datos, algoritmo, trade-off difícil. Acá el trabajo staff se separa del senior. |
| 6. Datos y almacenamiento | Separar stores por función y patrón de acceso: KV o wide-column para updates aleatorios, object storage para blobs, search index para texto, relacional para transacciones. Favorecer la inmutabilidad (Helland: eventos sobre estado mutable). |
| 7. Escala y particionamiento | Sharding, replicación, rebalanceo. Un dueño por partición para coordinar. Los workers sin estado escalan solos; los que tienen estado necesitan liderazgo y réplicas. |
| 8. Consistencia y falla | Elegir un modelo de consistencia con honestidad (eventual está bien si converge). Enumerar los modos de falla, cómo los resiste el design y qué se rompe primero. |
| 9. Observabilidad y operación | Métricas por stage, más las herramientas de debugging que tienen que existir: inspeccionar el ciclo de vida de un registro, explicar el resultado de una solicitud. |
| 10. Seguridad y cumplimiento | Guardar el mínimo de datos, aislar la entrada no confiable, sanear el parseo, respetar las políticas externas. |
| 11. Plan incremental | Primero un corte vertical sobre un alcance chico con motores probados, después eficiencia y calidad, después escala real, después lo avanzado. |
| 12. Trade-offs | Cobertura vs calidad, frescura vs costo, recall vs latencia, complejidad vs velocidad de entrega, centralizar vs particionar. |
| 13. Preguntas abiertas | Lo que un revisor de design debería interrogar. |

# Disciplina de trade-off

Nunca presentes una opción como obvia. Nombra la alternativa, el eje y la elección:

> Elegí X sobre Y porque {eje} pesa más acá, dada {restricción}.

Un design sin trade-off declarado escondió uno.

# Construir con pragmatismo

Usa un motor probado (Lucene, Postgres, Kafka, una cola gestionada) para la capa llena de detalles traicioneros, e invierte tus trimestres en el pipeline y la lógica que son tu ventaja. Reinventa solo la parte que es el producto.

# Consistencia, tiempo y orden

*Time, Clocks, and the Ordering of Events in a Distributed System* (1978) de Lamport es la raíz del razonamiento distribuido. Un sistema distribuido no tiene un "ahora" global único, así que razonas sobre el orden causal en lugar del orden del reloj de pared. Esto sostiene la consistencia eventual y los vector clocks, y es la razón por la que confiar en timestamps es una trampa (clock skew).

*Life Beyond Distributed Transactions* de Helland saca la conclusión práctica. A escala renuncias a ACID entre entidades y diseñas alrededor de unidades independientes e idempotentes que se reconcilian con el tiempo.

# CAP y PACELC

Ante una partición de red (P) eliges disponibilidad (A) o consistencia (C): el CAP de Brewer. PACELC agrega que, en otro caso (E), sin partición, cambias latencia (L) por consistencia (C). La mayoría de los designs reales son AP ante una partición y cambian latencia por consistencia en operación normal. Di en qué esquina estás y por qué, por operación y no por sistema.

# El canon

Cítalos cuando afilen un punto.

| Persona | Idea | Fuente |
|---|---|---|
| Martin Kleppmann | reliability/scalability/maintainability; parámetros de carga antes que performance | DDIA (2017) |
| Jeff Dean, Sanjay Ghemawat | los números que todos conocen; batch con forma de MapReduce | LADIS 2009; OSDI 2004 |
| Werner Vogels | diseñar para la falla; consistencia eventual a escala | Dynamo (SOSP 2007) |
| Pat Helland | inmutabilidad; la vida más allá de las transacciones distribuidas | CIDR 2007; 2015 |
| Michael Nygard | circuit breaker, bulkhead, timeout, backoff | Release It! (2018) |
| John Ousterhout | deep modules, interfaces simples | PoSD (2018) |
| Leslie Lamport | orden causal, sin reloj global | CACM 1978 |
| Eric Brewer | teorema CAP | PODC 2000 |
| Sam Newman | límites de servicio según capacidad de negocio | Building Microservices |
| Gregor Hohpe | el ascensor del arquitecto: conectar el trade-off de la sala de máquinas con lo que está en juego para el negocio | 2020 |

# La conexión con el harness

El agent system-architect es él mismo un harness (Böckeler/Fowler): los guides son feedforward, los sensors y evals son feedback, y las personas quedan sobre el loop. Un design necesita la misma división. Los controles computacionales (tests, linters, checks de schema) y los inferenciales (review semántica) corren juntos. Ver [Harness Engineering](Harness-Engineering) y [Evals](Evals).

# Referencias

| Autor | Obra | Publicación |
|---|---|---|
| Martin Kleppmann | *Designing Data-Intensive Applications* | O'Reilly, 2017 |
| Jeff Dean | *Designs, Lessons and Advice from Building Large Distributed Systems* | LADIS, 2009 |
| Dean, Ghemawat | *MapReduce: Simplified Data Processing on Large Clusters* | OSDI, 2004 |
| DeCandia et al. | *Dynamo: Amazon's Highly Available Key-value Store* | SOSP, 2007 |
| Pat Helland | *Life Beyond Distributed Transactions* | CIDR, 2007 |
| Pat Helland | *Immutability Changes Everything* | ACM Queue, 2015 |
| Michael Nygard | *Release It!*, 2nd ed. | Pragmatic Bookshelf, 2018 |
| John Ousterhout | *A Philosophy of Software Design* | 2018 |
| Leslie Lamport | *Time, Clocks, and the Ordering of Events in a Distributed System* | CACM, 1978 |
| Eric Brewer | *Towards Robust Distributed Systems* (keynote de CAP) | PODC, 2000 |
| Birgitta Böckeler | *Harness engineering for coding agent users* | martinfowler.com, 2026 |
