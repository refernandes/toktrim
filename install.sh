#!/bin/bash
# install.sh - Antigravity Skill Economy Deployment

echo "🚀 Iniciando a instalação do protocolo HYPERDRIVE (Token Economy)..."

# 1. Configurando Diretórios
GEMINI_DIR="$HOME/.gemini/config"
SKILLS_DIR="$GEMINI_DIR/skills"
MCP_DIR="$HOME/.gemini/antigravity-cli/mcp"

mkdir -p "$SKILLS_DIR"
mkdir -p "$MCP_DIR"

# 2. Instalando Dependências CLI (Os Motores Reais)
echo "⚙️  Instalando motores de compressão e CLIs reais..."

# Repomix (Gerador de AST/Mapas)
if ! command -v repomix &> /dev/null; then
    echo "📦 Instalando repomix globalmente..."
    npm install -g repomix
else
    echo "✔️  Repomix já instalado."
fi

# RTK e Headroom (Avisos de compilação)
if ! command -v rtk &> /dev/null; then
    echo "⚠️  RTK (Rust Token Killer) não encontrado no PATH."
    echo "👉 Recomendação: Execute 'cargo install rtk' (ou clone o repositório original do RTK e faça o build)."
fi

if [ ! -f "$MCP_DIR/headroom_env/bin/headroom" ]; then
    echo "⚠️  Headroom Compressor não encontrado no diretório do MCP."
    echo "👉 Recomendação: Instale o ambiente virtual Python do Headroom em $MCP_DIR/headroom_env"
fi

# Codebase Memory MCP (DeusData)
if [ ! -d "$MCP_DIR/codebase-memory-mcp" ]; then
    echo "🧠 Clonando Codebase Memory MCP (DeusData)..."
    git clone https://github.com/DeusData/codebase-memory-mcp.git "$MCP_DIR/codebase-memory-mcp"
    echo "👉 Codebase MCP instalado em $MCP_DIR/codebase-memory-mcp. Talvez seja necessário rodar npm install ou pip install lá dentro dependendo da stack."
else
    echo "✔️  Codebase Memory MCP já presente."
fi

# 3. Copiando as Skills (Instruções do Agente)
echo "📦 Instalando Skills de Economia..."
cp -r ./headroom-economy "$SKILLS_DIR/"
cp -r ./repomap-economy "$SKILLS_DIR/"

echo "✅ Skills copiadas para $SKILLS_DIR"

# 3. Injetando a Regra Global
AGENTS_FILE="$GEMINI_DIR/AGENTS.md"

HYPERDRIVE_RULE="
<RULE[user_global_hyperdrive]>
# HYPERDRIVE: Master Protocol & Token Economy

## 1. Initial Engagement Protocol
**ALWAYS start every new conversation or task by asking the user for context.**
Before executing code, writing files, or blindly guessing the architecture, you MUST ask:
1. \"Qual é o contexto inicial?\" (What is the big picture?)
2. \"Existe alguma stack específica ou blueprint/documentação a seguir?\"
Do not write code until the user provides the blueprint or confirms you can proceed.

## 2. The Exodia Token Economy Stack (Always Active)
You are equipped with the ultimate Context Engineering stack. You MUST use these tools implicitly for all operations:

- **RTK (Rust Token Killer):** ALWAYS prefix CLI commands with \`rtk\` (e.g., \`rtk npm run build\`, \`rtk grep \"foo\"\`, \`rtk log\`). This filters noise and saves 90% of tokens.
- **Repomix (RepoMap):** When entering a new project or searching for architecture, NEVER read random files. Run \`repomix --compress --no-files\` to generate a lightweight AST map of the repository, read it, and then target specific files.
- **Headroom (AST Compressor):** When forced to read large log files or complex unmapped source code, use the Headroom CLI (\`/Users/refernan/.gemini/antigravity-cli/mcp/headroom_env/bin/headroom\`) to minify the context before ingesting it.
- **Codebase-Memory-MCP:** Always use your \`codebase-memory-mcp\` tools (\`trace_path\`, \`search_graph\`) to understand side-effects and relations instead of relying on regex grep.

Use this stack proactively to maintain Maximum Viable Context with minimal tokens.
</RULE[user_global_hyperdrive]>
"

if [ ! -f "$AGENTS_FILE" ]; then
    echo "📄 Criando AGENTS.md..."
    echo "$HYPERDRIVE_RULE" > "$AGENTS_FILE"
else
    if grep -q "HYPERDRIVE: Master Protocol" "$AGENTS_FILE"; then
        echo "⚠️ A regra HYPERDRIVE já existe em AGENTS.md. Pulando injeção."
    else
        echo "💉 Injetando regra HYPERDRIVE no AGENTS.md existente..."
        echo "$HYPERDRIVE_RULE" >> "$AGENTS_FILE"
    fi
fi

echo "🎉 Instalação Concluída! O seu Agente agora está rodando no modo Hyperdrive Economy."
