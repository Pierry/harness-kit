# Guides

Los guides orientan al agent antes de que actúe. Son la mitad feedforward del harness, markdown plano en el directorio `guides/` de cada agent. Sensors y evals detectan un error después y cuestan un retry; un guide lo previene. Cuando un artefacto falla una y otra vez el mismo check de eval, corrige el guide antes de endurecer el eval.

# Tipos de guide

| Guide | Rol |
|---|---|
| `pipeline.md` | las reglas de operación de un agent: stages, política de retry, markers de aprobación, contabilidad de tokens |
| `writing-style.md` | voz, palabras prohibidas, puntuación, tablas frente a bullets, mermaid en vez de ASCII (product-manager, system-architect) |
| `*-guidelines.md` | reglas del artefacto, como `prd-guidelines.md` y `prp-guidelines.md` |
| `templates/*.md` | el esqueleto que el artefacto llena |
| `examples/good-*.md` | un artefacto terminado escrito según el estándar |
| `design-method.md` | el método y el canon del agent system-architect |
| `coding-style.md`, `commit-style.md` | reglas de código y de commits para el agent staff-software-engineer |
| `conventions-override.md` | cómo las convenciones por repo se superponen a los defaults de SSE |
| `sdd-loop.md` | el loop guiado por spec y su predicado |

# Templates y ejemplos

Un template es el control feedforward más fuerte: el agent llena un esqueleto en vez de inventar una forma. Un buen ejemplo agrega la textura del trabajo terminado. harness-kit trae `good-prd-example.md`, `good-prp-example.md` y `good-system-design-example.md`.

Los guides, sensors y evals internos están escritos en estilo caveman escueto para ahorrar tokens de entrada. Templates y ejemplos se quedan en inglés natural porque modelan artefactos que leen los stakeholders.

# Convenciones por repo

El agent staff-software-engineer tiene defaults por disciplina. Un repo consumidor los sobrescribe con archivos aquí:

```
{your-repo}/.claude/conventions/{backend,web,mobile,devops}.md
```

Cuando un archivo existe, el agent lo lee encima de sus defaults y el proyecto gana. Esta es la pavimentación por disciplina del [golden path](Golden-Path), y fija la forma que el código debe respetar.

# Voz y palabras prohibidas

`writing-style.md` prohíbe las marcas comunes de texto de IA como `delve`, `leverage`, `utilize` y `robust`, prohíbe las rayas largas, exige mermaid en vez de ASCII y pide números, nombres y citas reales. Los evals aplican las mismas reglas en código: los regex `- absent:` de cada rubric hacen fallar un check ante una palabra prohibida, una raya larga o un diagrama de cajas en ASCII sin preguntarle al judge. Mira [Evals](Evals).

# Cómo escribir un buen guide

Sé concreto: "empieza por la decisión, después la razón" enseña más que "escribe con claridad". Acompaña cada regla con un ejemplo bueno y uno malo de dos líneas. Dale al agent un template para llenar en vez de diez reglas en prosa. Cuando el feedback de un sensor apunta a un guide, redacta el guide para que el agent pueda actuar sobre él en el siguiente turno.

Mira también [Harness Engineering](Harness-Engineering), [Sensores](Sensors), [Evals](Evals).
