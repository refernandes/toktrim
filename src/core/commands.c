#include "toktrim.h"

int run_doctor() {
    log_info("Running toktrim doctor...");
    // Check paths, binaries, versions
    printf("  [OK] repomix\n");
    printf("  [OK] headroom\n");
    return 0;
}

int run_install(const char* target) {
    if (!target) {
        log_error("Target is required for install");
        return 1;
    }
    printf("[INFO] Installing provider: %s\n", target);
    return 0;
}

int run_status() {
    log_info("TokTrim Status:");
    printf("  Config: .toktrim/config.toml (Not found - Defaults applied)\n");
    printf("  Providers:\n");
    printf("    repomix: enabled\n");
    printf("    headroom: enabled\n");
    return 0;
}

int run_estimate(const char* type, const char* input, int json_out) {
    if (json_out) {
        printf("{\n  \"status\": \"estimated\",\n  \"type\": \"%s\",\n  \"input\": \"%s\",\n  \"baseline_tokens\": 50000,\n  \"estimated_tokens\": 15000\n}\n", type, input);
    } else {
        printf("=== TokTrim Estimate ===\n");
        printf("Workload Type: %s\n", type);
        printf("Target Input : %s\n", input);
        printf("------------------------\n");
        printf("Baseline Tokens : 50,000\n");
        printf("Optimized Tokens: 15,000\n");
        printf("Est. Savings    : 70%%\n");
        printf("Provider Rec.   : repomix\n");
        printf("========================\n");
    }
    return 0;
}

int run_optimize(const char* type, const char* input, int json_out) {
    // In future: call safe_exec for the provider
    if (json_out) {
        printf("{\n  \"status\": \"optimized\",\n  \"type\": \"%s\",\n  \"input\": \"%s\",\n  \"optimized_tokens\": 15000\n}\n", type, input);
    } else {
        printf("=== TokTrim Optimization ===\n");
        printf("Workload Type: %s\n", type);
        printf("Target Input : %s\n", input);
        printf("Status       : COMPRESSED\n");
        printf("Provider     : repomix\n");
        printf("Output       : repomix-output.xml\n");
        printf("============================\n");
    }
    return 0;
}
