# Método de System Design

Todo playbook de tópico aplica esta lente. Leia antes de qualquer design específico.

System design é uma cadeia de decisões sob restrição: o que ingerir, o que armazenar, o que computar, o que servir. Cada stage corta desperdício e preserva sinal. O melhor design escolhe bem o que fazer, e não faz mais do que isso.

# O formato de qualquer sistema

Quase todo sistema não trivial tem quatro capacidades.

| Capacidade | Exemplo em search engine | Geral |
|---|---|---|
| Descobrir / ingerir | crawler | trazer dados para dentro (API, eventos, uploads, crawl) |
| Entender / modelar | parser, extrator | parsear, validar, enriquecer, normalizar |
| Organizar | inverted index | armazenar para query eficiente (index, schema, partição) |
| Servir | caminho de query | responder requisições dentro de um budget de latência |

Dois planos de apoio ficam ao lado delas. O plano de metadados e política guarda regras, agendamento, dedup, config e quotas. O plano de observabilidade e controle guarda métricas, debugging, replay, backfill e listas de permissão e bloqueio.

# Os três pilares (Kleppmann, DDIA)

Avalie todo design contra reliability, scalability e maintainability. Eles são a espinha não funcional.

Reliability significa que o sistema funciona corretamente sob falha de hardware, bug de software e erro humano. Werner Vogels: "everything fails all the time". As ferramentas são os stability patterns de Nygard: timeouts, retries com backoff exponencial, circuit breakers, bulkheads, idempotência. Um sistema confiável assume que as dependências falham e degrada de propósito.

Scalability significa aguentar o crescimento da carga. Defina os parâmetros de carga primeiro (QPS, tamanho do payload, fan-out, razão leitura/escrita) e depois descreva a performance sob essa carga (p50, p95, p99, throughput). Prefira escala horizontal e particione por uma chave que evite hot spots. Uma afirmação de scalability é a resposta para "se a carga crescer X, qual é o plano".

Maintainability significa operável, simples e evolutivo. O *A Philosophy of Software Design*, de Ousterhout, pede módulos profundos: interfaces simples sobre implementação substancial. A complexidade se acumula em dependências e obscuridade. Observabilidade faz parte do design desde o início.

# Números que todo engenheiro deveria saber (Jeff Dean)

Use estes números para contas de guardanapo. São ordens de grandeza.

| Operação | Tempo |
|---|---|
| Referência ao cache L1 | ~1 ns |
| Branch mispredict | ~5 ns |
| Referência à memória principal | ~100 ns |
| Comprimir 1 KB | ~2 us |
| Leitura aleatória em SSD | ~16 us |
| Ler 1 MB em sequência da memória | ~10 us |
| Ler 1 MB em sequência do SSD | ~50 us |
| Ida e volta dentro do mesmo datacenter | ~0.5 ms |
| Ler 1 MB em sequência do disco | ~5 ms |
| Seek de disco | ~2 ms |
| Ida e volta Califórnia para Holanda | ~150 ms |

Mostre sempre a conta de dimensionamento. Se você não consegue fazê-la, ainda não entende a escala.

```
QPS         = DAU x actions/day / 86400
peak QPS    = avg x (2 to 10)
storage     = records x bytes/record x replication x retention
bandwidth   = QPS x payload
```

# O método de 13 stages

Um System Design Doc percorre estes stages, e o [template](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/templates/system-design.md) espelha cada um.

| Stage | O que cobre |
|---|---|
| 1. Problema e contexto | Enquadramento em uma linha: quem, escala, interno ou web-scale. |
| 2. Requisitos | Funcionais, mais os não funcionais com números: SLO de latência, throughput, disponibilidade, modelo de consistência, teto de custo. |
| 3. Modelo mental | Fluxo de ponta a ponta como diagrama mermaid. Veja o caminho inteiro antes de qualquer componente. |
| 4. Arquitetura de alto nível | Componentes, mermaid e os dois planos de apoio. |
| 5. Deep dives | Os 2 ou 3 componentes que carregam o risco: estruturas de dados, algoritmo, trade-off difícil. É aqui que o trabalho de staff se separa do de senior. |
| 6. Dados e armazenamento | Separe stores por função e padrão de acesso: KV ou wide-column para updates aleatórios, object storage para blobs, índice de busca para texto, relacional para transações. Prefira imutabilidade (Helland: eventos em vez de estado mutável). |
| 7. Escala e particionamento | Sharding, replicação, rebalanceamento. Um dono por partição para coordenação. Workers sem estado fazem autoscale; os com estado precisam de liderança e réplicas. |
| 8. Consistência e falha | Escolha um modelo de consistência com honestidade (eventual serve se convergir). Liste os modos de falha, como o design resiste a cada um e o que quebra primeiro. |
| 9. Observabilidade e operação | Métricas por stage, mais as ferramentas de debugging que precisam existir: inspecionar o ciclo de vida de um registro, explicar o resultado de uma requisição. |
| 10. Segurança e compliance | Guarde o mínimo de dados, isole entrada não confiável em sandbox, sanitize o parsing, respeite políticas externas. |
| 11. Plano incremental | Fatia vertical primeiro, em escopo pequeno com engines comprovadas, depois eficiência e qualidade, depois escala real, depois o avançado. |
| 12. Trade-offs | Cobertura vs qualidade, frescor vs custo, recall vs latência, complexidade vs velocidade de entrega, centralizar vs particionar. |
| 13. Perguntas em aberto | O que um revisor de design deveria interrogar. |

# Disciplina de trade-off

Nunca apresente uma opção como óbvia. Nomeie a alternativa, o eixo e a escolha:

> Escolhi X em vez de Y porque {eixo} pesa mais aqui, dado {restrição}.

Um design sem trade-off declarado escondeu um.

# Construa com pragmatismo

Use uma engine comprovada (Lucene, Postgres, Kafka, uma fila gerenciada) na camada cheia de detalhes traiçoeiros, e gaste seus trimestres no pipeline e na lógica que são o seu diferencial. Reinvente só a parte que é o produto.

# Consistência, tempo e ordenação

O *Time, Clocks, and the Ordering of Events in a Distributed System* (1978), de Lamport, é a raiz do raciocínio distribuído. Um sistema distribuído não tem um "agora" global único, então você raciocina sobre ordenação causal em vez de ordenação por relógio de parede. Isso sustenta a consistência eventual e os vector clocks, e é por isso que confiar em timestamps é uma armadilha (clock skew).

O *Life Beyond Distributed Transactions*, de Helland, tira a conclusão prática. Em escala você abre mão de ACID entre entidades e projeta em torno de unidades independentes e idempotentes que se reconciliam com o tempo.

# CAP e PACELC

Sob uma partição de rede (P) você escolhe disponibilidade (A) ou consistência (C): o CAP de Brewer. O PACELC acrescenta que, caso contrário (E), sem partição, você troca latência (L) por consistência (C). A maioria dos designs reais é AP sob partição e troca latência por consistência na operação normal. Diga em qual canto você está e por quê, por operação e não por sistema.

# O cânone

Cite estes quando deixarem um ponto mais preciso.

| Pessoa | Ideia | Fonte |
|---|---|---|
| Martin Kleppmann | reliability/scalability/maintainability; parâmetros de carga antes de performance | DDIA (2017) |
| Jeff Dean, Sanjay Ghemawat | números que todo mundo sabe; batch no formato MapReduce | LADIS 2009; OSDI 2004 |
| Werner Vogels | projetar para a falha; consistência eventual em escala | Dynamo (SOSP 2007) |
| Pat Helland | imutabilidade; a vida além das transações distribuídas | CIDR 2007; 2015 |
| Michael Nygard | circuit breaker, bulkhead, timeout, backoff | Release It! (2018) |
| John Ousterhout | módulos profundos, interfaces simples | PoSD (2018) |
| Leslie Lamport | ordenação causal, sem relógio global | CACM 1978 |
| Eric Brewer | teorema CAP | PODC 2000 |
| Sam Newman | fronteiras de serviço seguindo a capacidade de negócio | Building Microservices |
| Gregor Hohpe | o elevador do arquiteto: ligar o trade-off da sala de máquinas ao interesse do negócio | 2020 |

# A conexão com o harness

O agent system-architect é ele mesmo um harness (Böckeler/Fowler): guides são feedforward, sensors e evals são feedback, e os humanos ficam sobre o loop. Um design precisa da mesma divisão. Controles computacionais (testes, linters, checagem de schema) e controles inferenciais (revisão semântica) rodam juntos. Veja [Harness Engineering](Harness-Engineering) e [Evals](Evals).

# Referências

| Autor | Obra | Publicação |
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
| Eric Brewer | *Towards Robust Distributed Systems* (keynote do CAP) | PODC, 2000 |
| Birgitta Böckeler | *Harness engineering for coding agent users* | martinfowler.com, 2026 |
