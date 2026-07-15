# Rate Limiter

> Serie System Design #2. Topic skill: `skills/rate-limiter/`.
> Diseñar rate limiting distribuido a escala, del algoritmo a la operación.

## 1. El problema y por qué engaña

De lejos, rate limiting parece "un contador con TTL en Redis". Eso resuelve una parte. No resuelve el
problema entero. Cuando el sistema crece, las preguntas que importan son más grandes que el algoritmo:

- ¿**Dónde** se aplica el límite, en el edge, el gateway, el servicio, o en todos?
- ¿**Cuál es la clave**: usuario, token, IP, tenant, endpoint, método, región?
- ¿El límite es **hard o soft**?
- ¿Qué pasa cuando el **almacenamiento** del rate limit **falla**: fail open o fail closed?
- ¿Cómo se frenan las **ráfagas abusivas** sin destruir el throughput legítimo?
- ¿Cómo se hace esto en **muchas réplicas** sin condiciones de carrera y sin un cuello de botella
  central?

La pregunta que ordena todo, la primera:

> **¿Qué estoy protegiendo exactamente, y cuánta imprecisión acepto para protegerlo sin destruir
> latency y simplicidad?**

Esa sola pregunta guía casi cada decisión de acá.

## 2. Por qué existe rate limiting (cinco objetivos a la vez)

1. **Proteger la capacidad finita** de un sistema.
2. **Equidad** entre clientes, tenants, usuarios.
3. **Reducir el radio de daño**: un cliente en loop, un deploy generando tráfico anómalo.
4. **Sostener modelos comerciales**: planes free / pro / enterprise.
5. **Controlar costo**: servicios que llaman dependencias caras (LLM, búsqueda, terceros).

Un buen diseño es un conjunto de **límites superpuestos** (global, tenant, usuario, endpoint,
seguridad por IP), no un contador único. **Primero la política, después Redis.**

## 3. Dónde aplicarlo (defensa en profundidad)

| Capa | Buena para | Tipo de límite | Salvedad |
|---|---|---|---|
| Edge / CDN | absorber abuso volumétrico, DDoS L7, bloquear temprano | grueso | le falta contexto de negocio rico |
| API Gateway | el lugar más común; por token/usuario/tenant/endpoint | API genérico | si se vuelve cuello de botella, lo siente toda la plataforma |
| Dentro del servicio | el límite depende del contexto de dominio (reporte caro, inferencia de LLM) | semántico / costo | lo más cerca de la verdad, lo más lejos del edge |

La arquitectura madura es **en capas**: edge para protección gruesa, gateway para límites genéricos de
API, servicio para límites semánticos y de costo. Cada capa atrapa lo que la capa de arriba no puede
ver. Es la misma idea de "defensa en profundidad" del apilamiento de seguridad.

## 4. La clave del límite

Elija la dimensión (o las dimensiones) de forma consciente: usuario, token, IP, tenant, endpoint,
método, región, muchas veces una composición. La elección de la clave define:

- **Cardinalidad**: cuántos contadores distintos existen, lo que marca la carga sobre el store y el
  riesgo de hot key.
- **Superficie de abuso**: un límite por IP es fácil de evadir detrás de NAT/proxy; un límite por
  token queda atado a la identidad.

Las claves compuestas (tenant + endpoint) localizan límites con precisión, pero multiplican la
cantidad de contadores.

## 5. Teoría, los algoritmos

Esta es la parte que todos nombran y pocos explican. Cada fila es una respuesta distinta a "¿cómo
contamos?".

### Fixed window counter
Cuenta requests en un balde fijo de reloj (por ejemplo, por minuto) y resetea en el corte. Barato, un
contador por clave. **Defecto: ráfaga de frontera.** Un cliente puede mandar una ventana llena a las
11:59:59 y otra ventana llena a las 12:00:00, ~2x la tasa pretendida cruzando la frontera.

### Sliding window log
Guarda un timestamp por request y cuenta los que caen dentro de la ventana hacia atrás. **Exacto y
justo.** Costo: memoria y CPU crecen con el tráfico, porque se conserva cada timestamp de la ventana.
Tranquilo con poco volumen, caro a escala.

### Sliding window counter
Aproxima la sliding window con dos baldes fijos (actual + anterior), ponderados por la fracción ya
transcurrida de la ventana actual:

```
estimate = current_count + previous_count * (1 - elapsed_fraction)
```

Suaviza la ráfaga de frontera, uno o dos contadores por clave, una sola operación atómica. Es el
compromiso habitual en producción entre lo barato de la fixed window y la exactitud del sliding log.

### Leaky bucket
Los requests entran en una cola que drena a tasa constante; lo que desborda se rechaza. Produce una
tasa de **salida** suave y constante, buena para moldear tráfico hacia un downstream que quiere flujo
estable.

### Token bucket  ← el default de la industria
Un balde guarda hasta `capacity` tokens. Los tokens se reponen a una `rate` constante. Cada request
consume un token; si el balde está vacío, rechaza (o encola). La propiedad clave: **separa la ráfaga
permitida (capacity) de la tasa sostenida (refill)**. Un cliente puede disparar hasta `capacity` de
golpe y después queda sujeto a `rate`. Esto coincide con cómo quieren comportarse las plataformas:
"puede tener un pico chico, pero su régimen permanente tiene techo."

```
on request:
  now = clock()
  tokens = min(capacity, tokens + (now - last_refill) * rate)
  last_refill = now
  if tokens >= 1: tokens -= 1; allow
  else: reject (429, Retry-After)
```

Token bucket es el algoritmo clásico de traffic shaping que viene de redes (ver Tanenbaum, *Computer
Networks*); es lo que exponen la mayoría de las plataformas de API y los proveedores de nube.

### Cómo elegir
Use **token bucket** por defecto cuando quiera tasa sostenida + ráfaga controlada; **sliding window
counter** cuando quiera un límite deslizante simple y casi exacto, con un chequeo por debajo del
milisegundo. Haga que el chequeo sea **atómico**: un script Lua en Redis ejecuta leer-decidir-escribir
en una sola operación del lado del servidor, así las réplicas concurrentes no compiten entre sí.

## 6. Estado y almacenamiento

- Balde/contador por clave en un store en memoria (Redis), **acotado por TTL** (por ejemplo, 2
  ventanas) para que las claves frías expiren y la memoria quede acotada.
- **Decisión atómica:** un solo script Lua hace refill/ponderación + chequeo + decremento en un round
  trip.
- **Config del límite** (clave a cuota/refill) en un servicio de configuración con un cache local
  corto, **recargable en caliente** sin redeploy.

## 7. Teoría, hot keys

Un tenant con tráfico desproporcionado concentra carga en un shard del store (una hot key).
Mitigaciones:

- **Presupuestos locales.** Cada nodo recibe una porción del presupuesto global y la decrementa
  localmente, reconciliando con el store central de forma periódica. Esto cambia exactitud (puede
  admitir de más hasta una porción de presupuesto por nodo) por una caída enorme en la presión sobre
  el store central. Es el "data on the outside, reconciled asynchronously" (datos por fuera,
  reconciliados de forma asíncrona) de Helland aplicado a contadores.
- **Límites compuestos** reparten un tenant entre subclaves (tenant+endpoint), así ningún contador
  queda caliente por sí solo.
- **Pre-chequeo local / prefiltro de token** antes de la llamada central: una clave que se está
  saturando se frena en el nodo antes de tocar el store compartido.
- **Shard del store por clave** (consistent hashing), para que las operaciones de una clave se queden
  en un solo shard.

## 8. Fail-open vs fail-closed

Cuando el store del rate limit falla, decida *de forma deliberada*.

- **Fail-open (permite):** protege el tráfico legítimo de una caída propia, pero pierde la protección
  durante la caída.
- **Fail-closed (deniega):** conserva la protección, pero convierte una caída del limiter en un
  incidente de disponibilidad.

La mayoría de las plataformas hacen **fail open** en el camino genérico y **fail closed** solo donde
el límite protege un techo duro de capacidad o de costo. Declare qué postura toma cada capa, y por
qué. Combínelo con un **circuit breaker** (Nygard) para que un store lento no le sume latency a cada
request: apenas se detecta que el store está insano, el limiter deja de llamarlo y aplica la postura
de fallback al instante.

## 9. Límites hard vs soft

Un límite **hard** rechaza (`429 Too Many Requests` + `Retry-After`). Un límite **soft** avisa,
degrada o encola, pero igual atiende. Los límites de costo y de equidad suelen ser soft con fricción
creciente; los de seguridad y capacidad son hard.

## 10. Multi-región

Una exactitud global estricta entre regiones exigiría un salto síncrono cross-region en cada request,
lo que destruye latency. El compromiso realista son **presupuestos regionales con reconciliación**:
cada región aplica una porción local del límite global y reconcilia de forma asíncrona. Se acepta una
sobre-admisión acotada (un límite global de N podría admitir por un momento un poco más que N) a
cambio de latency baja. Reserve el conteo global estricto para los pocos límites que de verdad lo
necesitan. Es el trade-off de CAP/PACELC hecho concreto: en operación normal, se cambia consistencia
por latency.

## 11. Shadow mode (la práctica de mayor apalancamiento)

Antes de aplicar un límite hard, córralo en **modo observación**: el sistema calcula la decisión de
bloqueo pero **no la aplica**, y emite lo que *habría* bloqueado. Esto atrapa políticas mal
configuradas antes de que causen un incidente: usted ve "este límite nuevo le habría dado 429 al 40%
del tráfico legítimo del tenant X" en un dashboard en vez de en una alerta a las 3 de la mañana.
Promueva un límite de shadow a enforce solo después de que las métricas del shadow se vean bien.

## 12. Observabilidad

Métricas esenciales:

- requests **permitidos** por política,
- requests **bloqueados** (429) por política y dimensión,
- **latency de la decisión**: el limiter tiene que sumar casi cero al camino del request,
- latency de las operaciones del store,
- eventos de fail-open,
- claves más throttled,
- conteos de would-block del shadow mode.

A las 3 de la mañana alguien tiene que poder responder: **¿qué límite se disparó, en qué dimensión,
estaba mal la política, hubo una regresión de tráfico?** Si el diseño no puede responder eso, no es
gobernable en operación, y "gobernable en operación" es la vara real, no un algoritmo lindo.

## 13. Modos de falla

| Falla | Impacto | Mitigación |
|---|---|---|
| Store caído | sin conteo central | postura elegida (fail-open por defecto) + presupuesto local de fallback + circuit breaker + alerta |
| Hot key satura un shard | pico de CPU en el shard, latency | prefiltro local + claves compuestas + presupuestos locales |
| Política mala publicada | 429 falsos masivos | shadow mode primero; rollback rápido de config; alerta de tasa de bloqueo por política |
| El limiter del gateway se vuelve el cuello de botella | latency en toda la plataforma | empuje los límites gruesos al edge, mantenga el chequeo del gateway en O(1) |

## 14. Plan incremental

1. **Rebanada vertical**: una capa de aplicación (gateway), fixed o sliding window, un solo Redis, una
   clave de límite, `429 + Retry-After`, métricas de allow/deny.
2. **Corrección / operación**: token bucket vía Lua atómico, fail-open + circuit breaker, shadow mode,
   config con hot-reload, métricas por política.
3. **Escala**: store con sharding, presupuestos locales + prefiltro para hot key, aplicación en capas
   (edge/gateway/servicio).
4. **Global**: presupuestos regionales con reconciliación, políticas compuestas, límites semánticos de
   costo/LLM en el servicio.

## 15. Trade-offs que hay que declarar explícitamente

Exactitud vs latency (conteo global exacto vs presupuesto local); fail-open vs fail-closed; store
central vs presupuestos locales; una clave de límite vs compuesta; aplicar ya vs shadow primero;
ubicación por capa (atrapar temprano en el edge vs contexto rico en el servicio).

## 16. Un ejemplo completo, ya llenado

El repo trae un SDD completo y llenado para un rate limiter distribuido (variante
sliding-window-counter, 200k QPS, presupuesto por debajo del milisegundo, fail-open) como el buen
ejemplo del agent:
[`good-system-design-example.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/examples/good-system-design-example.md).

## Referencias

- Andrew Tanenbaum, *Computer Networks*, traffic shaping con token bucket y leaky bucket.
- Martin Kleppmann, *Designing Data-Intensive Applications*, 2017, consistencia vs latency, aceptar
  imprecisión acotada.
- Michael Nygard, *Release It!*, 2a ed., 2018, circuit breaker, bulkhead, fail-fast como decisión de
  estabilidad.
- Werner Vogels / Amazon, diseñe para la falla (el store *va a* fallar).
- Pat Helland, *Life Beyond Distributed Transactions*, CIDR 2007, presupuestos locales como estado
  independiente, reconciliado de forma asíncrona.
- Eric Brewer, teorema CAP (PODC 2000); Abadi, PACELC (2012): el encuadre latency vs consistencia para
  presupuestos multi-región.
- Stripe Engineering, *Scaling your API with rate limiters*, token bucket en la práctica en producción.
- Docs de Redis, *Rate limiting with Redis* y `EVAL`/Lua para decisiones atómicas.
