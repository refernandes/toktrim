#include "toktrim.h"

int parse_args(int argc, char** argv, cli_context_t* ctx) {
    memset(ctx, 0, sizeof(cli_context_t));
    
    if (strcmp(argv[1], "doctor") == 0) {
        ctx->cmd = CMD_DOCTOR;
    } else if (strcmp(argv[1], "install") == 0) {
        ctx->cmd = CMD_INSTALL;
        if (argc >= 3) {
            ctx->target = argv[2];
        } else {
            return -1;
        }
    } else if (strcmp(argv[1], "status") == 0) {
        ctx->cmd = CMD_STATUS;
    } else if (strcmp(argv[1], "estimate") == 0) {
        ctx->cmd = CMD_ESTIMATE;
    } else if (strcmp(argv[1], "optimize") == 0) {
        ctx->cmd = CMD_OPTIMIZE;
    } else if (strcmp(argv[1], "benchmark") == 0) {
        ctx->cmd = CMD_BENCHMARK;
    } else {
        return -1;
    }

    // parse flags --type --input --json
    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "--type") == 0 && i + 1 < argc) {
            ctx->type = argv[++i];
        } else if (strcmp(argv[i], "--input") == 0 && i + 1 < argc) {
            ctx->input = argv[++i];
        } else if (strcmp(argv[i], "--json") == 0) {
            ctx->json_output = 1;
        }
    }

    if ((ctx->cmd == CMD_ESTIMATE || ctx->cmd == CMD_OPTIMIZE || ctx->cmd == CMD_BENCHMARK) && (!ctx->type || !ctx->input)) {
        log_error("Erro: Comandos estimate, optimize e benchmark requerem --type e --input\n");
        return -1;
    }

    return 0;
}
