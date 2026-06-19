<div align="center">
  <img src="https://via.placeholder.com/150/8A2BE2/FFFFFF?text=TokTrim" width="120" />
  <h1>TokTrim</h1>
  <p><b>Token Economy & Context Engineering Stack for AI Agents</b></p>
</div>

---

**TokTrim** é a suíte de ferramentas definitiva para otimizar o consumo de tokens e o "Context Window" de agentes de inteligência artificial (como Google Antigravity e Anthropic Claude Code). O TokTrim fornece uma camada de orquestração que evita que a IA leia arquivos desnecessários, comprima logs gigantescos e entenda repositórios complexos utilizando grafos de dependência.

## 🚀 O que o TokTrim faz?

Em vez de permitir que a IA use um simples `grep` ou leia dezenas de arquivos, o TokTrim injeta um protocolo e um conjunto de ferramentas que forçam a IA a agir de maneira cirúrgica:

1. **RTK (Rust Token Killer):** Filtra ruídos em saídas de terminal. (Economiza 90% dos tokens de log)
2. **Repomix:** Gera um mapa estrutural (AST) da arquitetura, sem precisar ler o conteúdo do código em si.
3. **Headroom Compressor:** Minifica e comprime grandes saídas de texto ou códigos ofuscados usando IA-driven AST minification.
4. **Codebase Memory MCP:** O cérebro de grafos da operação. Impede a IA de fazer greps cegos.

## 🧠 Deep Dive: Codebase Memory MCP
A maior parte do desperdício de tokens ocorre quando a IA precisa entender **quem chama uma função e quais são seus efeitos colaterais**, forçando a leitura de dezenas de arquivos completos. O **TokTrim** provisiona o repositório oficial da DeusData (`codebase-memory-mcp`) para transformar o seu código num **Knowledge Graph Neo4j**.

A partir do momento em que o TokTrim é ativado, a IA passa a contar com ferramentas cirúrgicas nativas (MCP Tools):
- \`search_graph\`: Busca funções, classes, rotas ou variáveis por padrão regex sem abrir nenhum arquivo.
- \`trace_path\`: Rastreia toda a árvore de quem chama e o que uma função chama (inbound/outbound), vital para debugar.
- \`get_code_snippet\`: Lê exata e unicamente o bloco de código da função/classe solicitada, economizando 99% dos tokens de leitura de arquivo.
- \`get_architecture\`: Retorna o resumo de alto nível da arquitetura.

Ao proibir a IA de ler arquivos integrais e forçá-la a usar o Grafo, o TokTrim permite trabalhar em projetos *Enterprise* gigantescos com o custo e a performance de um script de 10 linhas.

## 💻 Compatibilidade Multi-Agente

O TokTrim é compatível com os principais agentes do mercado:

- **Google Antigravity:** Injeção global transparente via `AGENTS.md` e pastas nativas de `.gemini/config`.
- **Claude Code (Anthropic):** Injeção local por projeto via criação do template `CLAUDE.md`.
- **Cursor / Windsurf / Cline:** Plenamente suportado através das regras injetadas e do MCP Codebase Memory.

## 🛠 Como Instalar

O TokTrim oferece um dashboard Web de última geração para gerenciar suas skills e instalações!

```bash
# 1. Clone o repositório
git clone https://github.com/refernandes/toktrim.git
cd toktrim

# 2. Abra a interface de Gerência (Web UI)
cd dashboard
npm install
npm run dev
```

Você também pode instalar diretamente via CLI:
```bash
./install.sh
```

---
*TokTrim - Engenharia de Contexto Inteligente.*
