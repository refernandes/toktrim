<div align="center">
  <h1>TokTrim</h1>
  <p><b>A C-based Context Engineering & Token Economy Stack</b></p>
</div>

---

> **Aviso de Atribuição e Agradecimentos:**
> O TokTrim não é a invenção da roda, mas sim um **encapsulamento arquitetural**. Ele foi construído reunindo e orquestrando ideias brilhantes da comunidade Open Source para resolver um problema real: agentes de IA lendo lixo de terminal e estourando Context Windows. Agradecimentos imensos aos criadores originais que inspiram esta stack:
> - [Repomix (Yamada)](https://github.com/yamadashy/repomix)
> - [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk)
> - [Codebase Memory MCP (DeusData)](https://github.com/DeusData/codebase-memory-mcp)
> - [Headroom (Chopra Tejas)](https://github.com/chopratejas/headroom)
> - [Token Savior (Mibayy)](https://github.com/mibayy/token-savior) pela profunda inspiração na filosofia de *Token Economy*!

---

**TokTrim** é uma suíte de alta performance desenvolvida para otimizar drasticamente o consumo de tokens e a gestão da "Context Window" de agentes como Google Antigravity e Claude Code.

## 🚀 Como o TokTrim Funciona?

O TokTrim injeta um ecossistema rigoroso que força a IA a extrair apenas a inteligência bruta de um repositório, parando o desperdício de tokens com *greps* cegos ou leituras de arquivos massivos:

1. **RTK (Rust Token Killer):** CLI que filtra ruídos de outputs de terminal (`pytest`, `git`, `npm`). Caso um comando fuja do escopo parseável, o RTK possui **fallback imediato** retornando a saída raw, prevenindo perdas de dados críticas em CLIs legadas.
2. **Repomix:** Gera um Abstract Syntax Tree (AST) estrutural. Em vez da IA ler todo o código, ela lê apenas o mapa.
3. **Headroom Compressor:** Pipeline de minificação AST. **Atenção:** O Headroom opera em modo estritamente **Read-Only** (ele comprime os logs/arquivos apenas para envio à Context Window do LLM, não altera os arquivos no seu disco). Risco zero de apagar código acidentalmente.
4. **Codebase Memory MCP:** Substitui a burocracia do `grep`. A IA passa a consultar o Grafo Neo4j (quem chama quem), gastando tokens apenas para ler as funções solicitadas. Em projetos menores, este componente pode ser considerado "overkill", mas brilha em repositórios massivos.
5. **TokTrim Memory MCP:** Um Micro-MCP nativo (1 único arquivo) que provê **Memória Persistente**. Salva decisões de arquitetura em um banco SQLite + FTS5 local. Evita os monólitos pesados de outras soluções do mercado.

## 💻 Painel Interativo em C

O gerenciamento do ecossistema TokTrim ocorre no terminal, através de uma CLI escrita em C puro. Focamos na segurança e velocidade, portanto, o projeto conta com um `Makefile` configurado com flags rigorosas (`-Wall -Wextra -Werror -fsanitize=address`).

### Compilando e Rodando (Guia Rápido)

```bash
# 1. Clone o repositório
git clone https://github.com/refernandes/toktrim.git
cd toktrim

# 2. Compile com as regras de segurança estritas (Address Sanitizer ativo)
make

# 3. Execute
./toktrim
```

### O Menu do Painel
O utilitário `toktrim` exibirá um menu limpo:
- `[1]` Instalar Repomix
- `[2]` Compilar e Instalar RTK (Rust)
- `[3]` Provisionar Headroom Engine
- `[4]` Provisionar Codebase-Memory-MCP (Neo4j)
- `[5]` Provisionar TokTrim Memory MCP (Micro-Grafo SQLite FTS5)
- `[6]` Atualizar Regras Globais do Agente (Google Antigravity)
- `[7]` Instalar Tudo Automaticamente

## 🤖 Como Usar nos seus Agentes (Limitações e Regras)

- **Google Antigravity:** A Opção `6` injeta a regra TokTrim de forma global. Cuidado com conflitos: O TokTrim injeta no topo do seu `AGENTS.md`. Verifique se você não possui regras concorrentes.
- **Claude Code (Anthropic):** A CLI exporta um template chamado `CLAUDE.md` em `~/.gemini/config/templates/`.
  - **Uso:** Rode `cp ~/.gemini/config/templates/CLAUDE.md ./CLAUDE.md` na raiz de qualquer projeto novo para injetar o protocolo de economia no Claude.

---
*Construído com base em ideias incríveis e testado em campo de batalha.*
