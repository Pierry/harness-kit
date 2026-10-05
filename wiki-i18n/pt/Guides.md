# Guides

Guides conduzem o agent antes de ele agir. Eles são a metade feedforward do harness, markdown simples no diretório `guides/` de cada agent. Sensors e evals pegam um erro depois do fato e custam um retry; um guide evita o erro. Quando um artefato falha sempre no mesmo check do eval, corrija o guide antes de apertar o eval.

# Tipos de guide

| Guide | Papel |
|---|---|
| `pipeline.md` | as regras de operação de um agent: stages, política de retry, approval markers, contagem de tokens |
| `writing-style.md` | voz, palavras banidas, pontuação, tabelas versus bullets, mermaid em vez de ASCII (product-manager, system-architect) |
| `*-guidelines.md` | regras do artefato, como `prd-guidelines.md` e `prp-guidelines.md` |
| `templates/*.md` | o esqueleto que o artefato preenche |
| `examples/good-*.md` | um artefato pronto escrito no padrão |
| `design-method.md` | o método e o cânone do agent system-architect |
| `coding-style.md`, `commit-style.md` | regras de código e de commit do agent staff-software-engineer |
| `conventions-override.md` | como as convenções por repo se sobrepõem aos defaults do SSE |
| `sdd-loop.md` | o loop guiado por spec e seu predicado |

# Templates e exemplos

Um template é o controle feedforward mais forte: o agent preenche um esqueleto em vez de inventar uma forma. Um bom exemplo acrescenta a textura do trabalho pronto. O harness-kit traz `good-prd-example.md`, `good-prp-example.md` e `good-system-design-example.md`.

Guides, sensors e evals internos são escritos no estilo caveman enxuto para economizar tokens de entrada. Templates e exemplos ficam em inglês natural porque modelam artefatos que stakeholders leem.

# Convenções por repo

O agent staff-software-engineer tem defaults por disciplina. Um repo consumidor os sobrescreve com arquivos aqui:

```
{your-repo}/.claude/conventions/{backend,web,mobile,devops}.md
```

Quando um arquivo existe, o agent o lê por cima dos seus defaults e o projeto vence. Essa é a pavimentação por disciplina do [golden path](Golden-Path), e ela fixa a forma que o código precisa seguir.

# Voz e palavras banidas

`writing-style.md` bane os sinais comuns de texto de IA, como `delve`, `leverage`, `utilize` e `robust`, proíbe em dashes, exige mermaid em vez de ASCII e pede números, nomes e citações reais. Os evals aplicam as mesmas regras em código: regexes `- absent:` em cada rubric reprovam um check por uma palavra banida, um em dash ou um diagrama de caixas em ASCII sem perguntar ao judge. Veja [Evals](Evals).

# Escrevendo um bom guide

Seja concreto: "comece pela decisão, depois o motivo" ensina mais do que "escreva com clareza". Junte cada regra a um exemplo bom e um ruim de duas linhas. Dê ao agent um template para preencher em vez de dez regras em prosa. Quando o feedback de um sensor aponta para um guide, escreva o guide de modo que o agent consiga agir sobre ele no turno seguinte.

Veja também [Harness Engineering](Harness-Engineering), [Sensores](Sensors), [Evals](Evals).
