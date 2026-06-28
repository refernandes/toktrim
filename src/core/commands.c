#include "toktrim.h"
#include <errno.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <ftw.h>
#include <time.h>

// ANSI Colors
#define C_RESET   "\033[0m"
#define C_BOLD    "\033[1m"
#define C_GREEN   "\033[32m"
#define C_YELLOW  "\033[33m"
#define C_CYAN    "\033[36m"
#define C_RED     "\033[31m"
#define C_GRAY    "\033[90m"

static long long total_bytes = 0;

static int detect_binary_in_path(const char* binary_path, char* const argv[]) {
    int null_fd = open("/dev/null", O_WRONLY);
    int stdout_fd = dup(STDOUT_FILENO);
    int stderr_fd = dup(STDERR_FILENO);
    int status;

    if (null_fd == -1 || stdout_fd == -1 || stderr_fd == -1) {
        if (null_fd != -1) close(null_fd);
        if (stdout_fd != -1) close(stdout_fd);
        if (stderr_fd != -1) close(stderr_fd);
        return 0;
    }

    dup2(null_fd, STDOUT_FILENO);
    dup2(null_fd, STDERR_FILENO);
    close(null_fd);

    status = safe_exec(binary_path, argv);

    dup2(stdout_fd, STDOUT_FILENO);
    dup2(stderr_fd, STDERR_FILENO);
    close(stdout_fd);
    close(stderr_fd);

    return status == 0;
}

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

static int ensure_directory_recursive(const char* path) {
    char buffer[1024];
    size_t length;
    char* cursor;
    struct stat st;

    if (!path || !*path) {
        return -1;
    }

    length = strlen(path);
    if (length >= sizeof(buffer)) {
        return -1;
    }

    memcpy(buffer, path, length + 1);
    if (length > 1 && buffer[length - 1] == '/') {
        buffer[length - 1] = '\0';
    }

    for (cursor = buffer + 1; *cursor; cursor++) {
        if (*cursor != '/') {
            continue;
        }

        *cursor = '\0';
        if (mkdir(buffer, 0755) != 0 && errno != EEXIST) {
            return -1;
        }
        *cursor = '/';
    }

    if (mkdir(buffer, 0755) != 0 && errno != EEXIST) {
        return -1;
    }

    if (stat(buffer, &st) != 0 || !S_ISDIR(st.st_mode)) {
        return -1;
    }

    return 0;
}

static int build_session_artifact_dir(const run_context_t* rctx, char* artifact_dir, size_t artifact_dir_size) {
    int written;

    if (!rctx || !rctx->state_dir || !rctx->session_id || !artifact_dir) {
        return -1;
    }

    written = snprintf(
        artifact_dir,
        artifact_dir_size,
        "%s/sessions/%s/artifacts",
        rctx->state_dir,
        rctx->session_id
    );

    return written >= 0 && (size_t)written < artifact_dir_size ? 0 : -1;
}

static int build_session_artifact_path(const run_context_t* rctx, const char* filename, char* artifact_path, size_t artifact_path_size) {
    int written;

    if (!filename || !artifact_path) {
        return -1;
    }

    written = snprintf(
        artifact_path,
        artifact_path_size,
        "%s/sessions/%s/artifacts/%s",
        rctx->state_dir,
        rctx->session_id,
        filename
    );

    return written >= 0 && (size_t)written < artifact_path_size ? 0 : -1;
}

int run_doctor(run_context_t* rctx) {
    const char* config_path = ".toktrim/config.toml";
    int json_out = rctx && rctx->json_out;
    int config_exists = access(config_path, F_OK) == 0;
    int config_parseable = 0;
    int repomix_in_path;
    int headroom_in_path;
    int repomix_enabled;
    int headroom_enabled;
    int repomix_healthy;
    int headroom_healthy;
    int healthy;
    toktrim_config_t cfg;
    char* repomix_args[] = {"repomix", "--version", NULL};
    char* headroom_args[] = {"headroom", "--version", NULL};

    load_default_config(&cfg);
    if (config_exists && parse_local_config(config_path, &cfg) == 0) {
        config_parseable = 1;
    }

    repomix_in_path = detect_binary_in_path("repomix", repomix_args);
    headroom_in_path = detect_binary_in_path("headroom", headroom_args);
    repomix_enabled = cfg.repomix.enabled;
    headroom_enabled = cfg.headroom.enabled;
    repomix_healthy = !repomix_enabled || repomix_in_path;
    headroom_healthy = !headroom_enabled || headroom_in_path;
    healthy = config_exists && config_parseable && repomix_healthy && headroom_healthy;

    if (json_out) {
        printf("{\n");
        printf("  \"version\": 1,\n");
        printf("  \"command\": \"doctor\",\n");
        printf("  \"status\": \"ok\",\n");
        printf("  \"healthy\": %s,\n", healthy ? "true" : "false");
        printf("  \"config\": {\n");
        printf("    \"path\": \"%s\",\n", config_path);
        printf("    \"exists\": %s,\n", config_exists ? "true" : "false");
        printf("    \"parseable\": %s\n", config_parseable ? "true" : "false");
        printf("  },\n");
        printf("  \"providers\": [\n");
        printf("    {\"id\":\"repomix\",\"enabled\":%s,\"in_path\":%s,\"healthy\":%s},\n",
               repomix_enabled ? "true" : "false",
               repomix_in_path ? "true" : "false",
               repomix_healthy ? "true" : "false");
        printf("    {\"id\":\"headroom\",\"enabled\":%s,\"in_path\":%s,\"healthy\":%s}\n",
               headroom_enabled ? "true" : "false",
               headroom_in_path ? "true" : "false",
               headroom_healthy ? "true" : "false");
        printf("  ],\n");
        printf("  \"issues\": [],\n");
        printf("  \"warnings\": []\n");
        printf("}\n");
        return healthy ? 0 : 1;
    }

    printf("%s[INFO]%s Running toktrim doctor...\n", C_CYAN, C_RESET);
    printf("  config: %s\n", config_exists ? (config_parseable ? C_GREEN "ok" C_RESET : C_RED "invalid" C_RESET) : C_RED "missing" C_RESET);
    printf("  repomix: %s\n", repomix_enabled ? (repomix_in_path ? C_GREEN "enabled + found" C_RESET : C_RED "enabled + missing" C_RESET) : C_GRAY "disabled" C_RESET);
    printf("  headroom: %s\n", headroom_enabled ? (headroom_in_path ? C_GREEN "enabled + found" C_RESET : C_RED "enabled + missing" C_RESET) : C_GRAY "disabled" C_RESET);
    printf("  health: %s\n", healthy ? C_GREEN "healthy" C_RESET : C_RED "unhealthy" C_RESET);
    return healthy ? 0 : 1;
}

int run_install(const char* target) {
    if (!target) {
        log_error("Target is required for install");
        return 1;
    }
    printf("%s[INFO]%s Installing provider: %s%s%s\n", C_CYAN, C_RESET, C_BOLD, target, C_RESET);
    return 0;
}

int run_status(toktrim_config_t* cfg, run_context_t* rctx) {
    int json_out = rctx && rctx->json_out;

    if (json_out) {
        printf("{\n");
        printf("  \"version\": 1,\n");
        printf("  \"command\": \"status\",\n");
        printf("  \"status\": \"ok\",\n");
        printf("  \"policy\": {\n");
        printf("    \"preset\": \"%s\",\n", cfg->policy_preset);
        printf("    \"max_tokens\": %d\n", cfg->max_tokens);
        printf("  },\n");
        printf("  \"providers\": {\n");
        printf("    \"repomix\": {\"enabled\": %s},\n", cfg->repomix.enabled ? "true" : "false");
        printf("    \"headroom\": {\"enabled\": %s}\n", cfg->headroom.enabled ? "true" : "false");
        printf("  },\n");
        printf("  \"warnings\": [],\n");
        printf("  \"errors\": []\n");
        printf("}\n");
        return 0;
    }

    printf("%s[INFO]%s TokTrim Status for Project: %s\n", C_CYAN, C_RESET, cfg->name);
    printf("  Policy Preset: %s\n", cfg->policy_preset);
    printf("  Max Tokens: %d\n", cfg->max_tokens);
    printf("  Providers:\n");
    printf("    repomix: %s\n", cfg->repomix.enabled ? C_GREEN "enabled" C_RESET : C_RED "disabled" C_RESET);
    printf("    headroom: %s\n", cfg->headroom.enabled ? C_GREEN "enabled" C_RESET : C_RED "disabled" C_RESET);
    return 0;
}

int run_estimate(const char* type, const char* input, toktrim_config_t* cfg, run_context_t* rctx) {
    char worktree[512] = "";
    char timestamp[32] = "";
    int json_out = rctx && rctx->json_out;
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
    double savings_percent = savings_rate * 100.0;
    double estimated_usd_saved = saved_tokens * 0.000003;

    if (!getcwd(worktree, sizeof(worktree))) {
        worktree[0] = '\0';
    }

    {
        time_t now = time(NULL);
        struct tm* utc = gmtime(&now);
        if (utc) {
            strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", utc);
        }
    }

    if (json_out) {
        printf("{\n");
        printf("  \"version\": 1,\n");
        printf("  \"command\": \"estimate\",\n");
        printf("  \"status\": \"ok\",\n");
        printf("  \"session_id\": \"\",\n");
        printf("  \"worktree\": \"%s\",\n", worktree);
        printf("  \"timestamp\": \"%s\",\n", timestamp);
        printf("  \"input\": {\n");
        printf("    \"type\": \"%s\",\n", type);
        printf("    \"path\": \"%s\"\n", input);
        printf("  },\n");
        printf("  \"policy\": {\n");
        printf("    \"preset\": \"%s\",\n", cfg->policy_preset);
        printf("    \"max_tokens\": %d\n", cfg->max_tokens);
        printf("  },\n");
        printf("  \"provider_selected\": \"%s\",\n", provider);
        printf("  \"metrics\": {\n");
        printf("    \"baseline_tokens\": %lld,\n", baseline);
        printf("    \"optimized_tokens\": %lld,\n", optimized);
        printf("    \"saved_tokens\": %lld,\n", saved_tokens);
        printf("    \"savings_percent\": %.2f,\n", savings_percent);
        printf("    \"estimated_usd_saved\": %.6f\n", estimated_usd_saved);
        printf("  },\n");
        printf("  \"warnings\": [\"metrics are estimated (bytes/4 heuristic)\"],\n");
        printf("  \"errors\": []\n");
        printf("}\n");
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

int run_optimize(const char* type, const char* input, toktrim_config_t* cfg, run_context_t* rctx) {
    int json_out = rctx && rctx->json_out;
    char output_path[1024] = "";
    char absolute_output_path[2048] = "";
    char worktree[512] = "";
    char timestamp[32] = "";
    const char* artifact_kind = NULL;
    int provider_status = -1;

    if (!getcwd(worktree, sizeof(worktree))) {
        worktree[0] = '\0';
    }

    {
        time_t now = time(NULL);
        struct tm* utc = gmtime(&now);
        if (utc) {
            strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", utc);
        }
    }

    if (!json_out) {
        printf("\n");
        printf("  %s╭────────────────────────────────────────────────────────╮%s\n", C_GREEN, C_RESET);
        printf("  %s│%s                 %sTOKTRIM OPTIMIZATION%s                  %s│%s\n", C_GREEN, C_RESET, C_BOLD, C_RESET, C_GREEN, C_RESET);
        printf("  %s├────────────────────────────────────────────────────────┤%s\n", C_GREEN, C_RESET);
    }

    int success = 0;
    const char* provider_used = "None";
    const char* output_file = "N/A";
    const char* error_message = "no suitable provider enabled for requested type";

    if (strcmp(type, "repo") == 0 && cfg->repomix.enabled) {
        char artifact_dir[1024];
        int null_fd = -1;
        int stdout_fd = -1;
        int stderr_fd = -1;
        provider_vtbl_t* repomix = get_repomix_provider();
        provider_used = "repomix";
        if (!json_out) printf("  %s│%s  Running repomix pack...                               %s│%s\n", C_GREEN, C_RESET, C_GREEN, C_RESET);
        if (build_session_artifact_dir(rctx, artifact_dir, sizeof(artifact_dir)) == 0 &&
            ensure_directory_recursive(artifact_dir) == 0 &&
            build_session_artifact_path(rctx, "repomap.xml", output_path, sizeof(output_path)) == 0) {
            if (json_out) {
                null_fd = open("/dev/null", O_WRONLY);
                stdout_fd = dup(STDOUT_FILENO);
                stderr_fd = dup(STDERR_FILENO);
                if (null_fd == -1 || stdout_fd == -1 || stderr_fd == -1) {
                    if (null_fd != -1) close(null_fd);
                    if (stdout_fd != -1) close(stdout_fd);
                    if (stderr_fd != -1) close(stderr_fd);
                    provider_status = -1;
                } else {
                    dup2(null_fd, STDOUT_FILENO);
                    dup2(null_fd, STDERR_FILENO);
                    close(null_fd);
                    provider_status = repomix->run_pack(input, output_path);
                    dup2(stdout_fd, STDOUT_FILENO);
                    dup2(stderr_fd, STDERR_FILENO);
                    close(stdout_fd);
                    close(stderr_fd);
                }
            } else {
                provider_status = repomix->run_pack(input, output_path);
            }
        }

        if (provider_status == 0) {
            success = 1;
            output_file = output_path;
            artifact_kind = "repomap";
            error_message = NULL;
        } else {
            error_message = "repomix failed to generate artifact";
        }
    } else if (strcmp(type, "logs") == 0 && cfg->headroom.enabled) {
        char artifact_dir[1024];
        int null_fd = -1;
        int stdout_fd = -1;
        int stderr_fd = -1;
        provider_vtbl_t* headroom = get_headroom_provider();
        provider_used = "headroom";
        if (!json_out) printf("  %s│%s  Running headroom compress...                          %s│%s\n", C_GREEN, C_RESET, C_GREEN, C_RESET);
        if (build_session_artifact_dir(rctx, artifact_dir, sizeof(artifact_dir)) == 0 &&
            ensure_directory_recursive(artifact_dir) == 0 &&
            build_session_artifact_path(rctx, "compressed.log", output_path, sizeof(output_path)) == 0) {
            if (json_out) {
                null_fd = open("/dev/null", O_WRONLY);
                stdout_fd = dup(STDOUT_FILENO);
                stderr_fd = dup(STDERR_FILENO);
                if (null_fd == -1 || stdout_fd == -1 || stderr_fd == -1) {
                    if (null_fd != -1) close(null_fd);
                    if (stdout_fd != -1) close(stdout_fd);
                    if (stderr_fd != -1) close(stderr_fd);
                    provider_status = -1;
                } else {
                    dup2(null_fd, STDOUT_FILENO);
                    dup2(null_fd, STDERR_FILENO);
                    close(null_fd);
                    provider_status = headroom->run_compress(input, output_path);
                    dup2(stdout_fd, STDOUT_FILENO);
                    dup2(stderr_fd, STDERR_FILENO);
                    close(stdout_fd);
                    close(stderr_fd);
                }
            } else {
                provider_status = headroom->run_compress(input, output_path);
            }
        }

        if (provider_status == 0) {
            success = 1;
            output_file = output_path;
            artifact_kind = "compressed_log";
            error_message = NULL;
        } else {
            error_message = "headroom failed to generate artifact";
        }
    } else {
        if (!json_out) printf("  %s│%s  No suitable provider enabled for type: %-14s %s│%s\n", C_GREEN, C_RESET, type, C_GREEN, C_RESET);
    }

    if (success && output_path[0] != '\0') {
        if (output_path[0] == '/') {
            snprintf(absolute_output_path, sizeof(absolute_output_path), "%s", output_path);
        } else if (worktree[0] != '\0') {
            snprintf(absolute_output_path, sizeof(absolute_output_path), "%s/%s", worktree, output_path);
        } else {
            snprintf(absolute_output_path, sizeof(absolute_output_path), "%s", output_path);
        }
    }

    if (json_out) {
        printf("{\n");
        printf("  \"version\": 1,\n");
        printf("  \"command\": \"optimize\",\n");
        printf("  \"status\": \"%s\",\n", success ? "ok" : "error");
        printf("  \"session_id\": \"%s\",\n", rctx && rctx->session_id ? rctx->session_id : "");
        printf("  \"worktree\": \"%s\",\n", worktree);
        printf("  \"timestamp\": \"%s\",\n", timestamp);
        printf("  \"input\": {\n");
        printf("    \"type\": \"%s\",\n", type);
        printf("    \"path\": \"%s\"\n", input);
        printf("  },\n");
        printf("  \"policy\": {\n");
        printf("    \"preset\": \"%s\",\n", cfg->policy_preset);
        printf("    \"max_tokens\": %d\n", cfg->max_tokens);
        printf("  },\n");
        printf("  \"provider_selected\": \"%s\",\n", provider_used);
        printf("  \"artifacts\": [\n");
        if (success && artifact_kind && absolute_output_path[0] != '\0') {
            printf("    {\"kind\":\"%s\",\"path\":\"%s\"}\n", artifact_kind, absolute_output_path);
        }
        printf("  ],\n");
        printf("  \"warnings\": [],\n");
        printf("  \"errors\": [");
        if (!success && error_message) {
            printf("\"%s\"", error_message);
        }
        printf("]\n");
        printf("}\n");
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

int run_benchmark(const char* type, const char* input, toktrim_config_t* cfg, run_context_t* rctx) {
    int json_out = rctx && rctx->json_out;
    long long baseline = get_approximate_tokens(input);
    long long optimized = 0;
    long long saved = 0;
    double savings_pct = 0.0;
    double estimated_usd_saved = 0.0;
    int optimize_status = -1;
    int success = 0;
    char artifact_path[1024] = "";
    char absolute_artifact_path[2048] = "";
    char worktree[512] = "";
    char timestamp[32] = "";
    const char* provider_used = "None";
    const char* artifact_kind = NULL;
    const char* error_message = "no suitable provider enabled for requested type";
    const char* artifact_name = NULL;
    run_context_t optimize_ctx;

    if (baseline == 0) baseline = 50000;

    if (!getcwd(worktree, sizeof(worktree))) {
        worktree[0] = '\0';
    }

    {
        time_t now = time(NULL);
        struct tm* utc = gmtime(&now);
        if (utc) {
            strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", utc);
        }
    }

    optimize_ctx.session_id = rctx && rctx->session_id ? rctx->session_id : "default";
    optimize_ctx.state_dir = rctx ? rctx->state_dir : NULL;
    optimize_ctx.json_out = 0;

    if (strcmp(type, "repo") == 0 && cfg->repomix.enabled) {
        provider_used = "repomix";
        artifact_kind = "repomap";
        artifact_name = "repomap.xml";
        error_message = "repomix failed to generate artifact";
    } else if (strcmp(type, "logs") == 0 && cfg->headroom.enabled) {
        provider_used = "headroom";
        artifact_kind = "compressed_log";
        artifact_name = "compressed.log";
        error_message = "headroom failed to generate artifact";
    }

    if (!json_out) {
        printf("\n");
        printf("  %s╭────────────────────────────────────────────────────────╮%s\n", C_YELLOW, C_RESET);
        printf("  %s│%s                 %sTOKTRIM BENCHMARK RUN%s                 %s│%s\n", C_YELLOW, C_RESET, C_BOLD, C_RESET, C_YELLOW, C_RESET);
        printf("  %s├────────────────────────────────────────────────────────┤%s\n", C_YELLOW, C_RESET);
        printf("  %s│%s  1. Baseline Input Tokens: %-26lld %s│%s\n", C_YELLOW, C_RESET, baseline, C_YELLOW, C_RESET);
        printf("  %s│%s  2. Running Optimizer...                                %s│%s\n", C_YELLOW, C_RESET, C_YELLOW, C_RESET);
        optimize_status = run_optimize(type, input, cfg, &optimize_ctx);
    } else {
        int null_fd = open("/dev/null", O_WRONLY);
        int stdout_fd = dup(STDOUT_FILENO);
        int stderr_fd = dup(STDERR_FILENO);

        if (null_fd == -1 || stdout_fd == -1 || stderr_fd == -1) {
            if (null_fd != -1) close(null_fd);
            if (stdout_fd != -1) close(stdout_fd);
            if (stderr_fd != -1) close(stderr_fd);
            optimize_status = -1;
        } else {
            fflush(stdout);
            fflush(stderr);
            dup2(null_fd, STDOUT_FILENO);
            dup2(null_fd, STDERR_FILENO);
            close(null_fd);
            optimize_status = run_optimize(type, input, cfg, &optimize_ctx);
            fflush(stdout);
            fflush(stderr);
            dup2(stdout_fd, STDOUT_FILENO);
            dup2(stderr_fd, STDERR_FILENO);
            close(stdout_fd);
            close(stderr_fd);
        }
    }

    if (artifact_name &&
        build_session_artifact_path(&optimize_ctx, artifact_name, artifact_path, sizeof(artifact_path)) == 0 &&
        access(artifact_path, F_OK) == 0) {
        optimized = get_approximate_tokens(artifact_path);
        success = optimize_status == 0;
    } else {
        optimized = 0;
        success = 0;
    }

    if (success) {
        if (artifact_path[0] == '/') {
            snprintf(absolute_artifact_path, sizeof(absolute_artifact_path), "%s", artifact_path);
        } else if (worktree[0] != '\0') {
            snprintf(absolute_artifact_path, sizeof(absolute_artifact_path), "%s/%s", worktree, artifact_path);
        } else {
            snprintf(absolute_artifact_path, sizeof(absolute_artifact_path), "%s", artifact_path);
        }

        saved = baseline - optimized;
        savings_pct = baseline > 0 ? ((double)saved / baseline) * 100.0 : 0.0;
        estimated_usd_saved = saved * 0.000003;
        error_message = NULL;
    }

    if (json_out) {
        printf("{\n");
        printf("  \"version\": 1,\n");
        printf("  \"command\": \"benchmark\",\n");
        printf("  \"status\": \"%s\",\n", success ? "ok" : "error");
        printf("  \"session_id\": \"%s\",\n", optimize_ctx.session_id ? optimize_ctx.session_id : "");
        printf("  \"worktree\": \"%s\",\n", worktree);
        printf("  \"timestamp\": \"%s\",\n", timestamp);
        printf("  \"input\": {\n");
        printf("    \"type\": \"%s\",\n", type);
        printf("    \"path\": \"%s\"\n", input);
        printf("  },\n");
        printf("  \"provider_selected\": \"%s\",\n", provider_used);
        printf("  \"metrics\": {\n");
        printf("    \"baseline_tokens\": %lld,\n", baseline);
        printf("    \"optimized_tokens\": %lld,\n", optimized);
        printf("    \"saved_tokens\": %lld,\n", saved);
        printf("    \"savings_percent\": %.2f,\n", savings_pct);
        printf("    \"estimated_usd_saved\": %.6f\n", estimated_usd_saved);
        printf("  },\n");
        printf("  \"artifacts\": [\n");
        if (success && artifact_kind && absolute_artifact_path[0] != '\0') {
            printf("    {\"kind\":\"%s\",\"path\":\"%s\"}\n", artifact_kind, absolute_artifact_path);
        }
        printf("  ],\n");
        printf("  \"warnings\": [\"metrics are estimated (bytes/4 heuristic)\"],\n");
        printf("  \"errors\": [");
        if (!success && error_message) {
            printf("\"%s\"", error_message);
        }
        printf("]\n");
        printf("}\n");
        return success ? 0 : 1;
    }

    printf("  %s╭────────────────────────────────────────────────────────╮%s\n", C_YELLOW, C_RESET);
    printf("  %s│%s                  %sBENCHMARK RESULTS%s                    %s│%s\n", C_YELLOW, C_RESET, C_BOLD, C_RESET, C_YELLOW, C_RESET);
    printf("  %s├────────────────────────────────────────────────────────┤%s\n", C_YELLOW, C_RESET);
    printf("  %s│%s  %sTokens Before%s :  %-33lld %s│%s\n", C_YELLOW, C_RESET, C_GRAY, C_RESET, baseline, C_YELLOW, C_RESET);
    printf("  %s│%s  %sTokens After%s  :  %s%-33lld%s %s│%s\n", C_YELLOW, C_RESET, C_GRAY, C_RESET, success ? C_GREEN : C_RED, optimized, C_RESET, C_YELLOW, C_RESET);
    printf("  %s│%s  %sTokens Saved%s  :  %s%-33lld%s %s│%s\n", C_YELLOW, C_RESET, C_GRAY, C_RESET, success ? C_YELLOW : C_RED, saved, C_RESET, C_YELLOW, C_RESET);
    printf("  %s│%s                                                        %s│%s\n", C_YELLOW, C_RESET, C_YELLOW, C_RESET);
    printf("  %s│%s  %sReal Savings%s  :  %s%.2f%%%s                                 %s│%s\n", C_YELLOW, C_RESET, C_GRAY, C_RESET, success ? C_GREEN : C_RED, savings_pct, C_RESET, C_YELLOW, C_RESET);
    printf("  %s╰────────────────────────────────────────────────────────╯%s\n", C_YELLOW, C_RESET);
    printf("\n");

    return success ? 0 : 1;
}
