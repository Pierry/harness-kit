# Pipeline e stages

O harness-kit leva uma feature por seis stages com gate:

```
prd → prp → plan → dev → test → pr
```

O agent product-manager é dono dos dois primeiros e o agent staff-software-engineer dos quatro últimos. Um stage [`intake`](Autonomy) roda na frente: ele coleta o repo e a context library para que nenhum stage pare para perguntar, e cada stage então roda como um [orquestrador com subagents folha](Orchestration-and-Subagents). `/pipeline:run` conduz de `intake` até `pr` com dois gates humanos, depois do PRD e antes do PR.

# Anatomia de um stage

Cada stage é um pequeno [harness](Harness-Engineering): guides como `pipeline.md` e `templates/` dizem como escrever, referências como `prp/<feature>.md` e `conventions/{area}.md` dão contexto, um [sensor](Sensors) bloqueia estrutura ruim e um [eval](Evals) pontua a qualidade.

O agent escreve o artefato em `.claude/runtime/outputs/{pm,sse}/{stage}/{feature_id}.md`. Ao salvar, os sensors disparam, e uma falha devolve feedback para que o agent corrija só as partes que falharam. Depois o judge responde os checks atômicos de sim ou não da rubric, e `eval-score.py` recalcula o total ponderado de 0 a 10 a partir dos pesos da rubric.

O judge é um avaliador Claude novo (`local`, o default) ou o Jev da TypeSafe AI (`jev`), definido por projeto com `/hk:eval`. Abaixo de 8.0 o stage tenta de novo até 3 vezes, regenerando só os checks que falharam. Na aprovação o agent acrescenta `<!-- approved: {date} score={n} -->`, e o stage seguinte procura esse marker antes de começar.

# Os stages

| Stage | Agent | Artefato | Sensors | Evals |
|---|---|---|---|---|
| `prd` | product-manager | Product Requirements Document | `prd-structure`, `prd-acceptance-criteria` | `prd-quality`, `prd-readiness` |
| `prp` | product-manager | Product Requirements Prompt | `prp-structure`, `prp-context-quality`, `prp-links` | `prp-quality`, `prp-context-readiness` |
| `plan` | staff-software-engineer | plano técnico | `plan-structure` | `plan-quality` |
| `dev` | staff-software-engineer | código e commits | `dev-structure`, `code-conventions`, `code-maintainability`, `test-coverage` | `dev-quality` |
| `test` | staff-software-engineer | relatório da execução de testes | `test-structure` | `test-quality` |
| `pr` | staff-software-engineer | pull request | `pr-structure` | `pr-quality`, depois arma o `pr-monitor` |

`prp-links` roda `link-validator.py`. Os evals de readiness e o `spec-satisfied` sempre usam Claude, qualquer que seja o judge escolhido. System design, do agent system-architect, é um stage opcional antes de `prp` ou `plan` e fica fora desses seis.

# Approval markers e tokens

O marker é `<!-- approved: YYYY-MM-DD score=N -->`, e o PRP também leva `ready-for-handoff: true`. A presença dele libera o início do stage seguinte.

Hooks envolvem cada fase, e `token-phase.py` soma o uso a partir do transcript do Claude em `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`, um arquivo por agent para todo o ciclo de vida, porque todo stage reusa o `feature_id`. A contagem de tokens nunca bloqueia um stage; com um transcript ilegível ela registra no log e sai limpa.

# Status do pipeline

`hk status` mostra a feature ativa. A mesma linha pode virar a status line do Claude Code, mas só se você instalar com `HK_STATUSLINE=1`; por padrão o harness não mexe na sua status line, porque uma configuração de projeto passaria por cima dela.

```
idle · /product-manager:run · /sse:run · /pipeline:continue
billing-fix · prp approved · plan drafting · next /sse:plan
billing-fix · complete
```

O estado mora em `.claude/.pipeline-state.json`. Reabra uma sessão e `/pipeline:continue` retoma no próximo stage pendente. Quando o PR é mergeado, o monitor limpa o estado.

# Ferramentas de contexto

Os stages que leem o repo alvo rodam `.claude/scripts/context-tools.sh` uma vez e usam o que estiver instalado. O semble acha código pela intenção e devolve arquivo e linha, o repowise explica módulos, mede o risco de mexer neles e lista os testes que cobrem uma mudança, o context7 traz a doc atual de bibliotecas, e o joern ou o graphify dizem quem chama o quê. Sem nenhum deles, o stage volta para o grep. O [context-strategy.md](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/context-strategy.md) liga cada pergunta a uma ferramenta.

# Comandos de stage único

Cada stage também é um comando próprio, com os mesmos sensors e evals. A lista de desvios está em [Golden Path](Golden-Path#saindo-do-caminho).

# O loop SDD

`/sse:sdd` troca a passada única de dev e test por um loop com objetivo:

```
prd → prp → plan → [dev ↔ test ↔ spec-satisfied eval] → [user gate] → pr
                         loop, cap 3 iterations           stops local
```

O sensor de pré-voo `prp-has-acceptance-criteria` bloqueia um PRP que não é testável. O predicado do loop vem de `Success criteria (verifiable)` e `Validation gates` do PRP. O eval `spec-satisfied` de cada iteração roda numa sessão Claude nova e devolve PASS ou FAIL; um FAIL volta ao loop com uma dica `next_iter_focus`.

O PR nunca abre sozinho. Você lê o transcript em `.claude/runtime/outputs/sse/sdd/{feature_id}.md` e roda `/sse:pr` quando estiver pronto.

Veja também [Golden Path](Golden-Path), [Sensores](Sensors), [Evals](Evals), [Agents](Agents).
