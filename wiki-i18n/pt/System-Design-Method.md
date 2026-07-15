# Método de System Design

A lente que todo playbook de tópico aplica. Leia antes de qualquer design específico.

System design é uma **cadeia de decisões sob restrição**. Você decide o que ingerir, o que armazenar,
o que computar, o que servir. Cada stage elimina custo ruim e preserva sinal útil. O melhor design não
é o que faz mais coisas. É o que escolhe melhor o que fazer.

## O formato de qualquer sistema

Quase todo sistema não trivial tem quatro capacidades mais dois planos de apoio.

| Capacidade | Exemplo em search engine | Geral |
|---|---|---|
| Descobrir / ingerir | crawler | trazer dados para dentro (API, eventos, uploads, crawl) |
| Entender / modelar | parser, extrator | parsear, validar, enriquecer, normalizar |
| Organizar | inverted index | armazenar para query eficiente (index, schema, partição) |
| Servir | caminho de query | responder requisições dentro de um budget de latency |

Planos de apoio, presentes quase sempre:

- **Metadados / política**: regras, agendamento, dedup, config, quotas.
- **Observabilidade / controle**: métricas, debugging, replay, backfill, listas de permissão e bloqueio.

## Os três pilares (Kleppmann, DDIA)

Avalie todo design contra eles. São a espinha não funcional.

### Reliability
Funciona corretamente sob falha: hardware quebrando, bug de software, erro humano. Projete *para* a
falha, Werner Vogels: "everything fails all the time". As ferramentas são os stability patterns
(Nygard): timeouts, retries com backoff exponencial, circuit breakers, bulkheads, idempotência. Um
sistema confiável assume que suas dependências vão falhar e degrada de propósito, em vez de por
acidente.

### Scalability
Aguenta o crescimento da carga. A disciplina: **defina os parâmetros de carga primeiro** (QPS, tamanho
do payload, fan-out, razão leitura/escrita), depois descreva a performance sob essa carga (p50/p95/p99,
throughput). Prefira escala horizontal à vertical. Particione por uma chave que evite hot spots.
"Escalável" não é uma propriedade do sistema; é a resposta para "se a carga crescer X, qual é o nosso
plano?"

### Maintainability
Operável, simples, evoluível. John Ousterhout, em *A Philosophy of Software Design*: construa **deep
modules**, interfaces simples escondendo implementação significativa. Complexidade é o inimigo; ela se
acumula em dependências e obscuridade. Observabilidade faz parte do design, não é algo pensado depois.

## Números que todo engenheiro deveria saber (Jeff Dean)

Use para conta de padaria. Ordem de grandeza, não valor exato.

| Operação | Tempo |
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

Conta de dimensionamento, sempre exibida:

```
QPS         = DAU x actions/day / 86400
peak QPS    = avg x (2 to 10)
storage     = records x bytes/record x replication x retention
bandwidth   = QPS x payload
```

Se você não consegue fazer a conta, você ainda não entendeu a escala.

## O método de 13 stages

Um SDD percorre todos eles. O [template](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/templates/system-design.md)
espelha essa ordem.

1. **Problema + contexto**: enquadramento em uma linha. Quem, qual escala, interno versus web-scale.
2. **Requisitos**: funcionais, mais os não funcionais *com números* (SLO de latency, throughput,
   disponibilidade, modelo de consistência, teto de custo).
3. **Modelo mental**: fluxo ponta a ponta, numerado ou em mermaid. Enxergue o caminho inteiro antes de
   qualquer componente.
4. **Arquitetura de alto nível**: componentes + mermaid + os dois planos de apoio.
5. **Deep dives**: os 2 ou 3 componentes que carregam o risco: estruturas de dados, algoritmo,
   trade-off difícil. É aqui que staff se separa de senior.
6. **Dados + armazenamento**: separe o store por função e padrão de acesso. KV/wide-column para
   updates aleatórios, object storage para blobs, search index para texto, relacional para transações.
   Prefira imutabilidade (Helland: eventos em vez de estado mutável).
7. **Escala + particionamento**: estratégia de sharding, replicação, rebalanceamento. Um dono por
   partição para coordenação. Workers stateless escalam sozinhos; stateful precisa de liderança +
   réplicas.
8. **Consistência + falha**: escolha um modelo de consistência com honestidade (eventual está de bom
   tamanho se convergir). Enumere os modos de falha e como o design resiste a cada um. "O que quebra
   primeiro?"
9. **Observabilidade + ops**: métricas por stage; as ferramentas de debugging que precisam existir
   (inspecionar o ciclo de vida de um registro, explicar o resultado de uma requisição).
10. **Segurança + compliance**: armazenar o mínimo de dados, sandbox para input não confiável,
    sanitizar o parsing, respeitar política externa.
11. **Plano incremental**: fatia vertical primeiro (provar ponta a ponta em escopo pequeno, reusar
    engines já provados), depois eficiência/qualidade, depois escala real, depois o avançado.
12. **Trade-offs**: cobertura versus qualidade, frescor versus custo, recall versus latency,
    complexidade versus velocidade de entrega, centralizar versus particionar.
13. **Questões em aberto / design review**: o que um revisor deveria interrogar.

## Disciplina de trade-off

Nunca apresente uma opção como óbvia. Nomeie a alternativa, o eixo, a escolha:

> Escolhi X em vez de Y porque {eixo} pesa mais aqui, dado {restrição}.

Um design sem trade-off declarado é um design que escondeu um.

## Construa com pragmatismo

Não reinvente as partes difíceis se a sua diferenciação está em outro lugar. Use um engine já provado
(Lucene, Postgres, Kafka, uma fila gerenciada) para a camada cheia de detalhes traiçoeiros; gaste os
trimestres no pipeline e na lógica que são de fato o seu diferencial. Reinvente só a parte que é o
produto.

## Consistência, tempo e ordenação

*Time, Clocks, and the Ordering of Events in a Distributed System* (1978), de Leslie Lamport, é a raiz
do raciocínio distribuído: num sistema distribuído não existe um "agora" global único; você raciocina
sobre ordenação *causal*, não sobre relógio de parede. Isso sustenta consistência eventual, vector
clocks, e o motivo de "é só usar timestamp" ser uma armadilha (clock skew). *Life Beyond Distributed
Transactions*, de Helland, leva a ideia até a conclusão prática: em escala você abre mão de ACID entre
entidades e projeta em torno de unidades independentes, idempotentes e reconciliadas eventualmente.

## O enquadramento CAP e PACELC

Sob uma partição de rede (P) você escolhe disponibilidade (A) ou consistência (C): CAP (Brewer).
PACELC acrescenta: *else* (E), quando não há partição, você troca latency (L) por consistência (C). A
maioria dos designs reais é "AP sob partição, e troca latency por consistência na operação normal".
Diga em qual canto você está e por quê; raramente é tudo ou nada por sistema, é por operação.

## O canon

Cite quando afiar o argumento.

| Pessoa | Ideia | Fonte |
|---|---|---|
| Martin Kleppmann | reliability/scalability/maintainability; parâmetros de carga antes de performance | DDIA (2017) |
| Jeff Dean, Sanjay Ghemawat | os números que todo mundo sabe; batch em formato MapReduce | LADIS 2009; OSDI 2004 |
| Werner Vogels | projetar para a falha; consistência eventual em escala | Dynamo (SOSP 2007) |
| Pat Helland | imutabilidade; vida além das transações distribuídas | CIDR 2007; 2015 |
| Michael Nygard | circuit breaker, bulkhead, timeout, backoff | Release It! (2018) |
| John Ousterhout | deep modules, interfaces simples | PoSD (2018) |
| Leslie Lamport | ordenação causal, sem relógio global | CACM 1978 |
| Eric Brewer | teorema CAP | PODC 2000 |
| Sam Newman | fronteiras de serviço ao longo da capacidade de negócio | Building Microservices |
| Gregor Hohpe | o elevador do arquiteto: conectar o trade-off da sala de máquinas ao interesse do negócio | 2020 |

## A conexão com o harness

Este agent é, ele próprio, um harness (Böckeler/Fowler). Guides = feedforward, sensors + evals =
feedback, humanos on the loop. A mesma divisão de controle que o *design* precisa: controles
computacionais (testes, linters, checagem de schema) e controles inferenciais (review semântico). Os
dois, sempre.

## Referências

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
