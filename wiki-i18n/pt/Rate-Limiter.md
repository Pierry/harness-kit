# Rate Limiter

Série System Design #2. Topic skill: `skills/rate-limiter/`. Rate limiting distribuído em escala, do algoritmo à operação.

# O problema

Rate limiting parece um contador com TTL no Redis. Isso cobre uma parte. Em escala, as perguntas difíceis ficam fora do algoritmo: onde o limite é aplicado (edge, gateway, serviço, ou todos), qual é a chave (usuário, token, IP, tenant, endpoint, método, região), se o limite é hard ou soft, se o sistema faz fail open ou fail closed quando o store falha, como barrar rajadas abusivas sem prejudicar o throughput legítimo, e como contar em muitas réplicas sem corrida e sem um gargalo central.

Comece dizendo o que você protege e quanta imprecisão você aceita para proteger isso sem prejudicar latência e simplicidade. Essa resposta guia quase toda decisão abaixo.

# Por que rate limiting existe

Um limiter atende cinco objetivos ao mesmo tempo. Ele protege a capacidade finita, mantém justiça entre clientes, tenants e usuários, e reduz o raio de dano de um cliente em loop ou de um deploy que gera tráfego anômalo. Ele também sustenta planos comerciais (free, pro, enterprise) e limita o custo de serviços que chamam dependências caras, como LLMs, busca ou terceiros.

Um bom design é um conjunto de limites sobrepostos (global, tenant, usuário, endpoint, segurança por IP), nunca um contador único. Política primeiro, Redis depois.

# Onde aplicar

| Camada | Boa para | Tipo de limite | Ressalva |
|---|---|---|---|
| Edge / CDN | absorver abuso volumétrico, DDoS L7, bloquear cedo | grosso | falta contexto de negócio rico |
| API Gateway | lugar mais comum; por token/usuário/tenant/endpoint | API genérico | se virar gargalo, a plataforma inteira sente |
| Dentro do serviço | limite depende do contexto de domínio (relatório caro, inferência de LLM) | semântico / custo | mais perto da verdade, mais longe do edge |

Arquiteturas maduras empilham as três: edge para proteção grossa, gateway para limites genéricos de API, serviço para limites semânticos e de custo. Cada camada pega o que a camada acima não enxerga, a mesma ideia de defesa em profundidade do empilhamento de segurança.

# A chave do limite

Escolha as dimensões de propósito, muitas vezes em composição. A chave define a cardinalidade, que é quantos contadores distintos existem e portanto dita a carga no store e o risco de hot key. Ela também define a superfície de abuso: um limite por IP é fácil de driblar atrás de NAT ou proxy, enquanto um limite por token amarra na identidade. Chaves compostas (tenant mais endpoint) localizam limites com precisão, mas multiplicam a quantidade de contadores.

# Algoritmos

Cada algoritmo é uma resposta diferente para como contar.

Fixed window counter conta requisições em um balde fixo de relógio (por exemplo, por minuto) e zera na virada. Custa um contador por chave. O defeito é a rajada de fronteira: um cliente manda uma janela cheia às 11:59:59 e outra às 12:00:00, cerca de 2x a taxa pretendida.

Sliding window log guarda um timestamp por requisição e conta os que caem dentro da janela retroativa. É exato e justo, mas memória e CPU crescem com o tráfego. Tranquilo em volume baixo, caro em escala.

Sliding window counter aproxima a sliding window com dois baldes fixos, o atual e o anterior, ponderados pela fração já decorrida da janela atual. Suaviza a rajada de fronteira com um ou dois contadores por chave e uma única operação atômica. É o compromisso comum em produção entre o custo da fixed window e a precisão do sliding log.

```
estimate = current_count + previous_count * (1 - elapsed_fraction)
```

Leaky bucket enfileira requisições e drena a uma taxa constante, rejeitando o que transborda. Produz uma taxa de saída suave e constante, boa para moldar tráfego rumo a um downstream que quer fluxo estável.

Token bucket é o padrão da indústria. Um balde guarda até `capacity` tokens, repostos a uma `rate` constante; cada requisição consome um token, e um balde vazio rejeita ou enfileira. Ele separa a rajada permitida (capacity) da taxa sustentada (refill): um cliente dá um pico de até `capacity` de uma vez e depois fica preso a `rate`. É o algoritmo clássico de traffic shaping de redes (Tanenbaum, *Computer Networks*) e o que a maioria das plataformas de API e provedores de nuvem expõe.

```
on request:
  now = clock()
  tokens = min(capacity, tokens + (now - last_refill) * rate)
  last_refill = now
  if tokens >= 1: tokens -= 1; allow
  else: reject (429, Retry-After)
```

Escolha token bucket para uma taxa sustentada com rajada controlada, e sliding window counter para um limite móvel quase exato com checagem abaixo de 1 ms. Faça a checagem atômica: um script Lua no Redis roda leitura, decisão e escrita como uma operação no servidor, então réplicas concorrentes não entram em corrida.

# Estado e armazenamento

Guarde o bucket ou contador de cada chave em um store em memória (Redis) com TTL (por exemplo, 2 janelas), para que chaves frias expirem e a memória fique limitada. Um script Lua faz reposição ou ponderação, checagem e decremento em uma ida e volta. A configuração de limites (chave para cota e reposição) mora em um serviço de configuração com cache local curto e recarrega sem redeploy.

# Hot keys

Um tenant com tráfego desproporcional concentra carga em um shard do store. Quatro mitigações se aplicam.

Orçamentos locais dão a cada nó uma fatia do orçamento global para decrementar localmente, reconciliando com o store central de tempos em tempos. Você admite a mais até uma fatia por nó em troca de uma queda grande na pressão sobre o store central. É o dado do lado de fora de Helland, reconciliado de forma assíncrona, aplicado a contadores.

Limites compostos espalham um tenant por subchaves (tenant mais endpoint) para que nenhum contador fique quente sozinho. Uma pré-checagem local estrangula uma chave saturada no nó antes de ela tocar o store compartilhado. Fazer sharding do store por chave com consistent hashing mantém as operações de uma chave em um único shard.

# Fail-open vs fail-closed

Decida de propósito o que acontece quando o store falha. Fail-open (permitir) protege o tráfego legítimo da sua própria queda, mas tira a proteção enquanto ela dura. Fail-closed (negar) mantém a proteção, mas transforma uma queda do limiter em um incidente de disponibilidade.

A maioria das plataformas faz fail open no caminho genérico e fail closed só onde o limite guarda um teto rígido de capacidade ou custo. Declare a postura de cada camada e o motivo. Combine com um circuit breaker (Nygard): quando o store fica doente, o limiter para de chamá-lo e aplica a postura de fallback na hora, para que um store lento não acrescente latência a cada requisição.

# Limites hard vs soft

Um limite hard rejeita com `429 Too Many Requests` e `Retry-After`. Um limite soft avisa, degrada ou enfileira e ainda atende. Limites de custo e de justiça costumam ser soft com fricção crescente; limites de segurança e de capacidade são hard.

# Multi-região

Precisão global estrita exige um salto síncrono entre regiões a cada requisição, o que destrói a latência. O compromisso realista são orçamentos regionais com reconciliação: cada região aplica uma fatia local do limite global e reconcilia de forma assíncrona. Um limite global de N pode admitir por um instante um pouco mais que N, em troca de latência baixa. Reserve a contagem global estrita para os poucos limites que precisam dela. É o trade-off de CAP/PACELC em forma concreta: em operação normal você troca consistência por latência.

# Shadow mode

Antes de aplicar um limite hard, rode ele em modo de observação. O sistema calcula a decisão de bloqueio, não aplica, e emite o que teria bloqueado. Você vê "este novo limite teria devolvido 429 para 40% do tráfego legítimo do tenant X" em um dashboard em vez de em um alerta às 3h da manhã. Promova um limite de shadow para enforce só depois que as métricas de shadow estiverem certas. De todas as práticas desta página, é a que mais se paga.

# Observabilidade

Acompanhe requisições permitidas por política, requisições bloqueadas (429) por política e dimensão, latência de decisão (o limiter precisa acrescentar quase zero ao caminho da requisição), latência de operação no store, eventos de fail-open, chaves mais estranguladas e contagens de would-block do shadow mode.

Às 3h da manhã alguém precisa responder qual limite disparou, em qual dimensão, se a política estava errada e se o tráfego regrediu. Um design que não responde isso não é governável na operação, e essa é a régua.

# Modos de falha

| Falha | Impacto | Mitigação |
|---|---|---|
| Store fora do ar | sem contagem central | postura escolhida (fail-open por padrão) + orçamento local de fallback + circuit breaker + alerta |
| Hot key satura um shard | pico de CPU no shard, latência | pré-filtro local + chaves compostas + orçamentos locais |
| Política ruim publicada | 429 falsos em massa | shadow mode primeiro; rollback rápido de config; alerta de taxa de bloqueio por política |
| Limiter do gateway vira gargalo | latência na plataforma inteira | empurrar limites grossos para o edge, manter a checagem do gateway O(1) |

# Plano incremental

| Fase | Escopo |
|---|---|
| Fatia vertical | Uma camada de aplicação (gateway), fixed ou sliding window, Redis único, uma chave de limite, `429 + Retry-After`, métricas de allow/deny. |
| Correção e operação | Token bucket via Lua atômico, fail-open + circuit breaker, shadow mode, config com hot reload, métricas por política. |
| Escala | Store com sharding, orçamentos locais + pré-filtro para hot key, aplicação em camadas (edge, gateway, serviço). |
| Global | Orçamentos regionais com reconciliação, políticas compostas, limites semânticos de custo e LLM no serviço. |

# Trade-offs a declarar

Declare cada um no design: precisão vs latência (contagem global exata vs orçamento local), fail-open vs fail-closed, store central vs orçamentos locais, uma chave de limite vs composta, aplicar já vs shadow primeiro, e posicionamento por camada (pegar cedo no edge vs contexto rico no serviço).

# Exemplo resolvido

O repo traz um SDD completo e preenchido de um rate limiter distribuído como bom exemplo do agent: sliding window counter, 200k QPS, menos de 1 ms de latência acrescentada, fail-open. Veja [`good-system-design-example.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/agents/system-architect/guides/examples/good-system-design-example.md). O método geral está em [Método de System Design](System-Design-Method).

# Referências

| Autor | Obra | Usado para |
|---|---|---|
| Andrew Tanenbaum | *Computer Networks* | traffic shaping com token bucket e leaky bucket |
| Martin Kleppmann | *Designing Data-Intensive Applications*, 2017 | consistência vs latência, aceitar imprecisão limitada |
| Michael Nygard | *Release It!*, 2ª ed., 2018 | circuit breaker, bulkhead, fail-fast como decisão de estabilidade |
| Werner Vogels / Amazon | projetar para a falha | o store vai falhar |
| Pat Helland | *Life Beyond Distributed Transactions*, CIDR 2007 | orçamentos locais como estado independente, reconciliado de forma assíncrona |
| Eric Brewer; Daniel Abadi | CAP (PODC 2000); PACELC (2012) | enquadramento latência vs consistência para orçamentos multi-região |
| Stripe Engineering | *Scaling your API with rate limiters* | token bucket na prática de produção |
| Redis docs | *Rate limiting with Redis*, `EVAL`/Lua | decisões atômicas |
