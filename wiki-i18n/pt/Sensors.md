# Sensors (feedback determinístico)

Um sensor lê o artefato depois que o agent o escreve e devolve pass ou fail. Um sensor que falha bloqueia a aprovação, e o agent regenera as partes que falharam até passar.

Todo sensor declara como é aplicado:

| `Execution:` | Aplicado por | Pode reportar pass |
|---|---|---|
| `computational` | `sensor-runner.py`, mesmo veredito toda vez | sim |
| `inferential` | um modelo ou uma pessoa aplicando julgamento | nunca; fica registrado como `inferential` |

Essa é a divisão de Böckeler. Três sensors do harness-kit já se declararam gates rígidos enquanto escreviam checks em prosa que o runner não conseguia ler; o log registrava `passed` em toda execução para checks que nunca rodaram. `python3 .claude/scripts/check-sensors.py` imprime cada sensor, seu tipo de execução e os checks que ele liga.

# O que é um sensor

Um sensor é uma spec em markdown; um runner Python a aplica com regex.

```markdown
# Sensor: PRD Structure
Type: deterministic
Execution: computational
Mode: hard gate

## Required sections
- Problem and Hypothesis
- Customers

## Forbidden tokens
- lorem, TODO, FIXME, placeholder

## Markdown rules
- exactly 1 H1 heading
- no em-dash
```

# Como o runner funciona

`.claude/runtime/scripts/{agent}/sensor-runner.py` lê cinco seções: `Required sections`, `Forbidden sections`, `Required tokens`, `Forbidden tokens` (ou `Forbidden patterns`), `Markdown rules`. As seções obrigatórias viram regexes de heading que toleram prefixos como `## 3) ...`. Qualquer outra coisa no arquivo é documentação e não é aplicada.

| Saída | Significado |
|---|---|
| `0` | todos os checks passaram |
| `1` | um check falhou; o agent corrige só as partes que falharam |
| `2` | spec quebrada: `computational` sem nenhum check que o runner entenda |
| `3` | `inferential`; o runner recusa e quem chama registra `inferential`, nunca `pass` |

Um hook PostToolUse roda o runner ao salvar e devolve o feedback ao agent. A comparação de headings ignora um parêntese no final, então `## Design doc, required sections (all present, in order)` resolve para `Required sections`. O bug original: o runner só aceitava `(all must be present, in order)`, três sensors escreviam `(all present, in order)`, e cerca de 30 asserções não faziam nada.

# Por que determinístico

Um sensor não custa tokens, dá a mesma resposta toda vez e deixa para o [eval](Evals) só o que precisa de julgamento semântico. Torne determinístico o que puder, infira só o que precisar.

# Sensors por stage

| Stage | Sensors |
|---|---|
| `prd` | `prd-structure`, `prd-acceptance-criteria` |
| `prp` | `prp-structure`, `prp-context-quality`, `prp-links` (roda `link-validator.py`) |
| `plan` | `plan-structure` |
| `dev` | `dev-structure`, `code-maintainability`, `code-conventions` e `test-coverage` (ambos inferential) |
| `test` | `test-structure` |
| `pr` | `pr-structure` |
| entrada do `sdd` | `prp-has-acceptance-criteria` (inferential) |
| system design | `design-structure`, `review-structure`, `design-rigor` (inferential) |

`code-maintainability` checa código. Ele roda o que o repo configura (npm `lint` e `typecheck`, ruff, ktlint, checkstyle, gitleaks), nunca uma config imposta, e sai com 4 (não checado) quando não encontra nada que conheça. `design-rigor` quer metas numéricas, contas de back-of-envelope, três trade-offs e uma fase de vertical slice; isso exige julgamento, então ele é `inferential`.

# Escrevendo um sensor

Declare `Execution:` com honestidade: se o runner não consegue checar, é `inferential`. Coloque os checks computacionais nas cinco seções lidas pelo runner, mantenha-os objetivos e use forbidden tokens para pegar placeholders como `{N}` e `TBD`. Escreva a mensagem de falha como uma instrução, por exemplo "missing required section: 'Success Metrics'".

Rode `python3 .claude/scripts/check-sensors.py` antes de commitar. O CI também roda, e um teste garante que todo sensor computacional rejeita um artefato vazio.

# Veja também

[Evals](Evals), [Harness Engineering](Harness-Engineering), [Referências](References). Fonte: Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html).
