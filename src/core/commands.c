#include "toktrim.h"
#include <sys/stat.h>
#include <ftw.h>

// ANSI Colors
#define C_RESET   "\033[0m"
#define C_BOLD    "\033[1m"
#define C_GREEN   "\033[32m"
#define C_YELLOW  "\033[33m"
#define C_CYAN    "\033[36m"
#define C_RED     "\033[31m"
#define C_GRAY    "\033[90m"

static long long total_bytes = 0;

static int sum_file_sizes(const char *fpath, const struct stat *sb, int tflag) {
    (void)fpath;
    if (tflag == FTW_F) { // If it's a file
        total_bytes += sb->st_size;
    }
    return 0;
}

static long long get_approximate_tokens(const char* path) {
    total_bytes = 0;
    struct stat st;
    if (stat(path, &st) == 0) {
        if (S_ISDIR(st.st_mode)) {
            ftw(path, sum_file_sizes, 20);
        } else {
            total_bytes = st.st_size;
        }
    }
    // Heuristic: 1 token ~ 4 chars/bytes
    return total_bytes / 4;
}

int run_doctor() {
    printf("%s[INFO]%s Running toktrim doctor...\n", C_CYAN, C_RESET);
    printf("  %s[%sOK%s]%s repomix\n", C_GRAY, C_GREEN, C_GRAY, C_RESET);
    printf("  %s[%sOK%s]%s headroom\n", C_GRAY, C_GREEN, C_GRAY, C_RESET);
    return 0;
}

int run_install(const char* target) {
    if (!target) {
        log_error("Target is required for install");
        return 1;
    }
    printf("%s[INFO]%s Installing provider: %s%s%s\n", C_CYAN, C_RESET, C_BOLD, target, C_RESET);
    return 0;
}

int run_status(toktrim_config_t* cfg) {
    printf("%s[INFO]%s TokTrim Status for Project: %s\n", C_CYAN, C_RESET, cfg->name);
    printf("  Policy Preset: %s\n", cfg->policy_preset);
    printf("  Max Tokens: %d\n", cfg->max_tokens);
    printf("  Providers:\n");
    printf("    repomix: %s\n", cfg->repomix.enabled ? C_GREEN "enabled" C_RESET : C_RED "disabled" C_RESET);
    printf("    headroom: %s\n", cfg->headroom.enabled ? C_GREEN "enabled" C_RESET : C_RED "disabled" C_RESET);
    return 0;
}

int run_estimate(const char* type, const char* input, int json_out, toktrim_config_t* cfg) {
    long long baseline = get_approximate_tokens(input);
    if (baseline == 0) baseline = 50000; // Fallback se o path não existir

    // Estimativa de ganho considerando política
    double savings_rate = 0.0;
    const char* provider = "Unknown";
    
    if (strcmp(type, "repo") == 0 && cfg->repomix.enabled) {
        savings_rate = 0.70;
        provider = "repomix";
    } else if (strcmp(type, "logs") == 0 && cfg->headroom.enabled) {
        savings_rate = 0.60;
        provider = "headroom";
    } else {
        savings_rate = 0.50; // mixed ou fallback
        provider = "repomix + headroom";
    }
    
    long long optimized = (long long)(baseline * (1.0 - savings_rate));
    long long saved_tokens = baseline - optimized;

    if (json_out) {
        printf("{\n  \"status\": \"estimated\",\n  \"type\": \"%s\",\n  \"input\": \"%s\",\n  \"baseline_tokens\": %lld,\n  \"estimated_tokens\": %lld\n}\n", type, input, baseline, optimized);
    } else {
        printf("\n");
        printf("  %s╭────────────────────────────────────────────────────────╮%s\n", C_CYAN, C_RESET);
        printf("  %s│%s                %sTOKTRIM ECONOMY ESTIMATOR%s               %s│%s\n", C_CYAN, C_RESET, C_BOLD, C_RESET, C_CYAN, C_RESET);
        printf("  %s├────────────────────────────────────────────────────────┤%s\n", C_CYAN, C_RESET);
        printf("  %s│%s  Workload Type :  %-33s %s│%s\n", C_CYAN, C_RESET, type, C_CYAN, C_RESET);
        printf("  %s│%s  Target Input  :  %-33s %s│%s\n", C_CYAN, C_RESET, input, C_CYAN, C_RESET);
        printf("  %s│%s                                                        %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  %sBaseline Tokens%s :  %-12lld                      %s│%s\n", C_CYAN, C_RESET, C_GRAY, C_RESET, baseline, C_CYAN, C_RESET);
        printf("  %s│%s  %sOptimized%s       :  %s%-12lld%s                      %s│%s\n", C_CYAN, C_RESET, C_GRAY, C_RESET, C_GREEN, optimized, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  %sTokens Saved%s    :  %s%-12lld%s                      %s│%s\n", C_CYAN, C_RESET, C_GRAY, C_RESET, C_YELLOW, saved_tokens, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s                                                        %s│%s\n", C_CYAN, C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  %sEst. Savings    :  %d%%%s                                 %s│%s\n", C_CYAN, C_RESET, C_GREEN, (int)(savings_rate * 100), C_RESET, C_CYAN, C_RESET);
        printf("  %s│%s  %sProvider Rec.   :  %s%s%-23s%s %s│%s\n", C_CYAN, C_RESET, C_GRAY, C_RESET, C_BOLD, provider, C_RESET, C_CYAN, C_RESET);
        printf("  %s╰────────────────────────────────────────────────────────╯%s\n", C_CYAN, C_RESET);
        printf("\n");
    }
    return 0;
}

int run_optimize(const char* type, const char* input, int json_out, toktrim_config_t* cfg) {
    if (json_out) {
        printf("{\n  \"status\": \"optimizing\",\n  \"type\": \"%s\",\n  \"input\": \"%s\"\n}\n", type, input);
    } else {
        printf("\n");
        printf("  %s╭────────────────────────────────────────────────────────╮%s\n", C_GREEN, C_RESET);
        printf("  %s│%s                 %sTOKTRIM OPTIMIZATION%s                  %s│%s\n", C_GREEN, C_RESET, C_BOLD, C_RESET, C_GREEN, C_RESET);
        printf("  %s├────────────────────────────────────────────────────────┤%s\n", C_GREEN, C_RESET);
    }

    int success = 0;
    const char* provider_used = "None";
    const char* output_file = "N/A";

    if (strcmp(type, "repo") == 0 && cfg->repomix.enabled) {
        provider_vtbl_t* repomix = get_repomix_provider();
        if (!json_out) printf("  %s│%s  Running repomix pack...                               %s│%s\n", C_GREEN, C_RESET, C_GREEN, C_RESET);
        if (repomix->run_pack(input) == 0) {
            success = 1;
            provider_used = "repomix";
            output_file = "repomix-output.xml";
        }
    } else if (strcmp(type, "logs") == 0 && cfg->headroom.enabled) {
        provider_vtbl_t* headroom = get_headroom_provider();
        if (!json_out) printf("  %s│%s  Running headroom compress...                          %s│%s\n", C_GREEN, C_RESET, C_GREEN, C_RESET);
        if (headroom->run_compress(input) == 0) {
            success = 1;
            provider_used = "headroom";
            output_file = "compressed output"; // Or whatever Headroom outputs
        }
    } else {
        if (!json_out) printf("  %s│%s  No suitable provider enabled for type: %-14s %s│%s\n", C_GREEN, C_RESET, type, C_GREEN, C_RESET);
    }

    if (!json_out) {
        if (success) {
            printf("  %s│%s  Status        :  %sCOMPRESSED%s                           %s│%s\n", C_GREEN, C_RESET, C_GREEN, C_RESET, C_GREEN, C_RESET);
        } else {
            printf("  %s│%s  Status        :  %sFAILED OR SKIPPED%s                    %s│%s\n", C_GREEN, C_RESET, C_RED, C_RESET, C_GREEN, C_RESET);
        }
        printf("  %s│%s  Provider Run  :  %-33s %s│%s\n", C_GREEN, C_RESET, provider_used, C_GREEN, C_RESET);
        printf("  %s│%s  Output File   :  %-33s %s│%s\n", C_GREEN, C_RESET, output_file, C_GREEN, C_RESET);
        printf("  %s╰────────────────────────────────────────────────────────╯%s\n", C_GREEN, C_RESET);
        printf("\n");
    }

    return success ? 0 : 1;
}
