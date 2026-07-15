# Autonomia

> **Status: live (v5).** A stage `intake` e a disposição resolver-marcar-seguir estão em produção em
> todas as stages (prd, prp, plan, dev, test, pr e system-design). O formato canônico está em
> [`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md).
> Alguns refinamentos ainda são *(planned)* e estão marcados no texto: model tiering para Haiku em
> checagens baratas, e o preenchimento do `context-library/repos.md` de cada organização a partir do
> template que já vem no repo.

O design original do harness-kit para e pede inputs ao humano antes de cada artefato: o agent de PRD
pergunta squad, problema, clientes, hipótese e link da aposta; o agent de PRP pergunta os caminhos do
repo. Cada pergunta é um ponto onde a run trava. O trabalho de autonomia remove as perguntas *triviais*
sem remover as *decisões reais*, para que um único comando leve uma ideia de ponta a ponta e só pause
onde o humano de fato agrega julgamento.

## Perguntas são falta de contexto disfarçada

Um agent pergunta quando não tem contexto para seguir. Existem duas formas de eliminar a pergunta:

1. **Apagar a pergunta e deixar o agent chutar.** Isso produz artefatos confiantes e errados: um squad
   alucinado, uma métrica inventada, um cliente plausível mas falso. Pior do que perguntar.
2. **Dar ao agent um jeito de achar a resposta sozinho.** O repositório, o histórico dele e a context
   library já guardam quase tudo que as perguntas tentavam pescar. Leia isso primeiro, pergunte só o
   que é genuinamente externo.

O harness-kit segue o segundo caminho. É o mesmo que acontece quando um coding agent é solto num
repositório bem estruturado, sem nenhum setup sob medida: ele lê o código, o README, os commits
recentes, e infere a intenção. O trabalho de autonomia torna esse passo de leitura **explícito e
obrigatório**, para que a inferência aconteça antes de qualquer pergunta surgir.

Em termos de harness engineering, isso é uma mudança de **feedback** para **feedforward** (veja
[Engenharia de harness](Harness-Engineering)). Perguntar ao humano no meio da run é feedback: o agent
produz uma lacuna e espera correção. Colher contexto na largada é feedforward: o agent recebe o que
precisa antes de começar, e a lacuna nunca se forma.

## A stage de intake

A autonomia se apoia numa nova primeira stage, `intake`, que roda antes do `prd`. É um
[subagent](Orchestration-and-Subagents) cujo trabalho inteiro é reunir contexto e gravar tudo num único
artefato que o resto do pipeline lê.

```
intake  →  prd  →  prp  →  plan  →  dev  →  test  →  pr
  │
  └─ reads:  target repo (code, README, recent commits, open PRs/issues)
             context-library/ (business-info, squads/, metrics/, decisions/)
             git remotes and repo registry
  └─ emits:  .claude/runtime/outputs/intake/{feature_id}.md
             { squad, problem, customers[], hypothesis, repos[], metrics, unknowns[] }
```

Por ser um subagent, o intake roda num contexto isolado. Sua exploração pesada, potencialmente centenas
de arquivos lidos, nunca polui o contexto das stages seguintes. Elas recebem só o `intake.md` destilado,
não a busca crua.

O artefato de intake é a fonte única das respostas que o agent de PRD costumava pedir. O agent de PRD
não interroga mais o humano; ele lê o `intake.md`.

## Resolver, marcar, seguir

Todo input de que o pipeline precisa tem uma de três disposições. Isso substitui o binário
*perguntar-ou-travar*.

| Disposição | Quando | O que acontece |
|---|---|---|
| **Resolver** | A resposta está no repo ou na context library | O intake escreve o valor no `intake.md`. Zero contato humano. |
| **Marcar** | A resposta é genuinamente impossível de descobrir a partir do contexto disponível (por exemplo, um link de aposta, a meta de um executivo) | O intake escreve `NOT FOUND - NEEDS REVIEW: {detail}` e adiciona o item a `unknowns[]`. A run **continua.** |
| **Seguir** | Sempre | O pipeline nunca trava por falta de input no meio da run. Os desconhecidos aparecem na próxima gate, não como interrupção. |

Os evals já toleram um número limitado de markers não resolvidos (`prp-context-quality` só bloqueia
acima de cinco markers `NEEDS REVIEW`/`TBD`). A autonomia se apoia nessa tolerância que já existe:
alguns desconhecidos honestos são aceitáveis e visíveis; não são motivo para parar.

A regra em uma linha: **resolva a partir do contexto, marque o que não der, nunca pare para perguntar.**

## Autonomia com gates: humanos supervisionando o loop, não dentro dele

Autonomia total não é o objetivo. Geração sem supervisão e sem nenhum checkpoint humano é perigosa e
cara de desfazer. O objetivo é tirar o humano de **dentro do loop** (respondendo um input antes de cada
artefato) e colocá-lo **acima do loop** (aprovando a direção nos pontos em que revisar é barato e errar
é caro), distinção tirada dos textos de harness engineering da Böckeler.

O harness-kit coloca gates humanas só em fronteiras de alta alavancagem e baixa reversibilidade:

```
intake → prd → [ GATE: approve direction ] → prp → plan →
dev → test → [ GATE: approve PR before it opens ] → pr
```

- **A gate do PRD** custa uns 30 segundos do humano e evita uma run inteira de dev apontada na direção
  errada. É o checkpoint mais valioso do pipeline.
- **A gate do PR** protege a única ação voltada para fora e difícil de retratar: abrir um pull request.

Tudo entre as gates roda sem interrupção. Duas decisões, não uma dúzia de perguntas.

A flag `--yolo` remove até essas gates para fluxos confiáveis e de baixo risco, colapsando o pipeline
inteiro num único comando sem supervisão. Ela é honrada pelo orquestrador `/pipeline:run`.

## O que continua determinístico

Nem toda pergunta removida precisa de um LLM. Algumas são consulta em tabela, e consulta deve ser
código, não inferência:

- **Caminhos de repo.** Um registro em `context-library/repos.md` mapeia `squad → repo paths`, então as
  stages de PRP e SSE resolvem os alvos por lookup em tabela em vez de perguntar. Ele vem como
  `repos-template.md`; cada organização preenche o seu *(planned por organização)*. Quando o registro
  não tem entrada, o intake cai para autodetecção a partir do diretório de trabalho atual e dos remotes
  do git.
- **feature_id.** Já é computado deterministicamente como `{YYYY-MM-DD}-{squad}-{slug}`.

Manter isso em código deixa tudo barato e confiável, e reserva os agents para as partes que realmente
exigem julgamento.

## Como isso se encaixa no harness existente

A autonomia adiciona uma stage e muda a disposição dos inputs. Ela **não** substitui a maquinaria de
gating:

- Sensors e evals continuam disparando em toda stage. Um PRD produzido de forma autônoma é cobrado
  pelas mesmas barras de `prd-structure` e `prd-quality` que um PRD guiado à mão.
- Markers, contabilidade de tokens e `.pipeline-state.json` seguem iguais. O intake é só mais uma stage
  que escreve um artefato e vira o estado pelos mesmos hooks.
- `/pipeline:continue` ainda retoma na próxima stage pendente, então uma run autônoma que falha no meio
  do caminho é tão retomável quanto qualquer outra.

O pipeline fica mais independente sem ficar menos governado. As gates que tornam o resultado confiável
continuam exatamente onde estavam.

## Veja também

- [Orquestração e subagents](Orchestration-and-Subagents): o subagent de intake e o orquestrador que é
  dono do estado
- [Pipeline e stages](Pipeline-and-Stages): onde o intake fica e como as gates funcionam
- [Engenharia de harness](Harness-Engineering): feedforward versus feedback, humanos acima do loop
  versus dentro dele
