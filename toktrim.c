#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

void clear_screen() {
    printf("\033[H\033[J");
}

void print_header() {
    clear_screen();
    printf("=========================================================\n");
    printf("                  TOKTRIM CLI PANEL                      \n");
    printf("        Token Economy & Context Engineering Stack        \n");
    printf("=========================================================\n\n");
}

void install_repomix() {
    printf("[*] Instalando Repomix (NPM Global)...\n");
    system("npm install -g repomix");
    printf("[+] Repomix instalado com sucesso!\n\n");
}

void install_rtk() {
    printf("[*] Compilando RTK (Rust Token Killer)...\n");
    system("if ! command -v rtk &> /dev/null; then git clone https://github.com/refernandes/rtk.git /tmp/rtk && cd /tmp/rtk && cargo build --release && mkdir -p ~/.cargo/bin && cp target/release/rtk ~/.cargo/bin/ && cd - > /dev/null && rm -rf /tmp/rtk; else echo 'RTK ja instalado.'; fi");
    printf("[+] RTK processado!\n\n");
}

void install_headroom() {
    printf("[*] Provisionando Headroom Engine...\n");
    system("MCP_DIR=\"$HOME/.gemini/antigravity-cli/mcp\"; mkdir -p \"$MCP_DIR\"; if [ ! -d \"$MCP_DIR/headroom_env\" ]; then git clone https://github.com/DeusData/headroom.git /tmp/headroom && python3 -m venv \"$MCP_DIR/headroom_env\" && source \"$MCP_DIR/headroom_env/bin/activate\" && cd /tmp/headroom && pip install -r requirements.txt || pip install . && cd - > /dev/null && rm -rf /tmp/headroom; else echo 'Headroom ja provisionado.'; fi");
    printf("[+] Headroom processado!\n\n");
}

void install_codebase_mcp() {
    printf("[*] Provisionando Codebase-Memory-MCP...\n");
    system("MCP_DIR=\"$HOME/.gemini/antigravity-cli/mcp\"; mkdir -p \"$MCP_DIR\"; if [ ! -d \"$MCP_DIR/codebase-memory-mcp\" ]; then git clone https://github.com/DeusData/codebase-memory-mcp.git \"$MCP_DIR/codebase-memory-mcp\" && cd \"$MCP_DIR/codebase-memory-mcp\" && npm install && npm run build && cd - > /dev/null; else echo 'Codebase Memory MCP ja provisionado.'; fi");
    printf("[+] Codebase-Memory-MCP processado!\n\n");
}

void install_toktrim_memory() {
    printf("[*] Provisionando TokTrim Memory MCP (SQLite + FTS5)...\n");
    system("MCP_DIR=\"$HOME/.gemini/antigravity-cli/mcp\"; mkdir -p \"$MCP_DIR\"; if [ ! -d \"$MCP_DIR/toktrim-memory_env\" ]; then python3 -m venv \"$MCP_DIR/toktrim-memory_env\" && source \"$MCP_DIR/toktrim-memory_env/bin/activate\" && cp -r ./toktrim-memory /tmp/toktrim-memory && cd /tmp/toktrim-memory && pip install -r requirements.txt && cp server.py \"$MCP_DIR/toktrim-memory_env/\" && cd - > /dev/null && rm -rf /tmp/toktrim-memory; else echo 'TokTrim Memory MCP ja provisionado.'; fi");
    printf("[+] TokTrim Memory MCP processado!\n\n");
}

void inject_rules() {
    printf("[*] Injetando regras globais de economia de tokens...\n");
    const char* bash_cmd = 
    "GEMINI_DIR=\"$HOME/.gemini/config\"; "
    "mkdir -p \"$GEMINI_DIR\"; "
    "AGENTS_FILE=\"$GEMINI_DIR/AGENTS.md\"; "
    "RULE=\"\\n<RULE[user_global_toktrim]>\\n# TOKTRIM: Context Engineering & Token Economy\\n"
    "\\n## 1. Initial Engagement Protocol\\n**ALWAYS start every new conversation or task by asking the user for context.**\\n"
    "\\n## 2. The Exodia Token Economy Stack\\nYou MUST use these tools implicitly for all operations:\\n"
    "- **RTK (Rust Token Killer):** ALWAYS prefix CLI commands with rtk (e.g., rtk grep).\\n"
    "- **Repomix (RepoMap):** Run repomix --compress --no-files to generate a lightweight AST map.\\n"
    "- **Headroom (AST Compressor):** Use the Headroom CLI (~/.gemini/antigravity-cli/mcp/headroom_env/bin/headroom) to minify context.\\n"
    "- **Codebase-Memory-MCP:** Use your MCP tools (trace_path, search_graph) instead of grep.\\n"
    "</RULE[user_global_toktrim]>\\n\"; "
    "if [ ! -f \"$AGENTS_FILE\" ]; then echo -e \"$RULE\" > \"$AGENTS_FILE\"; else if ! grep -q 'TOKTRIM' \"$AGENTS_FILE\"; then echo -e \"$RULE\" >> \"$AGENTS_FILE\"; fi; fi; "
    "CLAUDE_DIR=\"$GEMINI_DIR/templates\"; mkdir -p \"$CLAUDE_DIR\"; echo -e \"$RULE\" > \"$CLAUDE_DIR/CLAUDE.md\";";

    system(bash_cmd);
    printf("[+] Regras injetadas no AGENTS.md e template CLAUDE.md gerado!\n\n");
}

void install_all() {
    install_repomix();
    install_rtk();
    install_headroom();
    install_codebase_mcp();
    install_toktrim_memory();
    inject_rules();
    printf("=========================================================\n");
    printf("   TODO O ECOSSISTEMA TOKTRIM FOI INSTALADO COM SUCESSO! \n");
    printf("=========================================================\n\n");
}

int main() {
    int choice;
    do {
        print_header();
        printf("Selecione uma opcao de gerenciamento:\n");
        printf("1. Instalar Repomix\n");
        printf("2. Compilar e Instalar RTK (Rust)\n");
        printf("3. Provisionar Headroom Engine\n");
        printf("4. Provisionar Codebase-Memory-MCP\n");
        printf("5. Provisionar TokTrim Memory MCP (SQLite FTS5)\n");
        printf("6. Atualizar Regras do Agente (Antigravity & Claude)\n");
        printf("7. Instalar Tudo Automaticamente\n");
        printf("0. Sair\n");
        printf("=========================================================\n");
        printf("> ");
        
        if (scanf("%d", &choice) != 1) {
            printf("Entrada invalida. Saindo...\n");
            break;
        }

        switch (choice) {
            case 1: install_repomix(); break;
            case 2: install_rtk(); break;
            case 3: install_headroom(); break;
            case 4: install_codebase_mcp(); break;
            case 5: install_toktrim_memory(); break;
            case 6: inject_rules(); break;
            case 7: install_all(); break;
            case 0: printf("Saindo do painel TokTrim...\n"); break;
            default: printf("Opcao invalida!\n"); break;
        }
        
        if (choice != 0) {
            printf("Pressione ENTER para continuar...");
            getchar(); // Limpa o buffer do scanf
            getchar(); // Espera a tecla
        }

    } while (choice != 0);

    return 0;
}
