# Graph Engineering

Graph engineering evita que el agent adivine. Antes de editar, cada requisito recibe un id estable, cada símbolo de código que el cambio podría tocar se vuelve un vínculo con su evidencia, y la lista de esos símbolos es el único alcance que el agent puede tocar. Después del merge, los vínculos que un test comprueba pasan a VALIDATED y aquellos cuyo símbolo se movió pasan a STALE, así la siguiente feature parte de lo que esta dejó. El método viene del artículo Graph Engineering #1 de Pierry Borges, escrito después de que un grafo de conocimiento con 19,262 nodos respondiera nada a cada pregunta porque quien lo escribía y quien lo leía nunca acordaron un contrato.

# Tres modos

Eliges uno por proyecto con `/hk:graph`, y el instalador lo pregunta una vez. `off` es el default y deja el pipeline tal como está. `manifest` activa la trazabilidad sin infraestructura y sin key. `full` agrega encima una base de datos de grafo, embebida en el proyecto, sin Docker y sin servidor.

| Modo | Qué obtienes | Qué necesita |
|---|---|---|
| `off` | el pipeline sin cambios | nada |
| `manifest` | ids de requisito, `trace/{feature}.yml`, gate de alcance, estado de vínculos | `python3`, `git` |
| `full` | manifest más un grafo FalkorDB alimentado por Graphiti y el CPG de Joern | Python 3.12, una key gratuita de NVIDIA build para Graphiti, `joern` para la capa de código |

# El manifest

`trace/{feature_id}.yml` está en la raíz del repo y viaja con el PR. Lista los requisitos, el alcance y los vínculos. Solo `.claude/scripts/trace.py` lo escribe, así cada escritura pasa por la ontología y la verificación de commits. El archivo es la verdad. En modo full el grafo es una proyección de él, y si el grafo se pierde, `graph.py sync` y `graph.py index-code` lo reconstruyen desde git.

```yaml
- from: REQ-001
  to: "src/ship.py::validate_weight"
  type: AFFECTS
  status: VALIDATED
  confidence: 0.8
  methods: [semble, cpg_callers]
  evidence:
    semble: intent match on weight validation
  commit: c6e4aa80711b
  recorded: 2026-10-05
```

El hash de un commit se resuelve contra git cuando se escribe el vínculo, y un hash que git no encuentra se rechaza. Esa es la verificación que dieciséis hashes de commit inventados en un mapa de ownership nunca tuvieron que pasar, y por eso el post de origen la volvió obligatoria.

# Estado de los vínculos

PROPOSED significa que el plan cree que el requisito toca el símbolo. VALIDATED significa que el cambio se mergeó y un test vinculado con VERIFIED_BY lo comprueba. STALE significa que el símbolo ya no existe o se movió, así que no se puede confiar en el vínculo. `trace.py settle --all` corre al inicio de cada plan, así el estado avanza con la siguiente rama y el harness nunca hace commit en main por su cuenta.

# La ontología

`.claude/graph/ontology.yml` dice qué tipos de nodo existen y qué aristas son válidas: AFFECTS de un requisito a un método, IMPLEMENTS de un método a un requisito, VERIFIED_BY de un requisito a un test, cada una con sus campos obligatorios. Es un archivo para que los cambios lleguen como pull requests. Cópialo a tu repo para extenderlo, y agrega un tipo solo cuando un documento real o código real lo pida.

# A lo largo del pipeline

El PRP escribe cada criterio de éxito como `- [ ] REQ-001: ...`, con ids de atomize cuando ese skill está instalado, y `trace.py init` crea el manifest. El plan asienta los manifests anteriores, le pide a la interfaz del grafo conocimiento y símbolos relacionados por requisito, registra cada elección con `trace.py propose` y usa `trace.py scope` como su lista de archivos a tocar. Dev registra IMPLEMENTS después de cada commit y corre `trace.py gate`, que hace fallar el stage cuando algún archivo cambió fuera del alcance; ampliar el alcance requiere `trace.py scope --add` con un motivo que aparece en el resumen de dev. Test registra VERIFIED_BY por cada test que comprueba un requisito. El PR corre `trace.py validate`, hace commit del manifest y pega `trace.py summary` en la descripción.

# Una interfaz

El agent hace cuatro preguntas y nunca sabe qué las responde.

```
python3 .claude/scripts/graph.py knowledge "<text>"
python3 .claude/scripts/graph.py symbols "<intent>"
python3 .claude/scripts/graph.py tests <file[::symbol]>
python3 .claude/scripts/graph.py history <file>
```

En modo manifest las respuestas vienen de manifests anteriores, git, semble y repowise. En modo full las mismas llamadas también leen el grafo: hechos de Graphiti para el conocimiento, callers del CPG para símbolos y tests. Nada en los stages cambia entre los dos.

# Modo full

El grafo es FalkorDB embebido a través de `falkordblite`, guardado en `.claude/runtime/graph/kg.db` e ignorado por git. Un solo writer es dueño de cada capa: Graphiti escribe conocimiento a partir de documentos no estructurados que se pasan a `graph.py ingest`, `graph.py index-code` escribe la capa de código a partir de un CPG de Joern, y `graph.py sync` proyecta los manifests. Los manifests y el CPG se cargan con parsers, nunca con un modelo, porque un parser ya conoce la respuesta y un modelo inventaría alguna.

Graphiti corre sobre modelos de NVIDIA build a través del endpoint compatible con OpenAI, en el plan gratuito. Los defaults son `nvidia/nemotron-3-super-120b-a12b` para extracción, que devolvió JSON válido 4 de 4 veces en 2.5 a 4.6 segundos según la medición del 2026-10-05, y `nvidia/nemotron-3-embed-1b` para embeddings. NVIDIA retira modelos sin aviso, así que `graph.py status` verifica ambos contra el catálogo en vivo. Puedes cambiarlos con `HK_GRAPH_LLM_MODEL` y `HK_GRAPH_EMBED_MODEL`.

```
python3 .claude/scripts/graph.py setup
python3 .claude/scripts/graph.py index-code
python3 .claude/scripts/graph.py sync
python3 .claude/scripts/graph.py ingest docs/decisions/weight-limit.md
python3 .claude/scripts/graph.py status
```

Para Java con Lombok, `index-code` pasa `--fetch-dependencies --delombok-mode no-delombok` al frontend de Joern. Sin ellos, el proyecto de origen tuvo 4,351 de 4,890 archivos omitidos y un grafo de 188 KB que parecía plausible. Cuenta lo que contiene el CPG; no confíes en su tamaño.

# Costo

El modo manifest cuesta milisegundos por llamada y nada más. En modo full el CPG se construye una vez por repo y se reconstruye cuando queda atrás del último merge, y Graphiti solo corre sobre documentos nuevos. El grafo acota lo que va al modelo; nunca llena el contexto.

# Referencias

[Graphiti](https://github.com/getzep/graphiti), [FalkorDB](https://github.com/FalkorDB/FalkorDB), [falkordblite](https://pypi.org/project/falkordblite/), [Joern](https://github.com/joernio/joern), [semble](https://github.com/MinishLab/semble), [NVIDIA build](https://build.nvidia.com). Gotel y Finkelstein, An Analysis of the Requirements Traceability Problem, RE 1994. Yamaguchi et al., Modeling and Discovering Vulnerabilities with Code Property Graphs, IEEE S&P 2014. Rasmussen et al., Zep: A Temporal Knowledge Graph Architecture for Agent Memory, 2025. ISO/IEC/IEEE 29148:2018 para el requisito singular.
