# Pipeline e stages

O harness-kit leva uma feature por seis stages com gate:

```
prd → prp → plan → dev → test → pr
```

> **v5 (no ar):** um novo stage [`intake`](Autonomy) roda antes do `prd`. Ele colhe contexto do repo e da
> context library para que o pipeline rode sem parar para pedir inputs, e agora todo stage segue o padrão
> [orchestrator-plus-leaf-subagents](Orchestration-and-Subagents): inputs via resolve-mark-proceed, evals
> despachados para um avaliador novo. Os seis stages com gate abaixo continuam iguais; o intake fica na
> frente deles e a maquinaria de gating permanece a mesma.

Os dois primeiros pertencem ao agent **product-manager**, os quatro últimos ao agent
**staff-software-engineer**. Cada stage é um pequeno [harness](Harness-Engineering): um guide diz ao agent
como escrever, as references dão contexto, um [sensor](Sensors) impõe estrutura, um [eval](Evals) pontua
qualidade, e um marker de aprovação libera o stage seguinte.

## Anatomia de todo stage

```
GUIDE     how to write it          pipeline.md · coding-style.md · templates/
REF       context to pull in       AGENTS.md · prp/<feature>.md · conventions/{area}.md
SENSOR    must-pass structure      deterministic, blocks approval
EVAL      scored rubric            LLM-judge, threshold 8.0, retry x3
```

O fluxo dentro de um stage:

1. O agent lê os guides e as references e escreve o artefato em
   `.claude/runtime/outputs/{pm,sse}/{stage}/{feature_id}.md`.
2. Ao salvar, os **sensors** determinísticos disparam. Falha bloqueia e devolve feedback; o agent corrige
   só as partes que falharam.
3. O **eval** pontua o artefato de 0 a 10. Abaixo de 8.0 tenta de novo (até 3 vezes), regerando só as
   dimensões com nota baixa.
4. Ao passar, o agent adiciona um **marker de aprovação** `<!-- approved: {date} score={n} -->`.
5. O **gasto de tokens** da fase é registrado e um comentário inline `<!-- tokens: ... -->` é anexado.

O marker de aprovação é a gate: o stage seguinte procura por ele antes de começar.

## Os stages

| Stage | Agent | Artefato | Gates (sensors · evals) |
|---|---|---|---|
| `prd` | product-manager | Product Requirements Document | `prd-structure`, `prd-acceptance-criteria` · `prd-quality`, `prd-readiness` |
| `prp` | product-manager | Product Requirements Prompt (handoff de eng) | `prp-structure`, `prp-context-quality`, `prp-links`, `link-validator` · `prp-quality`, `prp-context-readiness` |
| `plan` | staff-software-engineer | plano técnico | `plan-structure` · `plan-quality` |
| `dev` | staff-software-engineer | código + commits | `code-conventions`, `test-coverage`, `dev-structure` · `dev-quality` |
| `test` | staff-software-engineer | relatório da rodada de testes | `test-structure` · `test-quality` |
| `pr` | staff-software-engineer | pull request | `pr-structure` · `pr-quality` · arma o `pr-monitor` |

System design (o agent **system-architect**) é um *stage opcional na frente do `prp`/`plan`*: um
[System Design Doc](Home) forte alimenta um PRP mais afiado e um plan bem fundamentado. Não faz parte do
pipeline padrão de seis stages.

## Markers de aprovação e contabilidade de tokens

- **Marker de aprovação**: `<!-- approved: YYYY-MM-DD score=N -->` (o PRP também carrega
  `ready-for-handoff: true`). É a presença dele que libera o início do stage seguinte.
- **Tokens**: hooks cercam cada fase com markers de início e fim, depois o `token-phase.py` soma o uso a
  partir do transcript do Claude e escreve `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`.
  Todos os stages de uma mesma feature escrevem no **mesmo** arquivo, reusando o `feature_id`, então você
  tem o custo do ciclo de vida inteiro em um lugar só. A contabilidade de tokens nunca bloqueia um stage;
  se o transcript estiver ilegível, ela loga e sai limpa.

## Barra de status

Um indicador ao vivo acompanha a feature ativa por todos os stages:

```
idle · /product-manager:run · /sse:run · /pipeline:continue
billing-fix [prd+prp+plan+dev+test+pr] · prp approved · plan drafting · next /sse:plan · sensor: plan-structure
billing-fix · complete (prd/prp/plan/dev/test/pr)
```

O estado persiste em `.claude/.pipeline-state.json`. Feche a sessão e reabra, `/pipeline:continue` retoma
no próximo stage pendente. Quando o PR é mergeado, o monitor limpa o estado automaticamente.

## Comandos de stage único e desvios

Todo stage também é um comando próprio, então você roda só a parte que precisa:

```
/product-manager:prd | :prp
/sse:plan | :dev | :test | :pr
/sse:run --local        plan → dev → test, no PR
/pipeline:continue      resume next pending stage
/pipeline:reset         abandon the active run
```

Mesmos sensors, mesmos evals, mesmos artefatos. Você perde a conveniência de um comando só, não o gating.

## A variante SDD (loop guiado por spec)

`/sse:sdd` troca o `dev → test` de tiro único por um loop com objetivo:

```
prd → prp → plan → [dev ↔ test ↔ spec-satisfied eval]  →  [user gate]  →  pr
                         ↑ loop, cap 3 iterations          stops local
```

- Um sensor de pré-voo `prp-has-acceptance-criteria` bloqueia se o PRP não for testável.
- O predicado do loop é montado a partir de `Success criteria (verifiable)` + `Validation gates` do PRP.
- O eval `spec-satisfied` de cada iteração roda em uma **sessão nova** (sem contexto do worker) e devolve
  PASS/FAIL, não uma nota. FAIL reentra com uma dica `next_iter_focus`.
- O PR **nunca** é aberto automaticamente; você revisa o transcript em
  `.claude/runtime/outputs/sse/sdd/{feature_id}.md` e roda `/sse:pr` quando estiver pronto.

## Veja também

- [Golden Path](Golden-Path): rodando os seis stages com um comando só
- [Sensores](Sensors) e [Evals](Evals): as gates em detalhe
- [Agents](Agents): quem é dono de qual stage
