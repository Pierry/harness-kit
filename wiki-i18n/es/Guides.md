# Guides (controles de feedforward)

Los guides orientan al agent **antes** de que actúe. Son la mitad feedforward del harness: anticipar lo
que el agent va a hacer y darle forma de entrada, para que haga lo correcto a la primera. En harness-kit,
los guides son markdown plano dentro del directorio `guides/` de cada agent.

## Por qué importa el feedforward

El feedback (sensors, evals) detecta el error una vez cometido y cuesta un retry. El feedforward lo
evita. Un buen guide saca trabajo del costoso loop de feedback y lo convierte en una instrucción barata,
dada al inicio. Si un artefacto falla siempre en la misma dimensión del eval, la solución rara vez es un
eval más estricto, es un guide mejor.

## Tipos de guide en harness-kit

| Guide | Rol |
|---|---|
| `pipeline.md` | las reglas de operación de un agent: stages, política de retry, markers de aprobación, contabilidad de tokens |
| `writing-style.md` | voz, palabras prohibidas, puntuación, cuándo usar tablas en vez de bullets, mermaid en vez de ASCII |
| `*-guidelines.md` | reglas específicas por artefacto (ej.: `prd-guidelines.md`, `prp-guidelines.md`) |
| `templates/*.md` | el esqueleto exacto que el artefacto debe llenar |
| `examples/good-*.md` | un artefacto de alta calidad, ya resuelto, que el agent imita |
| `design-method.md` (system-architect) | el método y el canon con los que razona el agent |
| `conventions-override.md` (SSE) | cómo las conventions de cada repo se superponen a los defaults del agent |

## Los templates y los examples también son guides

Una template es el control de feedforward más fuerte que existe: convierte la estructura deseada en el
camino de menor resistencia. El agent llena un esqueleto en vez de inventar una forma. Súmale un **buen
ejemplo**, un artefacto concreto, ya resuelto, escrito según el estándar, y el agent tiene la forma y
además la textura de un buen resultado. harness-kit incluye, por ejemplo, `good-prd-example.md`,
`good-prp-example.md` y `good-system-design-example.md`.

> **¿Por qué prosa natural en templates/examples y caveman en el resto?** Los guides internos, los
> sensors y los evals se escriben telegráficos ("caveman") para ahorrar tokens de input. Pero los
> templates y los examples son prosa de *artefacto* de referencia, la leen stakeholders externos, así que
> quedan en inglés natural. Le enseñan al agent cómo se lee un buen resultado.

## Conventions: el feedforward que se sobrescribe por repo

El agent staff-software-engineer trae defaults por disciplina. Un repo consumidor los sobrescribe
dejando archivos en `.claude/conventions/`:

```
{your-repo}/.claude/conventions/{backend,web,mobile,devops}.md
```

Cuando el archivo existe, el agent lo lee por encima de sus defaults y **gana el proyecto**. Es la
"pavimentación por disciplina" del [golden path](Golden-Path): un carril afinado por disciplina,
expresado como feedforward que el equipo controla. También es un control de **architecture fitness**, las
conventions fijan la forma a la que el código debe ajustarse.

## Voz y palabras prohibidas

`writing-style.md` es un control de feedforward contra el relleno de la IA. Prohíbe las delatoras de siempre
(delve, leverage, utilize, robust, "in today's fast-paced world"), prohíbe las rayas de diálogo, exige
mermaid en vez de ASCII y empuja la especificidad (números reales, nombres reales, citas reales) por
encima de la prosa genérica. La dimensión de eval correspondiente puntúa la voz, así que el guide y el
eval se refuerzan mutuamente.

## Cómo escribir un buen guide

- **Sé concreto.** "Arranca por la decisión, después el motivo" vale más que "escribe con claridad".
- **Muestra, no solo expliques.** Un par bueno/malo de dos líneas enseña más rápido que un párrafo de reglas.
- **Haz fácil lo correcto.** Una template que el agent llena vale más que diez reglas en prosa.
- **Optimiza el mensaje de falla para el turno siguiente.** Si un sensor cita el guide en su feedback,
  redáctalo para que el agent pueda actuar directo sobre él.
- **Lleva las fallas repetidas río arriba.** Cuando la misma dimensión del eval insiste en puntuar bajo,
  escribe o afila el guide en vez de apretar la gate.

## Ver también

- [Ingeniería de harness](Harness-Engineering): feedforward vs feedback
- [Sensors](Sensors) y [Evals](Evals): la mitad de feedback cuya carga alivian los guides
