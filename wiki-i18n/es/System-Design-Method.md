# Método de System Design

La lente que aplica cada playbook de tema. Leerla antes de cualquier design puntual.

System design es una **cadena de decisiones bajo restricción**. Se decide qué ingerir, qué almacenar,
qué computar, qué servir. Cada stage elimina costo inútil y conserva señal útil. El mejor design no es
el que hace más cosas. Es el que elige mejor qué hacer.

## La forma de cualquier sistema

Casi todo sistema no trivial tiene cuatro capacidades más dos planos de apoyo.

| Capacidad | Ejemplo en search engine | General |
|---|---|---|
| Descubrir / ingerir | crawler | traer datos adentro (API, eventos, uploads, crawl) |
| Entender / modelar | parser, extractor | parsear, validar, enriquecer, normalizar |
| Organizar | inverted index | almacenar para query eficiente (index, schema, partición) |
| Servir | camino de query | responder solicitudes dentro de un budget de latency |

Planos de apoyo, presentes casi siempre:

- **Metadatos / política**: reglas, agendamiento, dedup, config, cuotas.
- **Observabilidad / control**: métricas, debugging, replay, backfill, listas de permitidos y bloqueados.

## Los tres pilares (Kleppmann, DDIA)

Todo design se evalúa contra ellos. Son la columna no funcional.

### Reliability
Funciona correctamente bajo falla: hardware que se rompe, bug de software, error humano. Hay que
diseñar *para* la falla, Werner Vogels: "everything fails all the time". Las herramientas son los
stability patterns (Nygard): timeouts, retries con backoff exponencial, circuit breakers, bulkheads,
idempotencia. Un sistema confiable asume que sus dependencias van a fallar y degrada a propósito, no
por accidente.

### Scalability
Aguanta el crecimiento de la carga. La disciplina: **definir los parámetros de carga primero** (QPS,
tamaño del payload, fan-out, razón lectura/escritura), y después describir la performance bajo esa
carga (p50/p95/p99, throughput). Conviene la escala horizontal sobre la vertical. Particionar por una
clave que evite hot spots. "Escalable" no es una propiedad del sistema; es la respuesta a "si la carga
crece X, ¿cuál es nuestro plan?"

### Maintainability
Operable, simple, evolucionable. John Ousterhout, en *A Philosophy of Software Design*: construir
**deep modules**, interfaces simples que esconden implementación significativa. La complejidad es el
enemigo; se acumula en dependencias y en oscuridad. La observabilidad es parte del design, no algo que
se piensa después.

## Números que todo ingeniero debería saber (Jeff Dean)

Sirven para las cuentas de servilleta. Orden de magnitud, no valor exacto.

| Operación | Tiempo |
|---|---|
| L1 cache reference | ~1 ns |
| Branch mispredict | ~5 ns |
| Main memory reference | ~100 ns |
| Compress 1 KB | ~2 us |
| SSD random read | ~16 us |
| Read 1 MB sequentially from memory | ~10 us |
| Read 1 MB sequentially from SSD | ~50 us |
| Round trip within same datacenter | ~0.5 ms |
| Read 1 MB sequentially from disk | ~5 ms |
| Disk seek | ~2 ms |
| Round trip CA to Netherlands | ~150 ms |

Cálculo de dimensionamiento, siempre a la vista:

```
QPS         = DAU x actions/day / 86400
peak QPS    = avg x (2 to 10)
storage     = records x bytes/record x replication x retention
bandwidth   = QPS x payload
```

Si no se puede hacer la cuenta, todavía no se entendió la escala.

## El método de 13 stages

Un SDD los recorre todos. El [template](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/templates/system-design.md)
refleja ese orden.

1. **Problema + contexto**: encuadre en una línea. Quién, qué escala, interno versus web-scale.
2. **Requisitos**: funcionales, más los no funcionales *con números* (SLO de latency, throughput,
   disponibilidad, modelo de consistencia, techo de costo).
3. **Modelo mental**: flujo de punta a punta, numerado o en mermaid. Ver el camino completo antes de
   cualquier componente.
4. **Arquitectura de alto nivel**: componentes + mermaid + los dos planos de apoyo.
5. **Deep dives**: los 2 o 3 componentes que cargan el riesgo: estructuras de datos, algoritmo,
   trade-off difícil. Aquí es donde staff se separa de senior.
6. **Datos + almacenamiento**: separar el store por función y patrón de acceso. KV/wide-column para
   updates aleatorios, object storage para blobs, search index para texto, relacional para
   transacciones. Conviene la inmutabilidad (Helland: eventos en lugar de estado mutable).
7. **Escala + particionamiento**: estrategia de sharding, replicación, rebalanceo. Un dueño por
   partición para la coordinación. Los workers stateless escalan solos; stateful necesita liderazgo +
   réplicas.
8. **Consistencia + falla**: elegir un modelo de consistencia con honestidad (eventual está bien si
   converge). Enumerar los modos de falla y cómo el design resiste cada uno. "¿Qué se rompe primero?"
9. **Observabilidad + ops**: métricas por stage; las herramientas de debugging que tienen que existir
   (inspeccionar el ciclo de vida de un registro, explicar el resultado de una solicitud).
10. **Seguridad + compliance**: almacenar la menor cantidad de datos, sandbox para input no confiable,
    sanitizar el parsing, respetar la política externa.
11. **Plan incremental**: rebanada vertical primero (probar punta a punta en alcance chico, reusar
    engines ya probados), después eficiencia/calidad, después escala real, después lo avanzado.
12. **Trade-offs**: cobertura versus calidad, frescura versus costo, recall versus latency,
    complejidad versus velocidad de entrega, centralizar versus particionar.
13. **Preguntas abiertas / design review**: qué debería interrogar un revisor.

## Disciplina de trade-off

Nunca hay que presentar una opción como obvia. Se nombra la alternativa, el eje, la elección:

> Elegí X sobre Y porque {eje} pesa más aquí, dado {restricción}.

Un design sin trade-off declarado es un design que escondió uno.

## Construir con pragmatismo

No hay que reinventar las partes difíciles si la diferenciación está en otro lado. Conviene usar un
engine ya probado (Lucene, Postgres, Kafka, una cola gestionada) para la capa llena de detalles
traicioneros, y gastar los trimestres en el pipeline y en la lógica que sí son la ventaja real. Se
reinventa solo la parte que es el producto.

## Consistencia, tiempo y ordenamiento

*Time, Clocks, and the Ordering of Events in a Distributed System* (1978), de Leslie Lamport, es la
raíz del razonamiento distribuido: en un sistema distribuido no existe un "ahora" global único; se
razona sobre ordenamiento *causal*, no sobre reloj de pared. Eso sostiene la consistencia eventual, los
vector clocks, y el motivo por el que "con usar timestamps alcanza" es una trampa (clock skew). *Life
Beyond Distributed Transactions*, de Helland, lleva la idea hasta la conclusión práctica: en escala se
renuncia al ACID entre entidades y se diseña alrededor de unidades independientes, idempotentes y
reconciliadas con el tiempo.

## El encuadre CAP y PACELC

Bajo una partición de red (P) se elige disponibilidad (A) o consistencia (C): CAP (Brewer). PACELC
agrega: *else* (E), cuando no hay partición, se cambia latency (L) por consistencia (C). La mayoría de
los designs reales son "AP bajo partición, y cambian latency por consistencia en operación normal".
Hay que decir en qué esquina se está y por qué; rara vez es todo o nada por sistema, es por operación.

## El canon

Se cita cuando afila el argumento.

| Persona | Idea | Fuente |
|---|---|---|
| Martin Kleppmann | reliability/scalability/maintainability; parámetros de carga antes que performance | DDIA (2017) |
| Jeff Dean, Sanjay Ghemawat | los números que todos saben; batch con forma de MapReduce | LADIS 2009; OSDI 2004 |
| Werner Vogels | diseñar para la falla; consistencia eventual en escala | Dynamo (SOSP 2007) |
| Pat Helland | inmutabilidad; vida más allá de las transacciones distribuidas | CIDR 2007; 2015 |
| Michael Nygard | circuit breaker, bulkhead, timeout, backoff | Release It! (2018) |
| John Ousterhout | deep modules, interfaces simples | PoSD (2018) |
| Leslie Lamport | ordenamiento causal, sin reloj global | CACM 1978 |
| Eric Brewer | teorema CAP | PODC 2000 |
| Sam Newman | fronteras de servicio a lo largo de la capacidad de negocio | Building Microservices |
| Gregor Hohpe | el ascensor del arquitecto: conectar el trade-off de la sala de máquinas con el interés del negocio | 2020 |

## La conexión con el harness

Este agent es, él mismo, un harness (Böckeler/Fowler). Guides = feedforward, sensors + evals =
feedback, humanos on the loop. La misma división de control que necesita el *design*: controles
computacionales (tests, linters, chequeo de schema) y controles inferenciales (review semántico). Los
dos, siempre.

## Referencias

- Martin Kleppmann, *Designing Data-Intensive Applications*, O'Reilly, 2017.
- Jeff Dean, *Designs, Lessons and Advice from Building Large Distributed Systems*, LADIS, 2009.
- Dean & Ghemawat, *MapReduce: Simplified Data Processing on Large Clusters*, OSDI, 2004.
- DeCandia et al., *Dynamo: Amazon's Highly Available Key-value Store*, SOSP, 2007.
- Pat Helland, *Life Beyond Distributed Transactions*, CIDR, 2007.
- Pat Helland, *Immutability Changes Everything*, ACM Queue, 2015.
- Michael Nygard, *Release It!*, 2nd ed., Pragmatic Bookshelf, 2018.
- John Ousterhout, *A Philosophy of Software Design*, 2018.
- Leslie Lamport, *Time, Clocks, and the Ordering of Events in a Distributed System*, CACM, 1978.
- Eric Brewer, *Towards Robust Distributed Systems* (CAP), PODC keynote, 2000.
- Birgitta Böckeler, *Harness engineering for coding agent users*, martinfowler.com, 2026.
