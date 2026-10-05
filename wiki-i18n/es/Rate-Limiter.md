# Rate Limiter

Serie System Design #2. Topic skill: `skills/rate-limiter/`. Rate limiting distribuido a escala, del algoritmo a la operación.

# El problema

Rate limiting parece un contador con TTL en Redis. Eso cubre una parte. A escala, las preguntas difíciles están fuera del algoritmo: dónde se aplica el límite (edge, gateway, servicio, o todos), cuál es la clave (usuario, token, IP, tenant, endpoint, método, región), si el límite es hard o soft, si fallar abierto o cerrado cuando el store falla, cómo frenar ráfagas abusivas sin dañar el throughput legítimo, y cómo contar a través de muchas réplicas sin condiciones de carrera ni un cuello de botella central.

Empieza por nombrar qué proteges y cuánta imprecisión aceptas para protegerlo sin dañar la latency ni la simplicidad. Esa respuesta guía casi todas las decisiones de abajo.

# Por qué existe rate limiting

Un limitador cumple cinco objetivos a la vez. Protege la capacidad finita, mantiene la equidad entre clientes, tenants y usuarios, y reduce el radio de daño de un cliente en loop o de un deploy que genera tráfico anómalo. También sostiene planes comerciales (free, pro, enterprise) y pone techo al costo de servicios que llaman dependencias caras como LLMs, búsqueda o terceros.

Un buen diseño es un conjunto de límites superpuestos (global, tenant, usuario, endpoint, seguridad por IP), nunca un contador único. Primero la política, después Redis.

# Dónde aplicarlo

| Capa | Buena para | Tipo de límite | Salvedad |
|---|---|---|---|
| Edge / CDN | absorber abuso volumétrico, DDoS L7, bloquear temprano | grueso | le falta contexto de negocio rico |
| API Gateway | el lugar más común; por token/usuario/tenant/endpoint | API genérico | si se vuelve cuello de botella, lo siente toda la plataforma |
| Dentro del servicio | el límite depende del contexto de dominio (reporte caro, inferencia de LLM) | semántico / costo | lo más cerca de la verdad, lo más lejos del edge |

Las arquitecturas maduras apilan las tres: edge para protección gruesa, gateway para límites genéricos de API, servicio para límites semánticos y de costo. Cada capa atrapa lo que la de arriba no puede ver, la misma idea de defensa en profundidad del apilamiento de seguridad.

# La clave del límite

Elige las dimensiones a propósito, muchas veces como composición. La clave define la cardinalidad, es decir cuántos contadores distintos existen, y por eso marca la carga sobre el store y el riesgo de hot key. También define la superficie de abuso: un límite por IP es fácil de evadir detrás de NAT o proxies, mientras que un límite por token queda atado a la identidad. Las claves compuestas (tenant más endpoint) localizan los límites con precisión, pero multiplican la cantidad de contadores.

# Algoritmos

Cada algoritmo es una respuesta distinta a cómo contar.

Fixed window counter cuenta requests en un balde fijo de reloj (por ejemplo, por minuto) y resetea en el corte. Cuesta un contador por clave. Su defecto es la ráfaga de frontera: un cliente manda una ventana llena a las 11:59:59 y otra a las 12:00:00, cerca de 2x la tasa pretendida.

Sliding window log guarda un timestamp por request y cuenta los que caen dentro de la ventana hacia atrás. Es exacto y justo, pero la memoria y la CPU crecen con el tráfico. Sirve con poco volumen, es caro a escala.

Sliding window counter aproxima la sliding window con dos baldes fijos, el actual y el anterior, ponderados por la fracción transcurrida de la ventana actual. Suaviza la ráfaga de frontera con uno o dos contadores por clave y una sola operación atómica. Es el compromiso común en producción entre el costo de fixed window y la precisión de sliding log.

```
estimate = current_count + previous_count * (1 - elapsed_fraction)
```

Leaky bucket encola requests y los drena a una tasa constante, rechazando el desborde. Produce una tasa de salida suave y constante, buena para moldear tráfico hacia un downstream que quiere flujo estable.

Token bucket es el default de la industria. Un balde guarda hasta `capacity` tokens que se recargan a una `rate` constante; cada request toma un token, y un balde vacío rechaza o encola. Separa la ráfaga permitida (capacity) de la tasa sostenida (recarga): un cliente sube de golpe hasta `capacity` y después queda limitado a `rate`. Es el algoritmo clásico de traffic shaping de redes (Tanenbaum, *Computer Networks*) y el que exponen la mayoría de las plataformas de API y los proveedores cloud.

```
on request:
  now = clock()
  tokens = min(capacity, tokens + (now - last_refill) * rate)
  last_refill = now
  if tokens >= 1: tokens -= 1; allow
  else: reject (429, Retry-After)
```

Elige token bucket para una tasa sostenida con ráfaga controlada, y sliding window counter para un límite móvil casi exacto con un chequeo por debajo del ms. Haz el chequeo atómico: un script Lua en Redis ejecuta leer, decidir y escribir como una sola operación del lado del servidor, así las réplicas concurrentes no compiten entre sí.

# Estado y almacenamiento

Guarda el balde o contador de cada clave en un store en memoria (Redis) con TTL (por ejemplo 2 ventanas), así las claves frías expiran y la memoria queda acotada. Un solo script Lua hace la recarga o ponderación, el chequeo y el decremento en un solo round trip. La config de límites (clave a cuota y recarga) vive en un servicio de config con cache local corta y se recarga sin redeploy.

# Hot keys

Un tenant con tráfico desproporcionado concentra la carga en un shard del store. Aplican cuatro mitigaciones.

Los presupuestos locales le dan a cada nodo una porción del presupuesto global para decrementar localmente, reconciliando con el store central de forma periódica. Admites de más hasta una porción por nodo a cambio de una caída grande de la presión sobre el store central. Es el "data on the outside" de Helland, reconciliado de forma asíncrona, aplicado a contadores.

Los límites compuestos reparten un tenant en subclaves (tenant más endpoint) para que ningún contador se caliente. Un prechequeo local frena en el nodo una clave que satura antes de que toque el store compartido. Hacer sharding del store por clave con consistent hashing mantiene las operaciones de una clave en un solo shard.

# Fail-open vs fail-closed

Decide a propósito qué pasa cuando el store falla. Fail-open (permitir) protege el tráfico legítimo de tu propia caída, pero pierde la protección mientras dura. Fail-closed (denegar) mantiene la protección, pero convierte una caída del limitador en un incidente de disponibilidad.

La mayoría de las plataformas fallan abierto en el camino genérico y fallan cerrado solo donde el límite cuida un techo duro de capacidad o de costo. Declara la postura de cada capa y por qué. Combínala con un circuit breaker (Nygard): cuando el store no está sano, el limitador deja de llamarlo y aplica la postura de respaldo de inmediato, así un store lento no suma latency a cada request.

# Límites hard vs soft

Un límite hard rechaza con `429 Too Many Requests` y `Retry-After`. Un límite soft avisa, degrada o encola, y aun así atiende. Los límites de costo y equidad suelen ser soft con fricción creciente; los de seguridad y capacidad son hard.

# Multi-región

La precisión global estricta necesita un salto síncrono entre regiones en cada request, y eso destruye la latency. El compromiso realista son presupuestos regionales con reconciliación: cada región aplica una parte local del límite global y reconcilia de forma asíncrona. Un límite global de N puede admitir por un momento un poco más que N, a cambio de latency baja. Reserva el conteo global estricto para los pocos límites que lo necesitan. Es el trade-off de CAP/PACELC hecho concreto: en operación normal cambias consistencia por latency.

# Shadow mode

Antes de aplicar un límite hard, córrelo en modo observación. El sistema calcula la decisión de bloqueo, no la aplica, y emite lo que habría bloqueado. Ves "este límite nuevo habría devuelto 429 al 40% del tráfico legítimo del tenant X" en un dashboard en lugar de en una alerta a las 3am. Pasa un límite de shadow a enforce solo después de que las métricas de shadow se vean bien. De todas las prácticas de esta página, es la que más retorno da.

# Observabilidad

Mide requests permitidos por política, requests bloqueados (429) por política y dimensión, latency de decisión (el limitador debe sumar casi cero al camino del request), latency de operación del store, eventos de fail-open, claves más frenadas y conteos de would-block del shadow mode.

A las 3am alguien tiene que responder qué límite se disparó, en qué dimensión, si la política estaba mal y si el tráfico empeoró. Un diseño que no puede responder eso no es gobernable en operación, y esa es la vara.

# Modos de falla

| Falla | Impacto | Mitigación |
|---|---|---|
| Store caído | sin conteo central | postura elegida (fail-open por default) + presupuesto local de respaldo + circuit breaker + alerta |
| Hot key satura un shard | pico de CPU en el shard, latency | prefiltro local + claves compuestas + presupuestos locales |
| Se publica una política mala | 429 falsos masivos | shadow mode primero; rollback rápido de config; alerta de tasa de bloqueo por política |
| El limitador del gateway se vuelve el cuello de botella | latency en toda la plataforma | llevar los límites gruesos al edge, mantener el chequeo del gateway en O(1) |

# Plan incremental

| Fase | Alcance |
|---|---|
| Vertical slice | Una capa de aplicación (gateway), fixed o sliding window, un solo Redis, una clave de límite, `429 + Retry-After`, métricas de allow/deny. |
| Corrección y operación | Token bucket con Lua atómico, fail-open + circuit breaker, shadow mode, config con recarga en caliente, métricas por política. |
| Escala | Store con sharding, presupuestos locales + prefiltro para hot keys, aplicación en capas (edge, gateway, servicio). |
| Global | Presupuestos regionales con reconciliación, políticas compuestas, límites semánticos de costo y de LLM en el servicio. |

# Trade-offs que hay que declarar

Declara cada uno en el diseño: precisión vs latency (conteo global exacto vs presupuesto local), fail-open vs fail-closed, store central vs presupuestos locales, una clave de límite vs compuesta, aplicar ya vs shadow primero, y ubicación por capa (atrapar temprano en el edge vs contexto rico en el servicio).

# Ejemplo completo

El repo trae un SDD completo y llenado para un rate limiter distribuido como el buen ejemplo del agent: sliding window counter, 200k QPS, menos de 1 ms de latency agregada, fail-open. Mira [`good-system-design-example.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/examples/good-system-design-example.md). El método general vive en [Método de System Design](System-Design-Method).

# Referencias

| Autor | Obra | Usado para |
|---|---|---|
| Andrew Tanenbaum | *Computer Networks* | traffic shaping con token bucket y leaky bucket |
| Martin Kleppmann | *Designing Data-Intensive Applications*, 2017 | consistencia vs latency, aceptar imprecisión acotada |
| Michael Nygard | *Release It!*, 2a ed., 2018 | circuit breaker, bulkhead, fail-fast como decisión de estabilidad |
| Werner Vogels / Amazon | design for failure | el store va a fallar |
| Pat Helland | *Life Beyond Distributed Transactions*, CIDR 2007 | presupuestos locales como estado independiente, reconciliado de forma asíncrona |
| Eric Brewer; Daniel Abadi | CAP (PODC 2000); PACELC (2012) | encuadre latency vs consistencia para presupuestos multi-región |
| Stripe Engineering | *Scaling your API with rate limiters* | token bucket en la práctica en producción |
| Docs de Redis | *Rate limiting with Redis*, `EVAL`/Lua | decisiones atómicas |
