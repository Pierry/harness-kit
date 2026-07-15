# Orquestração e subagents

> **Status: live (v5).** A topologia de orquestrador e folhas está em pé em todas as stages: `intake`
> é um subagent somente-leitura, o eval de cada stage é despachado para um avaliador novo que não
> escreveu o artefato, e os inputs seguem resolver-marcar-seguir. O formato canônico está em
> [`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md).
> O model tiering para Haiku nas checagens mais baratas ainda é *(planned)*.

O pipeline original do harness-kit é carregado por dois agents monolíticos: `product-manager` roda `prd`
e depois `prp` inline, e `staff-software-engineer` roda `plan → dev → test → pr` inline. Dentro de cada
agent, sensors e evals rodam no mesmo contexto do autor. Esta página explica por que a v5 quebra isso em
um **orquestrador mais subagents pequenos e de propósito único**, e, tão importante quanto, onde ela
deliberadamente *não* faz isso.

## Por que subagents

Um subagent é um contexto novo e isolado, invocado pela Task tool. Dividir o trabalho em subagents
compensa em exatamente três situações, e a v5 usa todas elas:

1. **Isolamento de contexto.** Uma stage que lê centenas de arquivos (`intake`, `dev`) não deveria
   carregar esse peso para as stages seguintes. Cada subagent sobe limpo e devolve só um resultado
   destilado.
2. **Paralelismo.** Trabalho genuinamente independente roda em paralelo: um painel de revisores, ou o
   `dev` se espalhando por módulos independentes.
3. **Separação adversarial.** O agent que escreve um artefato não pode ser o agent que dá nota a ele.
   Um crítico novo, sem participação no texto, dá uma nota honesta.

A terceira é a razão mais forte. Hoje o mesmo agent escreve um PRD e depois o avalia, o que é corrigir a
própria prova: a nota infla porque quem corrige está apegado ao trabalho. Um avaliador separado, subido
do zero e recebendo apenas o artefato, não tem nada a defender.

Isso não é ideia nova no harness-kit. O loop de SDD já roda seu eval `spec-satisfied` numa **sessão
nova, sem contexto do worker** (veja [Pipeline e stages](Pipeline-and-Stages)). A v5 generaliza esse
caso único e o transforma na regra de toda gate.

## A armadilha da decomposição excessiva

Todo salto para um subagent tem custo: subir um contexto novo, reler arquivos que ele não herda
(subagents não compartilham memória), mais latência e mais tokens. Ou seja, o objetivo **não** é um
subagent por passo. Divida só quando o salto compra um dos três ganhos acima. Fora isso, mantenha o
trabalho inline ou, melhor ainda, num script determinístico.

A linha divisória é julgamento versus determinismo:

- Uma checagem que é regra estrutural, "o PRD contém as seções obrigatórias?", é um **script de
  sensor**. Não precisa de modelo, e um modelo só deixaria a checagem mais lenta e menos confiável.
- Uma checagem que exige ler e ponderar, "essa hipótese é mesmo testável?", é um **eval subagent**.

O harness-kit já mantém seus sensors determinísticos como scripts. A v5 preserva isso. A decomposição
adiciona subagents para *julgamento e isolamento*, não para trabalho que o código já faz melhor.

## Três responsabilidades, separadas

O movimento central é parar de embolar três responsabilidades diferentes dentro de um agent só:

| Responsabilidade | Quem é dono na v5 | Regra |
|---|---|---|
| **Coordenação**: sequência, estado, markers, retries, gates | um **orquestrador** (a sessão principal) | Nunca escreve artefato. Só despacha e grava estado. |
| **Geração**: escrever o PRD, o PRP, o plan, o código | **subagents autores** | Stateless. Inputs explícitos, saída estruturada. |
| **Verificação**: sensor e eval | **subagents verificadores**, separados do autor | Quem corrige nunca escreveu o que está corrigindo. |

Os agents monolíticos misturavam os três. Separá-los é o que torna as gates confiáveis e os contextos
limpos.

## A topologia

```
/pipeline:run "<one-line idea>"
  │  orchestrator = main session: owns .pipeline-state.json, markers, gates
  │
  ├─ intake        subagent   harvest repo + context-library → intake.md
  │      ↓ orchestrator reads unknowns[], decides the PRD gate
  ├─ prd-author    subagent   write PRD
  ├─ prd-sensor    script     structural pass/fail (no model)
  ├─ prd-eval      subagent   adversarial score, fresh context
  │      ↓ score ≥ 8.0 → orchestrator writes approval marker → next stage
  ├─ prp-author / prp-eval
  ├─ planner
  ├─ dev × N       subagents  fan out only over independent modules
  ├─ tester
  ├─ reviewer × 3  subagents  parallel, distinct lenses (correctness · security · repro)
  └─ pr-author
```

O orquestrador é coordenador, não trabalhador. Ele instancia cada folha, lê o retorno estruturado dela e
grava a transição de estado resultante. As folhas nunca conversam entre si; toda informação passa pelo
orquestrador e pelos artefatos em disco.

## O corte adversarial

A regra que torna as gates honestas:

> O subagent que escreve um artefato nunca é o subagent que o avalia.

O avaliador sobe sem nenhuma memória de como o artefato foi escrito. Ele recebe apenas o artefato e a
rubric, e é instruído a achar o que está errado, não a defender o que está lá. Em gates de alto risco,
um **painel** substitui o juiz único: três avaliadores com lentes distintas rodam em paralelo e a
maioria decide. Diversidade de lente pega modos de falha que um revisor sozinho, ou três revisores
idênticos, deixariam passar.

## Model tiering

Separar responsabilidades permite rodar cada subagent no modelo do tamanho certo:

| Trabalho | Modelo | Por quê |
|---|---|---|
| Sensors determinísticos | *(nenhum, é script)* | Regra estrutural não precisa de inferência. |
| Julgamento mecânico e barato | Haiku *(planned)* | Rápido, barato, suficiente para checagens estreitas. |
| Autoria e eval adversarial | Opus | As partes que exigem raciocínio de verdade. |

Um agent monolítico precisa rodar tudo num tier só. A decomposição deixa o trabalho barato ser barato e
reserva o modelo forte para autoria e julgamento.

## As restrições do Claude Code moldam o design

Subagents no Claude Code são **folhas stateless**: não podem mutar estado compartilhado, não herdam
memória de quem os chamou, e o aninhamento é limitado (um subagent não instancia livremente seus
próprios subagents). Isso não é uma limitação para brigar; é o que dita um design limpo:

- O **orquestrador é dono de todo o estado.** `.claude/.pipeline-state.json` e os arquivos de marker são
  escritos pelo orquestrador, através do `pipeline.py` e do `marker.sh` que já existem, nunca por uma
  folha.
- As folhas **retornam, não gravam.** Um subagent preenche um artefato e reporta um resultado
  estruturado. O orquestrador lê esse resultado e executa a transição de estado.
- A **maquinaria de hooks, markers e tokens fica intocada.** Os subagents se encaixam por baixo dela:
  uma folha escreve o artefato, o orquestrador vira o estado, e os mesmos hooks de pós-escrita disparam
  como antes.

Nada do que funciona hoje é jogado fora. Os subagents entram como folhas debaixo da camada de
coordenação que já existe.

## Contratos

Orquestração confiável precisa de contratos explícitos. Cada subagent recebe:

- **Inputs explícitos**: caminhos de arquivo, não "o contexto". O `prd-author` recebe o caminho do
  `intake.md` e os caminhos dos guides, não uma instrução vaga do tipo "use o que você sabe".
- **Saída estruturada**: um formato definido que o orquestrador consegue parsear e usar para ramificar.
  Por exemplo, o `intake` retorna `{ squad, problem, repos[], customers[], unknowns[] }`, e o
  orquestrador lê `unknowns[]` para decidir se a gate do PRD precisa do humano.

Sem contratos, a orquestração degenera em adivinhação sobre o que a folha produziu. Com eles, o controle
de fluxo é determinístico mesmo com folhas inferenciais.

## Como foi o rollout: uma fatia vertical primeiro

A v5 não reconstruiu os dois monolitos de uma vez. Isso seria uma mudança grande e difícil de debugar. O
rollout provou primeiro uma **única fatia vertical**, a stage `prd`, no padrão novo, de ponta a ponta:

```
intake (subagent) → prd-author → prd-sensor (script) → prd-eval (subagent, fresh context)
```

Assim que essa fatia funcionou contra um repositório real, virou o template, registrado em
[`.claude/shared/pipeline-pattern.md`](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md).
Toda outra stage (`prp`, `plan`, `dev`, `test`, `pr` e as stages de `system-design`) passou a ser uma
replicação desse padrão já validado, em vez de um experimento simultâneo: cada uma lê seus inputs via
resolver-marcar-seguir e despacha seu eval para um avaliador novo. Stages novas seguem o mesmo arquivo.

## Veja também

- [Autonomia](Autonomy): o subagent de intake e a autonomia com gates
- [Pipeline e stages](Pipeline-and-Stages): as stages que o orquestrador dirige
- [Agents](Agents): os agents que estão sendo decompostos
- [Engenharia de harness](Harness-Engineering): controles computacionais versus inferenciais
