# Sensors (feedback determinístico)

Sensors são o controle de feedback: eles observam o artefato depois que o agent escreve e devolvem um
pass/fail duro. Um sensor que falha **bloqueia a aprovação**, e o agent regenera até passar.

Todo sensor declara **como ele é aplicado**, e essa distinção é o ponto central:

| `Execution:` | Aplicado por | Consegue reportar um pass? |
|---|---|---|
| `computational` | `sensor-runner.py`, determinístico, mesmo veredito toda vez | sim, ele checou de verdade |
| `inferential` | um modelo ou uma pessoa aplicando julgamento | **nunca** como `pass`, só como `inferential` |

Essa é a divisão computational/inferential do Böckeler, e o harness-kit aprendeu ela do jeito difícil.
Três sensors já se declararam gates duras e determinísticas enquanto escreviam suas checagens em prosa,
para a qual o runner não tinha handler nenhum. O runner retornava 0, e o log de qualidade registrava
`passed` em toda rodada, contra uma checagem que nunca aconteceu. Um sensor que não consegue reportar
um pass que ele não mereceu vale mais do que um que sempre diz sim.

Rode `python3 .claude/scripts/check-sensors.py` para imprimir o registro de enforcement: cada sensor,
seu tipo de execução, e as checagens que ele de fato liga.

## O que é um sensor

Um sensor é um arquivo markdown simples descrevendo checagens, mais um pequeno runner em Python que
aplica elas com regex de verdade. O markdown é a spec; o runner é o enforcement. Formato de exemplo:

```markdown
# Sensor: PRD Structure
Type: deterministic
Execution: computational
Mode: hard gate

## Required sections
- Problem and Hypothesis
- Customers
- ...

## Forbidden tokens
- lorem, TODO, FIXME, placeholder

## Markdown rules
- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## On failure
Block publish. Return missing sections, forbidden tokens, rule violations.
Agent regenerates failed parts only.
```

## Como o runner funciona

O `sensor-runner.py` extrai as seções conhecidas do markdown do sensor e checa elas contra o artefato:

- **Required sections**: para cada bullet, ele monta um regex de heading (tolerante a prefixos
  numerados, tipo `## 3) ...`) e falha se o heading não estiver lá.
- **Forbidden tokens**: falha se algum aparecer (pega `TODO`, `lorem`, tokens de template não
  preenchidos como `{System Name}`).
- **Markdown rules**: exatamente um H1, sem em-dash, sem desenho de caixa em ASCII, mínimo de blocos
  mermaid, e por aí vai.

Os exit codes carregam a distinção:

| Código | Significado |
|---|---|
| `0` | todas as checagens passaram |
| `1` | uma checagem falhou. O agent conserta só as partes que falharam |
| `2` | a spec do sensor está **quebrada**: ela declara `computational` mas não liga nenhuma checagem que o runner entenda. Não é um pass, é um bug no sensor |
| `3` | o sensor é `inferential`. O runner se recusa a rodar, e quem chama registra `inferential`, nunca `pass` |

O exit 2 existe porque a alternativa é o silêncio. Um sensor cujas checagens o runner não consegue
parsear costumava retornar 0 para sempre, o que se lê como "checado e tudo certo" quando a verdade é
"nunca olhou". Um hook PostToolUse dispara o runner no save e devolve o feedback para o agent.

O casamento de headings é leniente de propósito: um parêntese no final é ignorado e um prefixo
descritivo é permitido, então `## Design doc, required sections (all present, in order)` resolve para
`Required sections`. O bug original era exatamente esse: o runner aceitava só `(all must be present, in
order)`, três sensors escreveram `(all present, in order)`, e umas 30 asserções de seção que estavam
escritas não faziam nada.

## Por que determinístico

Estrutura não é questão de opinião, então não deveria custar uma chamada de LLM nem ficar sujeita ao
humor de um modelo. Empurrar toda regra checável para dentro de um sensor:

- deixa a gate **rápida e de graça** (zero tokens),
- deixa ela **exata** (sem falso "tá bom"),
- libera o [eval](Evals) para julgar só o que precisa mesmo de julgamento semântico.

Esse é o movimento central da engenharia de harness: torne determinístico o que der, infira só o que
for inevitável.

## Sensors no harness-kit

Cada stage tem seus próprios sensors. Uma amostra:

| Stage | Sensors |
|---|---|
| `prd` | `prd-structure`, `prd-acceptance-criteria` |
| `prp` | `prp-structure`, `prp-context-quality`, `prp-links`, `link-validator` |
| `plan` | `plan-structure` |
| `dev` | `dev-structure`, `code-maintainability` (computational), `code-conventions`, `test-coverage` (inferential) |
| system design | `design-structure`, `review-structure` (computational), `design-rigor` (inferential) |

O `code-maintainability` é o único que sai do documento e olha para o código. Ele roda o que o repo de
fato configura (npm `lint`/`typecheck`, ruff, ktlint, checkstyle, gitleaks) e nunca uma config imposta.
Quando um repo não configura nada que ele conheça, ele sai com 4, **não checado**, em vez de passar.
Nada rodou, então nada se sabe.

O `design-rigor` é o contraexemplo honesto. Ele quer metas numéricas, conta de padaria visível, pelo
menos três trade-offs e uma fase de fatia vertical. Isso precisa de julgamento, então ele é
`inferential`: um modelo aplica e o log diz isso. Ele passou muito tempo se dizendo uma gate dura e
determinística enquanto não checava absolutamente nada.

## Feedback otimizado para o agent

O valor de um sensor não está só no veredito, está na **mensagem**. "missing required section: 'Success
Metrics'" diz ao agent exatamente o que adicionar. Uma boa saída de sensor se lê como instrução para o
próximo turno, não como stack trace. É isso que transforma feedback determinístico num loop de
autocorreção em vez de uma parede.

## Escrevendo um sensor

- Declare **`Execution:`** com honestidade. Se o runner não consegue checar, é `inferential`, e admitir
  isso não te custa nada. Reivindicar `computational` e expressar a checagem em prosa é como você ganha
  um sensor que reporta verde para sempre sem olhar para coisa nenhuma.
- Expresse checagens computational numa seção que o runner parseia: `Required sections`, `Forbidden
  sections`, `Required tokens`, `Forbidden tokens`, `Markdown rules`. Qualquer outra coisa é
  documentação, não enforcement.
- Mantenha as checagens **objetivas**: se uma pessoa pode discordar, aquilo pertence a um eval ou a um
  sensor inferential.
- Nomeie a **falha com precisão**, para que o conserto seja óbvio.
- Use **forbidden tokens** para pegar placeholders de template não preenchidos (`{N}`, `{...}`, `TBD`).
- Marque como **hard gate**; sensors não têm threshold, eles passam ou bloqueiam.
- Rode `python3 .claude/scripts/check-sensors.py` antes de commitar. O CI roda também, e a suíte de
  testes garante que todo sensor computational rejeita um artefato vazio, então um sensor que não checa
  nada quebra o build em vez de ir para produção.

## Veja também

- [Evals](Evals): a metade inferential que julga significado
- [Engenharia de harness](Harness-Engineering): controles computational vs inferential
- [Referências](References): a literatura em que isso se apoia
- Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html),
  martinfowler.com. A origem da divisão computational/inferential, do sensor de manutenibilidade, e do
  alerta sobre a "illusion of quality" (ilusão de qualidade) que um sensor que não checa nada produz.
