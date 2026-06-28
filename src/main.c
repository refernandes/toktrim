#include "toktrim.h"

void print_help() {
    printf("TokTrim v1 - Economy Control Plane\n\n");
    printf("Uso: toktrim <subcomando> [opcoes]\n\n");
    printf("Comandos principais:\n");
    printf("  doctor                Verifica dependencias (npm, python, etc)\n");
    printf("  install <tool>        Instala provedores (ex: repomix, headroom)\n");
    printf("  status                Mostra provedores e config local\n");
    printf("  estimate --type <t> --input <f> Simula a economia de tokens/custo\n");
    printf("  optimize --type <t> --input <f> Executa compressao c/ provider ideal\n");
    printf("\nOpcoes globais:\n");
    printf("  --json                Saida em JSON para automacao\n");
    printf("  --session-id <id>     Identificador da sessao atual\n");
    printf("  --state-dir <path>    Diretorio de estado do TokTrim\n");
}

int main(int argc, char** argv) {
    toktrim_config_t cfg;
    run_context_t rctx;
    load_default_config(&cfg);
    parse_local_config(".toktrim/config.toml", &cfg);

    if (argc < 2) {
        return run_interactive(&cfg);
    }

    cli_context_t ctx;
    if (parse_args(argc, argv, &ctx) != 0) {
        print_help();
        return 1;
    }

    rctx.session_id = ctx.session_id ? ctx.session_id : "default";
    rctx.state_dir = ctx.state_dir;
    rctx.json_out = ctx.json_output;

    switch (ctx.cmd) {
        case CMD_DOCTOR:
            return run_doctor(&rctx);
        case CMD_INSTALL:
            return run_install(ctx.target);
        case CMD_STATUS:
            return run_status(&cfg, &rctx);
        case CMD_ESTIMATE:
            return run_estimate(ctx.type, ctx.input, &cfg, &rctx);
        case CMD_OPTIMIZE:
            return run_optimize(ctx.type, ctx.input, &cfg, &rctx);
        case CMD_BENCHMARK:
            return run_benchmark(ctx.type, ctx.input, &cfg, &rctx);
        default:
            print_help();
            return 1;
    }

    return 0;
}
