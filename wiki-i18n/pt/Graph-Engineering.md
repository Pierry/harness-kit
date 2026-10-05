# Graph Engineering

Graph engineering impede o agent de adivinhar. Antes de editar, cada requisito ganha um id estável, cada símbolo de código que a mudança pode tocar vira um link com a sua evidência, e a lista desses símbolos é o único escopo que o agent pode tocar. Depois do merge, os links que um teste prova viram VALIDATED e os links cujo símbolo mudou de lugar viram STALE, então a próxima feature começa do que esta deixou. O método vem do artigo Graph Engineering #1, de Pierry Borges, escrito depois que um grafo de conhecimento com 19.262 nós respondeu toda pergunta com nada, porque quem escrevia e quem lia nunca combinaram um contrato.

# Três modos

Você escolhe um por projeto com `/hk:graph`, e o instalador pergunta uma vez. `off` é o default e deixa o pipeline exatamente como está. `manifest` liga a rastreabilidade sem infraestrutura e sem chave. `full` acrescenta um banco de grafo por cima, embutido no projeto, sem Docker e sem servidor.

| Modo | O que você ganha | Do que precisa |
|---|---|---|
| `off` | o pipeline simples | nada |
| `manifest` | ids de requisito, `trace/{feature}.yml`, gate de escopo, status dos links | `python3`, `git` |
| `full` | manifest mais um grafo FalkorDB alimentado pelo Graphiti e pelo CPG do Joern | Python 3.12, uma chave gratuita do NVIDIA build para o Graphiti, `joern` para a camada de código |

# O manifest

`trace/{feature_id}.yml` fica na raiz do repo e vai junto com o PR. Ele lista os requisitos, o escopo e os links. Só `.claude/scripts/trace.py` escreve nele, então toda escrita passa pela ontologia e pela checagem de commit. O arquivo é a verdade. No modo full o grafo é uma projeção dele, e se o grafo se perder, `graph.py sync` e `graph.py index-code` o reconstroem a partir do git.

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

Um hash de commit é resolvido contra o git quando o link é escrito, e um hash que o git não encontra é recusado. Essa é a checagem pela qual dezesseis hashes de commit inventados num mapa de ownership nunca precisaram passar, e por isso o post de origem a tornou obrigatória.

# Status dos links

PROPOSED quer dizer que o plan acha que o requisito toca o símbolo. VALIDATED quer dizer que a mudança entrou no merge e um teste ligado com VERIFIED_BY prova isso. STALE quer dizer que o símbolo sumiu ou mudou de lugar, então o link não merece confiança. `trace.py settle --all` roda no começo de todo plan, então o status anda junto com a próxima branch e o harness nunca faz commit na main por conta própria.

# A ontologia

`.claude/graph/ontology.yml` diz quais tipos de nó existem e quais arestas são válidas: AFFECTS de um requisito para um método, IMPLEMENTS de um método para um requisito, VERIFIED_BY de um requisito para um teste, cada uma com seus campos obrigatórios. Ela é um arquivo para que as mudanças cheguem como pull requests. Copie o arquivo para o seu repo para estendê-lo, e acrescente um tipo só quando um documento real ou código real pedir.

# Pelo pipeline

O PRP escreve cada critério de sucesso como `- [ ] REQ-001: ...`, com ids do atomize quando essa skill está instalada, e `trace.py init` cria o manifest. O plan acerta os manifests anteriores, pede à interface do grafo conhecimento e símbolos relacionados a cada requisito, registra cada escolha com `trace.py propose` e usa `trace.py scope` como a sua lista de arquivos a tocar. O dev registra IMPLEMENTS depois de cada commit e roda `trace.py gate`, que reprova o stage quando algum arquivo mudou fora do escopo; ampliar o escopo exige `trace.py scope --add` com um motivo que aparece no resumo do dev. O test registra VERIFIED_BY para cada teste que prova um requisito. O PR roda `trace.py validate`, faz commit do manifest e cola `trace.py summary` na descrição.

# Uma interface

O agent faz quatro perguntas e nunca descobre o que as responde.

```
python3 .claude/scripts/graph.py knowledge "<text>"
python3 .claude/scripts/graph.py symbols "<intent>"
python3 .claude/scripts/graph.py tests <file[::symbol]>
python3 .claude/scripts/graph.py history <file>
```

No modo manifest as respostas vêm de manifests anteriores, do git, do semble e do repowise. No modo full as mesmas chamadas também leem o grafo: fatos do Graphiti para conhecimento, callers do CPG para símbolos e testes. Nada nos stages muda entre os dois.

# Modo full

O grafo é o FalkorDB embutido pelo `falkordblite`, guardado em `.claude/runtime/graph/kg.db` e ignorado pelo git. Um único writer é dono de cada camada: o Graphiti escreve conhecimento a partir de documentos não estruturados passados para `graph.py ingest`, `graph.py index-code` escreve a camada de código a partir de um CPG do Joern, e `graph.py sync` projeta os manifests. Manifests e o CPG entram por parsers, nunca por um modelo, porque um parser já sabe a resposta e um modelo inventaria alguma.

O Graphiti roda em modelos do NVIDIA build pelo endpoint compatível com OpenAI, no tier gratuito. Os defaults são `nvidia/nemotron-3-super-120b-a12b` para extração, que devolveu JSON válido 4 vezes em 4, em 2,5 a 4,6 segundos, na medição de 2026-10-05, e `nvidia/nemotron-3-embed-1b` para embeddings. A NVIDIA aposenta modelos sem aviso, então `graph.py status` confere os dois contra o catálogo ao vivo. Troque os dois com `HK_GRAPH_LLM_MODEL` e `HK_GRAPH_EMBED_MODEL`.

```
python3 .claude/scripts/graph.py setup
python3 .claude/scripts/graph.py index-code
python3 .claude/scripts/graph.py sync
python3 .claude/scripts/graph.py ingest docs/decisions/weight-limit.md
python3 .claude/scripts/graph.py status
```

Para Java com Lombok, `index-code` passa `--fetch-dependencies --delombok-mode no-delombok` para o frontend do Joern. Sem essas flags, o projeto de origem teve 4.351 de 4.890 arquivos pulados e um grafo de 188 KB que parecia plausível. Conte o que o CPG contém; não confie no tamanho dele.

# Custo

O modo manifest custa milissegundos por chamada e nada mais. No modo full o CPG é construído uma vez por repo e reconstruído quando fica atrás do último merge, e o Graphiti só roda em documentos novos. O grafo estreita o que vai para o modelo; ele nunca enche o contexto.

# Referências

[Graphiti](https://github.com/getzep/graphiti), [FalkorDB](https://github.com/FalkorDB/FalkorDB), [falkordblite](https://pypi.org/project/falkordblite/), [Joern](https://github.com/joernio/joern), [semble](https://github.com/MinishLab/semble), [NVIDIA build](https://build.nvidia.com). Gotel e Finkelstein, An Analysis of the Requirements Traceability Problem, RE 1994. Yamaguchi et al., Modeling and Discovering Vulnerabilities with Code Property Graphs, IEEE S&P 2014. Rasmussen et al., Zep: A Temporal Knowledge Graph Architecture for Agent Memory, 2025. ISO/IEC/IEEE 29148:2018 para o requisito singular.
