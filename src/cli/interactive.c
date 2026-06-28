#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "toktrim.h"

// ANSI Colors
#define C_RESET   "\033[0m"
#define C_BOLD    "\033[1m"
#define C_GREEN   "\033[32m"
#define C_YELLOW  "\033[33m"
#define C_CYAN    "\033[36m"
#define C_RED     "\033[31m"
#define C_GRAY    "\033[90m"

static const char* interactive_default_state_dir(void) {
    static char default_state_dir[512];
    char* home = getenv("HOME");

    if (!home) {
        return NULL;
    }

    snprintf(default_state_dir, sizeof(default_state_dir), "%s/.cache/opencode/toktrim", home);
    return default_state_dir;
}

void clear_screen() {
    printf("\033[H\033[J");
}

int run_interactive(toktrim_config_t* cfg) {
    char input[256];
    int choice = -1;
    run_context_t rctx;

    rctx.session_id = "interactive";
    rctx.state_dir = interactive_default_state_dir();
    rctx.json_out = 0;

    while (1) {
        printf("\n");
        printf("  %s╭────────────────────────────────────────────────────────╮%s\n", C_CYAN, C_RESET);
        printf("  %s│%s                 %sTOKTRIM CONTROL PLANE%s                 %s│%s\n", C_CYAN, C_RESET, C_BOLD, C_RESET, C_CYAN, C_RESET);
        printf("  %s├────────────────────────────────────────────────────────┤%s\n", C_CYAN, C_RESET);
        printf("  %s│%s  Selecione uma acao:                                   %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s                                                        %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  1. Ver Status do Projeto e Configuracoes Locais       %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  2. Healthcheck (TokTrim Doctor)                       %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  3. Rodar Otimizador em Diretorio (RepoMix)            %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  4. Rodar Benchmark de Economia Real (Pasta Atual)     %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  0. Sair                                               %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s╰────────────────────────────────────────────────────────╯%s\n", C_CYAN, C_RESET);
        printf("\n  %s>%s ", C_YELLOW, C_RESET);

        if (!fgets(input, sizeof(input), stdin)) {
            break;
        }

        choice = atoi(input);

        switch (choice) {
            case 1:
                run_status(cfg, &rctx);
                break;
            case 2:
                run_doctor(&rctx);
                break;
            case 3:
                {
                    char dirpath[256];
                    printf("\n  %sDigite a pasta para otimizar (ex: src, ou .):%s ", C_YELLOW, C_RESET);
                    if (fgets(dirpath, sizeof(dirpath), stdin)) {
                        dirpath[strcspn(dirpath, "\n")] = 0; // remove newline
                        if (strlen(dirpath) > 0) {
                            run_optimize("repo", dirpath, cfg, &rctx);
                        }
                    }
                }
                break;
            case 4:
                {
                    char dirpath[256];
                    printf("\n  %sDigite a pasta para benchmark (ex: src, ou .):%s ", C_YELLOW, C_RESET);
                    if (fgets(dirpath, sizeof(dirpath), stdin)) {
                        dirpath[strcspn(dirpath, "\n")] = 0; // remove newline
                        if (strlen(dirpath) > 0) {
                            run_benchmark("repo", dirpath, cfg, &rctx);
                        }
                    }
                }
                break;
            case 0:
                printf("\n  Saindo do TokTrim...\n\n");
                return 0;
            default:
                printf("\n  %s[!] Opcao invalida.%s\n", C_RED, C_RESET);
                break;
        }
        
        printf("\n  %sPressione [ENTER] para continuar...%s", C_GRAY, C_RESET);
        fgets(input, sizeof(input), stdin);
        clear_screen();
    }
    return 0;
}
