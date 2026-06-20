<div align="center">
  <h1>🧠 TokTrim v1</h1>
  <p><b>Economy Control Plane for Agentic Workflows</b></p>
</div>

---

## 🎯 O Que é o TokTrim?

O **TokTrim** é um motor local escrito em C de alta performance focado em uma única missão: **Maximizar a economia de contexto (Tokens) e dinheiro (USD) nas chamadas de IA sem perda de qualidade**.

Diferente de scripts ingênuos ou injetores de configuração global que causam *side-effects*, o TokTrim atua como um **Control Plane**. Ele calcula os custos locais, orquestra dinamicamente as melhores ferramentas de compressão do mercado (`Repomix`, `Headroom`) usando a sua própria CPU e fornece um benchmark claro do seu ROI antes de cada chamada.

## 💰 A Visão de Economia (Economy-First)

Por que usar o TokTrim? Porque enviar 80.000 tokens repetidos ou irrelevantes custa caro, causa degradação de contexto ("Lost in the Middle") e aumenta muito a latência da IA.

O TokTrim implementa o cálculo:
`Economia Líquida = Custo Baseline - Custo Otimizado - Latência Local`

- **Custo 0$ em Decisão:** A ferramenta roda localmente na sua máquina (`C` e `execvp`), garantindo que o Agente receba o input filtrado.
- **Transparência Absoluta:** O comando `toktrim estimate` te diz exatamente quantos tokens você vai economizar *antes* de executar a tarefa.
- **Opt-in por Projeto:** Suas regras residem no arquivo `.toktrim/config.toml` do seu repositório. O TokTrim não altera seu ambiente global e não injeta dogmas.

---

## 🏗️ Arquitetura e Engenharia (>90/100)

O TokTrim v1 abandonou o velho fluxo de instaladores de shell acoplados. A engenharia foi refeita sob padrões robustos:

1. **CLI Modular (`src/cli`)**: Parser escalável (`doctor`, `estimate`, `optimize`, `benchmark`, `status`).
2. **Execução Segura (`src/util/safe_exec.c`)**: Zero uso de `system()`. Invocação limpa nativa de Linux/macOS com `fork()` e `execvp()`.
3. **Desacoplamento de Providers (`src/providers`)**: Repomix e Headroom agora são módulos plugáveis com interface padrão (`provider_vtbl_t`). Facilidade para plugar novos *minimizers*.
4. **Configuração Previsível (`src/config`)**: Políticas declaradas puramente em TOML. Fallback local vs global limpo.

---

## 🚀 Instalação e Uso

### Build Local
```bash
make
```

### Comandos Principais (CLI)

* **Status e Políticas Locais:**
  ```bash
  ./toktrim status
  ```
  *Lê seu `.toktrim/config.toml` e informa quais engines estão habilitadas para o diretório atual.*

* **Estimar Economia (Sem Mutação):**
  ```bash
  ./toktrim estimate --type repo --input src
  ```
  *Exibe um painel de inteligência de custos com a projeção de tokens salvos usando a melhor policy do projeto.*

* **Otimizar Contexto Real:**
  ```bash
  ./toktrim optimize --type logs --input build.log
  ```
  *Delega de forma inteligente para a ferramenta escolhida (Ex: Repomix para codebase, Headroom para traces).*

* **Benchmark Real:**
  ```bash
  ./toktrim benchmark --type repo --input .
  ```
  *Roda o pipeline completo, calcula o baseline, executa as reduções e apresenta um dashboard comparativo de tokens descartados, comprovando até 80%+ de ganho financeiro.*

---

## 🔧 Configuração Opt-In (`.toktrim/config.toml`)

No diretório raiz do seu projeto, crie o arquivo com as políticas:

```toml
[project]
name = "my-awesome-repo"

[budget]
max_tokens_per_task = 40000

[providers.repomix]
enabled = true
compress = true

[providers.headroom]
enabled = true
mode = "wrap"

[policy]
preset = "balanced"
```

> **Aviso de Engenharia:** O TokTrim não mais força comportamentos universais. Ele opera estritamente nas regras que você confia no seu repositório, garantindo controle de versão e isolamento.

---

## 🧪 Suíte de Testes e Benchmark

O TokTrim acompanha tanto **testes unitários** (garantindo que o core do parser funcione corretamente) quanto uma **suíte de benchmark** ostensiva (`scripts/comprehensive_benchmark.sh`) que você pode rodar para constatar o ROI real na sua base de código.

```bash
chmod +x scripts/comprehensive_benchmark.sh
./scripts/comprehensive_benchmark.sh
```

---

<div align="center">
  <p><i>Desenvolvido seguindo princípios de arquitetura de software, observabilidade e performance.</i></p>
</div>
