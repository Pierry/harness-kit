# Primeiros passos

Esta página leva você de nada instalado até um merged PR. Ela cobre as quatro formas de rodar o harness-kit: simples, com o judge Jev, com graph engineering e com os dois. Todo setup usa os mesmos comandos; as opções só mudam o que acontece dentro de alguns passos.

# Por que vale a pena

Um agent de IA escreve código rápido, e é na pressa que os erros caros se escondem: o problema nunca foi escrito, "pronto" nunca foi definido, o código ignora suas convenções e a review foi uma olhada. O harness-kit transforma cada um desses pontos num passo que precisa passar antes de o próximo começar, e escreve esses passos por você.

| Sem o harness-kit | Com o harness-kit |
|---|---|
| O ticket vive na sua cabeça ou numa thread de chat | Um PRD com o problema, os clientes e uma métrica de sucesso numérica |
| "Pronto" é o que o agent decidiu | Um PRP com critérios de aceite que você confere um por um |
| O agent edita o que encontrar | Um plan que nomeia os arquivos e, com graph engineering, um gate que reprova qualquer outro arquivo |
| Review é ler um diff e torcer | Todo documento avaliado contra uma rubric, refeito até passar de 8.0 |
| Ninguém lembra por que o código está assim | Todo requisito ligado ao código que o implementa e ao teste que o prova |
| A qualidade depende do dia | Os mesmos seis passos toda vez, com um histórico de notas que você acompanha |

Você gasta sua atenção em duas decisões, se a direção está certa e se o PR está pronto, em vez de digitar specs e correr atrás de convenções.

# Escolha um setup

Você pode mudar de ideia a qualquer momento com um comando, então comece pelo default.

| Setup | Melhor para | O que acrescenta | Do que precisa | Custo |
|---|---|---|---|---|
| Simples (default) | experimentar, times pequenos, a maioria das features | o pipeline completo com gates | Claude Code, `python3`, `git`, `gh` | nada a mais |
| Judge Jev | quando você quer um judge que não seja o Claude avaliando o Claude | qualidade avaliada pelo Jev, um modelo diferente, em menos de um segundo por documento; o Claude assume quando o Jev fica em dúvida | uma chave de API da TypeSafe | cerca de $0.04 por milhão de tokens |
| Graph engineering | codebases compartilhadas, trabalho regulado, tudo que você precise auditar depois | ids de requisito, um arquivo de rastreabilidade em todo PR, um gate de escopo, links que viram VALIDATED ou STALE | nada a mais (`manifest`); Python 3.12, uma chave gratuita da NVIDIA e `joern` para o banco de grafo (`full`) | gratuito |
| Graph e Jev | times que querem um judge neutro e rastreabilidade completa | os dois acima | os dois acima | cerca de $0.04 por milhão de tokens |

# Instalação

Dentro do Claude Code:

```
/plugin marketplace add Pierry/harness-kit
/plugin install harness-kit@harness-kit
```

Reinicie o Claude Code para o plugin carregar. Abra o repositório em que você quer trabalhar e rode:

```
/harness-kit:install
```

Ele copia os agents, comandos e hooks para `.claude/`, acrescenta `AGENTS.md` e `CLAUDE.md` e faz duas perguntas. Responda de acordo com o seu setup.

| Pergunta | Simples | Judge Jev | Graph engineering | Graph e Jev |
|---|---|---|---|---|
| Eval judge | `local` | `jev` | `local` | `jev` |
| Graph engineering | `off` | `off` | `manifest` ou `full` | `manifest` ou `full` |

Reinicie o Claude Code mais uma vez para os comandos aparecerem. A sua status line continua como estava.

# Configure o Jev (só nos setups com Jev)

Crie uma chave em [console.typesafe.ai/keys](https://console.typesafe.ai/keys) e rode `/hk:eval jev`. Ele pergunta se a chave já está numa variável de ambiente ou se você quer colá-la. Uma chave colada vai para `.claude/settings.local.json`, que o git ignora; ela nunca cai num arquivo commitado. Reinicie o Claude Code se você acabou de acrescentar a chave. Confira a qualquer momento com `python3 .claude/scripts/hk-config.py get eval`.

# Configure o grafo (só nos setups com grafo)

`/hk:graph manifest` não precisa de mais nada. Para o banco de grafo, rode `/hk:graph full` e depois:

```
python3 .claude/scripts/graph.py setup
python3 .claude/scripts/graph.py index-code
python3 .claude/scripts/graph.py status
```

`/hk:graph full` pede uma chave gratuita do NVIDIA build em [build.nvidia.com](https://build.nvidia.com), que o Graphiti usa para ler seus documentos de decisão; sem ela, as camadas de código e de rastreabilidade continuam funcionando. `setup` cria um pequeno ambiente virtual com o FalkorDB embutido e o Graphiti. `index-code` constrói o grafo de chamadas do seu código com o Joern, uma vez; num repo grande leva minutos. `status` mostra o que está pronto e avisa se a NVIDIA aposentou um modelo configurado. Para carregar documentos de decisão, rode `python3 .claude/scripts/graph.py ingest docs/decisions/*.md`.

# Passo 1: escreva o brief

Um brief tem quatro linhas. Digite depois de `/golden-path`, ou preencha o [construtor de brief](https://pierry.github.io/harness-kit/brief/), que confere cada campo e entrega o prompt para colar.

```
/golden-path

Squad: checkout
Problem: Returning guests abandon checkout when a card is declined once.
Hypothesis: If we add one-tap retry, completion rises 5 points.
Success metric: checkout completion, from 71% to 76% within 30 days
```

`/golden-path` para e pede sua aprovação depois de cada passo. Se você quer que ele pare só duas vezes, use `/pipeline:run "<idea>"`; ele coleta contexto do repo primeiro e pausa nas mesmas duas decisões descritas nos passos 2 e 6.

# Passo 2: o PRD e a sua primeira decisão

O agent de product manager escreve `.claude/runtime/outputs/pm/prd/{feature_id}.md`: problema, clientes, escopo, métricas de sucesso com baselines, rollout e riscos. Um script confere se toda seção está lá. Depois o eval dá a nota em oito dimensões, cada uma dividida em pequenos checks de sim ou não, e abaixo de 8.0 o agent reescreve só os checks que falharam.

Nos setups simples e com grafo, um subagent Claude novo dá a nota. Nos setups com Jev, o Jev responde a cada check numa chamada, e se as respostas incertas dele puderem virar o resultado, um subagent Claude decide no lugar. Você lê o PRD e aprova a direção. Esta é a decisão que mais pesa: um problema errado pego aqui custa uma reescrita, não uma feature.

# Passo 3: o PRP

O agent transforma o PRD numa spec de engenharia em `.claude/runtime/outputs/pm/prp/{feature_id}.md`, com os arquivos a mudar, os padrões a seguir, links para a documentação das bibliotecas, comandos de validação e critérios de aceite. Ele busca no seu código com semble, repowise ou grep, o que você tiver.

Com graph engineering, cada critério de aceite ganha um id estável como `REQ-001`, e `trace/{feature_id}.yml` é criado com esses requisitos. Daqui em diante tudo se guia pelo id, não pelo texto.

# Passo 4: o plan

O agent de staff engineer escreve o plan: o que muda, em quais arquivos, em que ordem, com riscos e casos de teste.

Com graph engineering, o plan primeiro acerta os arquivos de rastreabilidade anteriores, fazendo os links de features já mergeadas virarem VALIDATED ou STALE. Depois, para cada requisito, ele pede o conhecimento relacionado e os símbolos de código com mais chance de serem afetados, e registra cada escolha como um link PROPOSED com a sua evidência e confiança. A lista desses arquivos vira o escopo: os únicos arquivos que o próximo passo pode mudar. Com `full`, ele também vê quem chama cada símbolo, então o raio de impacto entra nos riscos.

# Passo 5: dev

O agent implementa o plan em commits pequenos e roda seus linters e type checkers pelos sensors do harness. Ele segue suas convenções de `.claude/conventions/` quando você as tem.

Com graph engineering, cada commit é registrado como um link IMPLEMENTS, e o hash do commit é conferido contra o git antes de ser escrito. Antes de o passo terminar, o gate de escopo compara o diff com o plan. Um arquivo fora do escopo reprova o passo. Para mudar um arquivo que não estava no plan, o agent precisa acrescentá-lo com um motivo escrito, que depois aparece no resumo do dev para você ver.

# Passo 6: test, o PR e a sua segunda decisão

O agent roda sua suíte de testes e reporta aprovação ou falha, com as falhas pelo nome. Com graph engineering, cada teste que prova um requisito é registrado como VERIFIED_BY, e os requisitos sem teste são listados como lacunas.

Depois ele prepara o pull request: título, resumo, plano de testes e links. Com graph engineering, ele valida o arquivo de rastreabilidade, faz commit dele e acrescenta uma tabela de rastreabilidade na descrição do PR: cada requisito, o código que ele afeta, o seu status e o teste que o prova. Você aprova, e o PR abre como draft.

# Passo 7: merge

Um monitor acompanha o PR e limpa o pipeline quando ele entra no merge. Comece a próxima feature com um novo brief. Com graph engineering, o próximo plan acerta os links desta feature, então o que esta feature provou, e o que mudanças posteriores quebraram, fica visível para a próxima.

# O que muda entre os setups

| Passo | Simples | Judge Jev | Graph engineering | Graph e Jev |
|---|---|---|---|---|
| Nota | subagent Claude | Jev, Claude quando em dúvida | subagent Claude | Jev, Claude quando em dúvida |
| PRP | critérios | critérios | critérios com ids `REQ`, arquivo de rastreabilidade | critérios com ids `REQ`, arquivo de rastreabilidade |
| Plan | arquivos a mudar | arquivos a mudar | links com evidência, os arquivos viram o escopo | links com evidência, os arquivos viram o escopo |
| Dev | convenções e linters | convenções e linters | mais gate de escopo, links IMPLEMENTS | mais gate de escopo, links IMPLEMENTS |
| Test | relatório | relatório | mais links VERIFIED_BY | mais links VERIFIED_BY |
| PR | resumo e plano de testes | resumo e plano de testes | mais tabela de rastreabilidade | mais tabela de rastreabilidade |

# Mudando de ideia

`/hk:eval local` ou `/hk:eval jev` troca o judge. `/hk:graph off`, `manifest` ou `full` troca o graph engineering; desligar deixa intactos os arquivos de rastreabilidade que já estão no git. `/pipeline:continue` retoma uma feature de onde ela parou, e `hk status` mostra onde é isso.

# Para onde ir depois

[Golden Path](Golden-Path) para cada desvio, [Evals](Evals) e [Jev e System One](Jev-and-System-One) para como a nota funciona, [Graph Engineering](Graph-Engineering) e [Teoria dos grafos](Graph-Theory) para a rastreabilidade e o grafo, e [Pipeline e stages](Pipeline-and-Stages) para o que cada passo escreve.
