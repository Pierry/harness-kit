# Referências

Cada fonte aqui mudou alguma coisa no código.

# O harness

Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (martinfowler.com), é a base: guides são feedforward, sensors são feedback, e os dois são computacionais (determinísticos) ou inferenciais (julgamento de modelo). O `Execution: computational | inferential` em cada sensor é essa taxonomia levada ao pé da letra.

Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html) (martinfowler.com), custou três commits. Primeiro, *"the agent reliably ignores sensor checks unless hardwired via hooks or extensions"*, e guides em markdown sozinhos são *"quite unreliable"*. O `code-conventions.md` pedia ao agent que rodasse o linter; o [`code-maintainability`](Sensors) agora roda.

Segundo, o alerta dela sobre *"a false sense of security and an illusion of quality"*. O harness-kit tinha construído isso: sensors que se diziam gates determinísticas e rígidas sem checar nada, e um log de qualidade registrando `passed` em toda run. Daí vieram o exit 3 (`inferential`, nunca um pass) e o exit 2 (um sensor computacional sem check ligado está quebrado).

Terceiro, os limites de complexidade (máximo de argumentos, tamanho de arquivo, tamanho de função, complexidade ciclomática) *"weren't even active in ESLint's default preset"*. O Ruff é igual. Agora eles estão em `pyproject.toml`, o CI roda, e acharam dívida real na hora. O alerta dela sobre excesso de feedback, *"sending it into a spiral of over-engineered refactorings"*, é o motivo de a única violação encontrada virar um ignore por arquivo, nomeado e com o motivo escrito, em vez de um refactor de código sem testes.

Fowler, [Agentic Programming](https://martinfowler.com/bliki/AgenticProgramming.html) (martinfowler.com): humanos param de digitar código e passam a revisá-lo, *"still responsible for what the software does"*. É por isso que as duas gates humanas ficam onde ficam.

# Evals e o judge

Wataoka et al., [Self-Preference Bias in LLM-as-a-Judge](https://arxiv.org/abs/2410.21819), e Panickssery et al., [LLM Evaluators Recognize and Favor Their Own Generations](https://arxiv.org/abs/2404.13076), mostram que um judge dá nota maior à saída da própria família do que humanos dão; um avaliador novo não resolve isso. Daí o `/hk:eval jev`: o Jev, da [TypeSafe AI](https://typesafe.ai), é de outra família, o que reduz o viés sem eliminá-lo.

[CheckEval](https://arxiv.org/abs/2403.18771) e [TICK](https://arxiv.org/abs/2410.03608) mostram que checklists atômicos de sim ou não aumentam a concordância entre judges. Por isso toda dimensão de rubric agora tem linhas `- check:` e `- absent:` e pontua a fração de checks atendidos.

Jung et al., [Trust or Escalate](https://arxiv.org/abs/2407.18370), é o motivo de uma run do Jev escalar para o avaliador Claude quando respostas incertas podem inverter pass ou fail. A [orientação do Jev 1.13](https://docs.typesafe.ai/model-jaggedness/jev-1.13) (um julgamento por pergunta, sem contagem, filtrar estado) moldou como os checks são escritos e por que o artefato é enviado dividido por seção.

Husain, [Using LLM-as-a-Judge for evaluation](https://hamel.dev/blog/posts/llm-judge/) e [Your AI product needs evals](https://hamel.dev/blog/posts/evals/), argumenta que escalas de 1 a 10 sem calibração significam coisas diferentes para avaliadores diferentes, e que a confiança vem da concordância medida com rótulos humanos, cerca de 100 por modo de falha. O harness-kit ainda não tem rótulos humanos; 8.0 é uma convenção, não um limite calibrado, como diz o [pipeline-pattern.md](https://github.com/Pierry/harness-kit/blob/main/.claude/shared/pipeline-pattern.md). O log `jev-judge.jsonl` começa esse conjunto, e o `eval-score.py` faz a aritmética ser calculada em vez de julgada.

# Testando o próprio harness

O harness-kit colocava gate em todo artefato que produzia e não tinha nada colocando gate nele mesmo: sem testes, sem CI, sem linter. Uma diferença de uma palavra num título desligou cerca de 30 asserções de seção em três sensors, e ninguém percebeu. O teste que pega isso tem quatro linhas e roda sobre todo sensor, inclusive os que ainda não foram escritos. O harness precisa de um harness.

# O cânone de engenharia (system-architect)

O [método de system design](System-Design-Method) se apoia em Kleppmann (*Designing Data-Intensive Applications*), nos números de latência de Jeff Dean, em Vogels sobre consistência eventual, em Helland sobre dados de fora versus dados de dentro, em Nygard (*Release It!*) sobre stability patterns e em Ousterhout (*A Philosophy of Software Design*) sobre complexidade. Eles moldam a rubric de design e as dez perguntas de staff.

# Veja também

[Harness Engineering](Harness-Engineering), [Sensors](Sensors), [Evals](Evals), [Pipelines dos agents](Agent-Pipelines).
