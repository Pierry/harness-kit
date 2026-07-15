# Rate Limiter

> Série System Design #2. Topic skill: `skills/rate-limiter/`.
> Projete rate limiting distribuído em escala, do algoritmo à operação.

## 1. O problema e por que ele engana

De longe, rate limiting parece "um contador com TTL no Redis". Isso resolve uma parte. Não resolve o
problema inteiro. Quando o sistema cresce, as perguntas que importam são maiores que o algoritmo:

- **Onde** o limite é aplicado, no edge, no gateway, no serviço, ou em todos eles?
- **Qual é a chave**: usuário, token, IP, tenant, endpoint, método, região?
- O limite é **hard ou soft**?
- O que acontece quando o **armazenamento** do rate limit **falha**: fail open ou fail closed?
- Como você barra **rajadas abusivas** sem destruir o throughput legítimo?
- Como você faz isso em **muitas réplicas** sem corrida e sem um gargalo central?

A pergunta organizadora, feita primeiro:

> **O que exatamente eu estou protegendo, e quanta imprecisão eu aceito para proteger isso sem
> destruir latency e simplicidade?**

Essa única pergunta guia quase toda decisão aqui.

## 2. Por que rate limiting existe (cinco objetivos ao mesmo tempo)

1. **Proteger a capacidade finita** de um sistema.
2. **Justiça** entre clientes, tenants, usuários.
3. **Reduzir o raio de dano**: um cliente em loop, um deploy gerando tráfego anômalo.
4. **Sustentar modelos comerciais**: planos free / pro / enterprise.
5. **Controlar custo**: serviços que chamam dependências caras (LLM, busca, terceiros).

Um bom design é um conjunto de **limites sobrepostos** (global, tenant, usuário, endpoint, segurança
por IP), não um contador único. **Política primeiro, Redis depois.**

## 3. Onde aplicar (defesa em profundidade)

| Camada | Boa para | Tipo de limite | Ressalva |
|---|---|---|---|
| Edge / CDN | absorver abuso volumétrico, DDoS L7, bloquear cedo | grosso | falta contexto de negócio rico |
| API Gateway | lugar mais comum; por token/usuário/tenant/endpoint | API genérico | se virar gargalo, a plataforma inteira sente |
| Dentro do serviço | limite depende do contexto de domínio (relatório caro, inferência de LLM) | semântico / custo | mais perto da verdade, mais longe do edge |

A arquitetura madura é **em camadas**: edge para proteção grossa, gateway para limites genéricos de
API, serviço para limites semânticos e de custo. Cada camada pega o que a camada acima não consegue
enxergar. É a mesma ideia de "defesa em profundidade" do empilhamento de segurança.

## 4. A chave do limite

Escolha a dimensão (ou as dimensões) conscientemente: usuário, token, IP, tenant, endpoint, método,
região, muitas vezes uma composição. A escolha da chave define:

- **Cardinalidade**: quantos contadores distintos existem, o que dita a carga no store e o risco de
  hot key.
- **Superfície de abuso**: um limite por IP é fácil de driblar atrás de NAT/proxy; um limite por token
  amarra na identidade.

Chaves compostas (tenant + endpoint) localizam limites com precisão, mas multiplicam a quantidade de
contadores.

## 5. Teoria, os algoritmos

Essa é a parte que todo mundo cita e poucos explicam. Cada linha é uma resposta diferente para "como
contamos".

### Fixed window counter
Conta requisições em um balde fixo de relógio (por exemplo, por minuto) e zera na virada. Barato, um
contador por chave. **Defeito: rajada de fronteira.** Um cliente pode mandar uma janela cheia às
11:59:59 e outra janela cheia às 12:00:00, ~2x a taxa pretendida atravessando a fronteira.

### Sliding window log
Guarda um timestamp por requisição e conta os que caem dentro da janela retroativa. **Exato e justo.**
Custo: memória e CPU crescem com o tráfego, já que você mantém todo timestamp da janela. Tranquilo em
volume baixo, caro em escala.

### Sliding window counter
Aproxima a sliding window com dois baldes fixos (atual + anterior), ponderados pela fração já
decorrida da janela atual:

```
estimate = current_count + previous_count * (1 - elapsed_fraction)
```

Suaviza a rajada de fronteira, um ou dois contadores por chave, uma única operação atômica. É o
compromisso comum em produção entre o barateamento da fixed window e a precisão do sliding log.

### Leaky bucket
Requisições entram em uma fila que drena a uma taxa constante; o que transborda é rejeitado. Produz
uma taxa de **saída** suave e constante, boa para modelar tráfego rumo a um downstream que quer fluxo
estável.

### Token bucket  ← padrão da indústria
Um balde guarda até `capacity` tokens. Os tokens são repostos a uma `rate` constante. Cada requisição
consome um token; se o balde está vazio, rejeita (ou enfileira). A propriedade chave: ele **separa a
rajada permitida (capacity) da taxa sustentada (refill)**. Um cliente pode estourar até `capacity`
instantaneamente e depois fica preso a `rate`. Isso combina com o jeito que as plataformas querem se
comportar: "você pode dar um pico pequeno, mas seu regime permanente tem teto."

```
on request:
  now = clock()
  tokens = min(capacity, tokens + (now - last_refill) * rate)
  last_refill = now
  if tokens >= 1: tokens -= 1; allow
  else: reject (429, Retry-After)
```

Token bucket é o algoritmo clássico de traffic shaping vindo de redes (ver Tanenbaum, *Computer
Networks*); é o que a maioria das plataformas de API e provedores de nuvem expõe.

### Escolhendo
Use **token bucket** como padrão quando você quer taxa sustentada + rajada controlada; **sliding
window counter** quando você quer um limite deslizante simples e quase exato, com checagem abaixo do
milissegundo. Faça a checagem ser **atômica**: um script Lua no Redis executa ler-decidir-escrever em uma única
operação do lado do servidor, então réplicas concorrentes não correm entre si.

## 6. Estado e armazenamento

- Balde/contador por chave em um store em memória (Redis), **limitado por TTL** (por exemplo, 2
  janelas) para que chaves frias expirem e a memória fique limitada.
- **Decisão atômica:** um único script Lua faz refill/ponderação + checagem + decremento em um round
  trip.
- **Config de limite** (chave para quota/refill) em um serviço de configuração com um cache local
  curto, **recarregável a quente** sem redeploy.

## 7. Teoria, hot keys

Um tenant com tráfego desproporcional concentra carga em um shard do store (uma hot key). Mitigações:

- **Orçamentos locais.** Cada nó recebe uma fatia do orçamento global e a decrementa localmente,
  reconciliando com o store central periodicamente. Isso troca exatidão (você pode admitir a mais em
  até uma fatia de orçamento por nó) por uma queda enorme na pressão sobre o store central. É o "data on
  the outside, reconciled asynchronously" (dados do lado de fora, reconciliados de forma assíncrona) de
  Helland aplicado a contadores.
- **Limites compostos** espalham um tenant entre subchaves (tenant+endpoint), então nenhum contador
  isolado fica quente.
- **Pré-checagem local / pré-filtro de token** antes da chamada central: uma chave que está saturando
  é freada no próprio nó antes de encostar no store compartilhado.
- **Shard do store por chave** (consistent hashing), para que as operações de uma chave fiquem em um
  shard só.

## 8. Fail-open vs fail-closed

Quando o store do rate limit falha, decida *deliberadamente*.

- **Fail-open (permite):** protege o tráfego legítimo da sua própria queda, mas abre mão da proteção
  durante a queda.
- **Fail-closed (nega):** preserva a proteção, mas transforma uma queda do limiter em um incidente de
  disponibilidade.

A maioria das plataformas usa **fail open** no caminho genérico e **fail closed** só onde o limite
guarda um teto duro de capacidade ou de custo. Declare qual postura cada camada adota, e por quê.
Combine isso com um **circuit breaker** (Nygard) para que um store lento não acrescente latency a toda
requisição: assim que o store é detectado como insalubre, o limiter para de chamá-lo e aplica a
postura de fallback na hora.

## 9. Limites hard vs soft

Um limite **hard** rejeita (`429 Too Many Requests` + `Retry-After`). Um limite **soft** avisa,
degrada ou enfileira, mas ainda atende. Limites de custo e de justiça costumam ser soft com fricção
crescente; limites de segurança e de capacidade são hard.

## 10. Multi-região

Exatidão global estrita entre regiões exigiria um salto síncrono cross-region a cada requisição, o que
destrói latency. O compromisso realista são **orçamentos regionais com reconciliação**: cada região
aplica uma parcela local do limite global e reconcilia de forma assíncrona. Você aceita uma admissão a
mais limitada (um limite global de N pode, por um instante, admitir um pouco mais que N) em troca de
latency baixa. Reserve contagem global estrita para os poucos limites que realmente precisam. É o
trade-off de CAP/PACELC posto em concreto: em operação normal, você troca consistência por latency.

## 11. Shadow mode (a prática de maior alavancagem)

Antes de aplicar um limite hard, rode ele em **modo de observação**: o sistema calcula a decisão de
bloqueio mas **não a aplica**, e emite o que *teria* bloqueado. Isso pega políticas mal configuradas
antes que causem um incidente: você vê "esse limite novo teria dado 429 em 40% do tráfego legítimo do
tenant X" num dashboard em vez de num alerta às 3 da manhã. Promova um limite de shadow para enforce
só depois que as métricas do shadow parecerem certas.

## 12. Observabilidade

Métricas essenciais:

- requisições **permitidas** por política,
- requisições **bloqueadas** (429) por política e dimensão,
- **latency da decisão**: o limiter tem que somar quase zero ao caminho da requisição,
- latency das operações no store,
- eventos de fail-open,
- chaves mais throttled,
- contagem de would-block do shadow mode.

Às 3 da manhã alguém precisa conseguir responder: **qual limite disparou, em qual dimensão, a política
estava errada, houve uma regressão de tráfego?** Se o design não consegue responder isso, ele não é
governável na operação, e "governável na operação" é a barra de verdade, não um algoritmo bonito.

## 13. Modos de falha

| Falha | Impacto | Mitigação |
|---|---|---|
| Store fora do ar | sem contagem central | postura escolhida (fail-open por padrão) + orçamento local de fallback + circuit breaker + alerta |
| Hot key satura um shard | pico de CPU no shard, latency | pré-filtro local + chaves compostas + orçamentos locais |
| Política ruim publicada | 429 falso em massa | shadow mode primeiro; rollback rápido de config; alerta de taxa de bloqueio por política |
| Limiter do gateway vira o gargalo | latency em toda a plataforma | empurre limites grossos para o edge, mantenha a checagem do gateway O(1) |

## 14. Plano incremental

1. **Fatia vertical**: uma camada de aplicação (gateway), fixed ou sliding window, um Redis só, uma
   chave de limite, `429 + Retry-After`, métricas de allow/deny.
2. **Corretude / operação**: token bucket via Lua atômico, fail-open + circuit breaker, shadow mode,
   config com hot-reload, métricas por política.
3. **Escala**: store shardeado, orçamentos locais + pré-filtro para hot key, aplicação em camadas
   (edge/gateway/serviço).
4. **Global**: orçamentos regionais com reconciliação, políticas compostas, limites semânticos de
   custo/LLM no serviço.

## 15. Trade-offs para declarar explicitamente

Exatidão vs latency (contagem global exata vs orçamento local); fail-open vs fail-closed; store
central vs orçamentos locais; chave de limite única vs composta; aplicar agora vs shadow primeiro;
posicionamento por camada (pegar cedo no edge vs contexto rico no serviço).

## 16. Um exemplo completo, preenchido

O repo traz um SDD completo e preenchido para um rate limiter distribuído (variante
sliding-window-counter, 200k QPS, orçamento abaixo do milissegundo, fail-open) como o bom exemplo do
agent:
[`good-system-design-example.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/examples/good-system-design-example.md).

## Referências

- Andrew Tanenbaum, *Computer Networks*, traffic shaping com token bucket e leaky bucket.
- Martin Kleppmann, *Designing Data-Intensive Applications*, 2017, consistência vs latency, aceitar
  imprecisão limitada.
- Michael Nygard, *Release It!*, 2a ed., 2018, circuit breaker, bulkhead, fail-fast como decisão de
  estabilidade.
- Werner Vogels / Amazon, projete para a falha (o store *vai* falhar).
- Pat Helland, *Life Beyond Distributed Transactions*, CIDR 2007, orçamentos locais como estado
  independente, reconciliado de forma assíncrona.
- Eric Brewer, teorema CAP (PODC 2000); Abadi, PACELC (2012): o enquadramento latency vs consistência
  para orçamentos multi-região.
- Stripe Engineering, *Scaling your API with rate limiters*, token bucket na prática em produção.
- Docs do Redis, *Rate limiting with Redis* e `EVAL`/Lua para decisões atômicas.
