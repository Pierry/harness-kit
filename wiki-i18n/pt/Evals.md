# Evals (feedback inferential)

Evals são o controle de feedback **inferential, baseado em LLM**. Onde um [sensor](Sensors) checa
estrutura de forma determinística, um eval julga *significado*: esse PRD está claro, o trade-off desse
design é real, esse plan de fato decorre do PRP. Um eval é um LLM-judge pontuado de 0 a 10 contra uma
rubric, com threshold de aprovação de **8.0** e **até 3 retries**.

## Por que você precisa de controles inferential

Nenhum regex te diz que a definição do problema está vaga, que a hipótese é infalsificável, ou que um
design escondeu o trade-off mais difícil. Isso é julgamento semântico, e só um modelo de linguagem
consegue fazer nessa granularidade. O custo: é probabilístico, então você calibra com uma rubric e
pesos em vez de confiar num "dê uma nota de 1 a 10" solto.

## Anatomia de um eval

Uma rubric é um arquivo markdown: dimensões com peso, cada uma com âncoras em 0/5/10, um threshold, e
um formato de saída estrito.

```markdown
# Eval: Design Quality
Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

## Rubric
### Requirements rigor (weight 15%)
Numeric targets + back-of-envelope math?
- 10: numeric targets + sizing math
- 5: some numbers, no math
- 0: prose only
...

## On failure (total below 8.0)
Retry. Regenerate lowest-scoring sections only. Max 3 attempts.

## Output format
{ "scores": {...}, "weighted_total": 0.0, "feedback": ["dimension: issue with line ref"] }
```

`weighted_total = sum(score x weight%) / 100`. O judge precisa citar uma linha ou seção sempre que
pontuar uma dimensão abaixo de 7, para que o feedback seja acionável e não um chute de sensação.

## O loop de retry

```
generate -> sensors (hard gate) -> eval (score)
   ^                                   |
   |          below 8.0                v
   +------ regenerate weak sections ---+   (max 3 attempts, then blocker)
```

O ponto crítico: o retry regenera **só as dimensões com nota baixa**, não o artefato inteiro, e o
feedback por dimensão do judge diz quais são. Depois de 3 tentativas falhas, a stage devolve um blocker
em vez de entregar algo abaixo do threshold.

## Os pesos codificam o que importa

Os pesos são onde você expressa prioridades. Na rubric de qualidade de PRD, *completude de métricas* e
*clareza* carregam o maior peso, porque um PRD vive ou morre por um problema nítido e um sucesso
mensurável. Na rubric de qualidade de design, *arquitetura + deep dives* e *disciplina de trade-off*
dominam, porque é isso que separa um design de staff de um diagrama de caixinhas. Ajustar pesos é uma
ação de "human on the loop": você muda com o que a gate se importa uma vez, e isso vale para todo
artefato futuro.

## Calibração e anti-carimbo

Um eval que sempre passa não vale nada. Duas práticas mantêm ele honesto:

- **Escalas ancoradas.** Cada dimensão define como são o 0, o 5 e o 10, então o judge não fica
  adivinhando o que "7" significa.
- **Enquadramento adversarial onde importa.** O eval `design-review-depth` do system-architect pontua um
  *review* e reprova explicitamente um que só carimba: um review sem lacunas nomeadas, com severidade
  achatada, ou com conselho genérico de "considere melhorar" tira nota baixa por construção.

## Evals no harness-kit

| Stage | Evals |
|---|---|
| `prd` | `prd-quality`, `prd-readiness` |
| `prp` | `prp-quality`, `prp-context-readiness` |
| `plan` | `plan-quality` |
| `dev` | `dev-quality` |
| `pr` | `pr-quality` |
| system design | `design-quality`, `design-review-depth` |

## A variante PASS/FAIL: spec-satisfied

O loop spec-driven (`/sse:sdd`) usa outro formato de eval. Em vez de uma nota de 0 a 10, o
`spec-satisfied` devolve **PASS/FAIL** contra o `Success criteria (verifiable)` e os `Validation gates`
do PRP. Um `FAIL` reentra no loop dev↔test com uma dica em `next_iter_focus`; o loop roda no máximo 3
iterações. Ele roda numa **sessão nova**, sem contexto do worker, para que o judge não seja enviesado
pela narrativa de quem implementou. Esse é um eval usado como *predicado de objetivo* em vez de nota de
qualidade.

## Sensor primeiro, eval depois

A ordem importa: sensors rodam antes dos evals. Não faz sentido gastar uma chamada de LLM pontuando a
prosa de um artefato que está sem metade das seções. A gate determinística limpa primeiro as falhas
baratas e objetivas; o eval julga só artefatos bem formados.

## Veja também

- [Sensors](Sensors): a gate determinística que roda primeiro
- [Guides](Guides): feedforward que reduz a frequência com que os evals falham
- [Pipeline e stages](Pipeline-and-Stages): onde os evals ficam dentro de uma stage

## O que a nota não é

O judge devolve notas por dimensão e um total ponderado, e até pouco tempo atrás nada checava se o
total decorria das notas. Agora checa: passe o JSON do judge pelo verificador de nota, que lê os pesos
da rubric e recalcula.

```
.claude/scripts/eval-score.py --rubric evals/prd-quality.md --scores judge.json
```

Exit 0 imprime o número que o marker de aprovação deve carregar. Exit 2 significa que o judge inflou o
total, pontuou uma dimensão que a rubric não pesa, ou pulou uma que ela pesa, e nesse caso a nota não
significa nada e você não aprova em cima dela.

Isso resolve só a metade computável. Duas limitações continuam de pé, e vale ser direto sobre elas:

- **As notas não são validadas contra rótulos humanos.** 8.0 é uma convenção, não uma fronteira
  calibrada. [Husain](https://hamel.dev/blog/posts/llm-judge/) argumenta que escalas de 1 a 10 não
  calibradas significam coisas diferentes para avaliadores diferentes, e que julgamentos binários mais
  concordância humana medida são o que torna um eval confiável. Ainda não fazemos isso.
- **Um avaliador novo não é um avaliador imparcial.** Disparar um judge sem contexto prévio tira o
  interesse do autor no texto, mas LLM judges ainda inflam nota para saída da própria família
  ([Panickssery et al.](https://arxiv.org/abs/2410.21819)). Um Claude novo julgando Claude continua
  sendo autopreferência. Resolver isso de verdade exige outra família de modelo ou uma pessoa.

Leia o feedback, não só o número. A nota é um sinal que pega artefatos fracos, não uma medição.
