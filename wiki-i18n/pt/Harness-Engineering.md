# Harness Engineering

# Agent = Model + Harness

O harness é tudo num coding agent exceto o modelo.

```
Agent = Model + Harness
```

O harness são os guides, ferramentas, checks, permissões, memória e contexto em volta do modelo. Você raramente muda o modelo; você muda o harness, para que uma boa saída fique mais provável e o agent se corrija antes que uma pessoa veja o resultado.

Fonte: Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), na série *Exploring Gen AI* de Martin Fowler (2026). O texto complementar, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html), desenvolve a metade dos sensors.

# Feedforward e feedback

Controles feedforward conduzem o agent antes de ele agir: guias de estilo, templates, convenções, exemplos. No harness-kit eles são os [guides](Guides). Controles de feedback observam depois que ele age e deixam que ele se corrija: linters, testes, checagens de estrutura, reviews com nota. No harness-kit eles são os [sensors](Sensors) e os [evals](Evals). O feedback funciona melhor escrito para o modelo: "missing section X; add it with these fields".

# Controles computacionais e inferenciais

Controles computacionais são determinísticos: mesma entrada, mesmo veredito, baratos, cegos ao significado. Controles inferenciais usam um modelo para julgamento semântico, como saber se um design nomeia seus trade-offs; eles são probabilísticos e precisam de calibração.

A maioria dos sensors do harness-kit é computacional; os que precisam de julgamento declaram `Execution: inferential` e nunca reportam pass. Evals são inferenciais, pontuados por um avaliador Claude ou pelo Jev (veja [Evals](Evals)). Empurre para um sensor o que puder e deixe o eval para o significado.

# O que os controles regulam

Böckeler nomeia três dimensões: comportamento funcional (testes, critérios de aceite), manutenibilidade (linters, estrutura, estilo) e adequação de arquitetura (fitness functions, overrides de convenção). No harness-kit, sensors aplicam estrutura e convenções, evals pontuam clareza e rigor, e os arquivos `.claude/conventions/` por repo fixam a adequação de arquitetura.

# Humanos fora, dentro ou sobre o loop

Fora do loop, o agent entrega sem review, o que é raro e de alto risco. Dentro do loop (in the loop), uma pessoa revisa cada saída, o que limita o throughput à velocidade da review. Sobre o loop (on the loop), a pessoa mantém o harness e o harness revisa as saídas. O harness-kit foi feito para on the loop, a única postura que escala: você ajusta uma rubric uma vez, e quando o agent desvia você corrige o guide, não a saída.

# Como o harness-kit aplica isso

Cada stage de cada pipeline é um pequeno harness:

| Camada | Controle | O que faz | Onde |
|---|---|---|---|
| Guide | feedforward | como escrever | `guides/`, `templates/`, `examples/` |
| Referência | contexto | o que trazer | `AGENTS.md`, artefatos anteriores, `conventions/` |
| Sensor | computacional ou inferencial | estrutura que precisa passar, bloqueia a aprovação | `sensors/`, rodado por `sensor-runner.py` |
| Eval | inferencial | rubric ponderada de checks sim ou não, threshold 8.0, retry até 3 vezes | `evals/`, verificado por `eval-score.py` |

Um artefato só avança quando seus sensors passam e seu eval chega a 8.0, para PRDs, PRPs, plans, código, testes, PRs e System Design Docs. Guides, sensors e evals são markdown simples; só runners, scripts e hooks são código, então você pode ler e mudar o que é checado.

# Veja também

[Guides](Guides), [Sensores](Sensors), [Evals](Evals), [Pipeline e stages](Pipeline-and-Stages), [Golden Path](Golden-Path), [Referências](References).
