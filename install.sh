#!/bin/bash
# install.sh - TokTrim Deployment & Management

echo "🚀 Iniciando a instalação do TokTrim (Token Economy Stack)..."

# 1. Configurando Diretórios
GEMINI_DIR="$HOME/.gemini/config"
SKILLS_DIR="$GEMINI_DIR/skills"
MCP_DIR="$HOME/.gemini/antigravity-cli/mcp"

mkdir -p "$SKILLS_DIR"
mkdir -p "$MCP_DIR"

# 2. Instalando Dependências CLI (Os Motores Reais)
echo "⚙️  Instalando motores de compressão e CLIs reais diretamente da fonte..."

# 2.1 Repomix (Yamada - Oficial via NPM)
echo "📦 Baixando e instalando repomix..."
npm install -g repomix

# 2.2 RTK (Rust Token Killer)
echo "🦀 Baixando e compilando RTK (Rust Token Killer)..."
if ! command -v rtk &> /dev/null; then
    # Clona do repositorio e compila
    git clone https://github.com/refernandes/rtk.git /tmp/rtk || echo "Falha ao clonar RTK. Verifique se o repo existe."
    if [ -d "/tmp/rtk" ]; then
        cd /tmp/rtk
        cargo build --release
        mkdir -p ~/.cargo/bin
        cp target/release/rtk ~/.cargo/bin/
        cd - > /dev/null
        rm -rf /tmp/rtk
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
else
    echo "✔️  RTK já instalado."
fi

# 2.3 Headroom Compressor
echo "🧠 Baixando e provisionando Headroom Compressor..."
if [ ! -d "$MCP_DIR/headroom_env" ]; then
    git clone https://github.com/DeusData/headroom.git /tmp/headroom || echo "Falha ao clonar Headroom."
    if [ -d "/tmp/headroom" ]; then
        python3 -m venv "$MCP_DIR/headroom_env"
        source "$MCP_DIR/headroom_env/bin/activate"
        cd /tmp/headroom
        pip install -r requirements.txt || pip install .
        cd - > /dev/null
        rm -rf /tmp/headroom
        deactivate
    fi
else
    echo "✔️  Headroom já provisionado em $MCP_DIR/headroom_env."
fi

# 2.4 Codebase Memory MCP (DeusData)
echo "🧠 Baixando e provisionando Codebase Memory MCP (DeusData)..."
if [ ! -d "$MCP_DIR/codebase-memory-mcp" ]; then
    git clone https://github.com/DeusData/codebase-memory-mcp.git "$MCP_DIR/codebase-memory-mcp"
    cd "$MCP_DIR/codebase-memory-mcp"
    npm install
    npm run build
    cd - > /dev/null
else
    echo "✔️  Codebase Memory MCP já provisionado e buildado."
fi

# 3. Copiando as Skills (Instruções do Agente)
echo "📦 Instalando Skills de Economia..."
cp -r ./headroom-economy "$SKILLS_DIR/"
cp -r ./repomap-economy "$SKILLS_DIR/"

echo "✅ Skills copiadas para $SKILLS_DIR"

# 3. Injetando a Regra Global
AGENTS_FILE="$GEMINI_DIR/AGENTS.md"

TOKTRIM_RULE="
<RULE[user_global_toktrim]>
# TOKTRIM: Context Engineering & Token Economy

## 1. Initial Engagement Protocol
**ALWAYS start every new conversation or task by asking the user for context.**
Before executing code, writing files, or blindly guessing the architecture, you MUST ask:
1. \"Qual é o contexto inicial?\" (What is the big picture?)
2. \"Existe alguma stack específica ou blueprint/documentação a seguir?\"
Do not write code until the user provides the blueprint or confirms you can proceed.

## 2. The Exodia Token Economy Stack (Always Active)
You are equipped with the TokTrim engineering stack. You MUST use these tools implicitly for all operations:

- **RTK (Rust Token Killer):** ALWAYS prefix CLI commands with \`rtk\` (e.g., \`rtk npm run build\`, \`rtk grep \"foo\"\`, \`rtk log\`). This filters noise and saves 90% of tokens.
- **Repomix (RepoMap):** When entering a new project or searching for architecture, NEVER read random files. Run \`repomix --compress --no-files\` to generate a lightweight AST map of the repository, read it, and then target specific files.
- **Headroom (AST Compressor):** When forced to read large log files or complex unmapped source code, use the Headroom CLI (\`~/.gemini/antigravity-cli/mcp/headroom_env/bin/headroom\`) to minify the context before ingesting it.
- **Codebase-Memory-MCP:** Always use your \`codebase-memory-mcp\` tools (\`trace_path\`, \`search_graph\`) to understand side-effects and relations instead of relying on regex grep.

Use this stack proactively to maintain Maximum Viable Context with minimal tokens.
</RULE[user_global_toktrim]>
"

if [ ! -f "$AGENTS_FILE" ]; then
    echo "📄 Criando AGENTS.md..."
    echo "$TOKTRIM_RULE" > "$AGENTS_FILE"
else
    if grep -q "TOKTRIM: Context Engineering" "$AGENTS_FILE"; then
        echo "⚠️ A regra TOKTRIM já existe em AGENTS.md. Pulando injeção."
    else
        echo "💉 Injetando regra TOKTRIM no AGENTS.md existente..."
        echo "$TOKTRIM_RULE" >> "$AGENTS_FILE"
    fi
fi

# 4. Suporte para Claude Code (Anthropic)
echo "🤖 Configurando suporte nativo para o Claude Code..."
CLAUDE_TEMPLATE_DIR="$GEMINI_DIR/templates"
mkdir -p "$CLAUDE_TEMPLATE_DIR"
CLAUDE_TEMPLATE_FILE="$CLAUDE_TEMPLATE_DIR/CLAUDE.md"

echo "$TOKTRIM_RULE" > "$CLAUDE_TEMPLATE_FILE"

echo "✅ O template universal para o Claude Code foi salvo em: $CLAUDE_TEMPLATE_FILE"
echo "💡 DICA: Quando for iniciar um projeto novo no Claude Code, rode 'cp $CLAUDE_TEMPLATE_FILE ./CLAUDE.md' na raiz do projeto para ele herdar o protocolo TokTrim."

echo "🎉 Instalação Concluída! Todo seu ecossistema (Antigravity & Claude Code) está pronto para operar em modo TokTrim Economy."
