<div align="center">
  <h1>TokTrim</h1>
  <p><b>A C-based Context Engineering & Token Economy Stack</b></p>
</div>

---

**TokTrim** é uma suíte de alta performance (gerenciada nativamente via C CLI) desenvolvida para otimizar drasticamente o consumo de tokens e a gestão da "Context Window" de agentes de inteligência artificial (como Google Antigravity e Anthropic Claude Code).

## 🚀 Por que TokTrim?

Em vez de permitir que a IA leia dezenas de arquivos inteiros ou rode comandos lentos e ruidosos no shell, o TokTrim injeta um ecossistema rigoroso que força a IA a extrair apenas a inteligência bruta:

1. **RTK (Rust Token Killer):** CLI em Rust que filtra ruídos e formatações longas de outputs de terminal.
2. **Repomix:** Gera um Abstract Syntax Tree (AST) e mapa estrutural da arquitetura do repositório em poucos tokens.
3. **Headroom Compressor:** Pipeline local de minificação por IA para remover dead-code e encurtar logs absurdos.
4. **Codebase Memory MCP:** O Neo4j Graph. Proíbe a IA de dar "grep" para entender funções. Ela passa a consultar o Grafo (quem chama quem), gastando apenas os tokens necessários para ler a fatia exata do código.
5. **TokTrim Memory MCP:** Um Micro-MCP nativo que provê **Memória Persistente**. Salva decisões de arquitetura e soluções de bugs usando um banco SQLite + FTS5, permitindo que a IA "lembre" do contexto em sessões futuras. Tudo isso em apenas um único arquivo Python, mantendo o ecossistema livre de monólitos burocráticos.

## 💻 Painel Interativo em C

Esqueça dashboards web lentos e burocráticos. O gerenciamento de todo o ecossistema TokTrim, desde o provisionamento dos servidores MCP até a compilação do Rust, ocorre diretamente no terminal através de uma CLI veloz escrita em C puro.

### Compilando e Rodando

Para iniciar o seu painel de instalação e gerência:

```bash
# 1. Clone o repositório
git clone https://github.com/refernandes/toktrim.git
cd toktrim

# 2. Compile o Painel
gcc toktrim.c -o toktrim

# 3. Execute
./toktrim
```

### O Menu do Painel
O utilitário `toktrim` exibirá um menu limpo:
- `[1]` Instalar Repomix
- `[2]` Compilar e Instalar RTK (Rust)
- `[3]` Provisionar Headroom Engine
- `[4]` Provisionar Codebase-Memory-MCP
- `[5]` Provisionar TokTrim Memory MCP (SQLite FTS5)
- `[6]` Atualizar Regras do Agente (Google Antigravity & Claude Code)
- `[7]` Instalar Tudo Automaticamente

## 🤖 Compatibilidade

- **Google Antigravity:** A Opção `5` da CLI automaticamente encontra a sua pasta oculta `.gemini/config/AGENTS.md` e injeta a regra TokTrim de forma global.
- **Claude Code (Anthropic):** A CLI também exporta um template pronto chamado `CLAUDE.md` em `~/.gemini/config/templates/`. Basta rodar `cp ~/.gemini/config/templates/CLAUDE.md ./CLAUDE.md` na raiz de qualquer projeto seu para que o Claude herde todo o protocolo de economia.

---
*Escrito em C. Construído para IAs de Alta Fidelidade.*
