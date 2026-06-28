#include <assert.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

static void require_condition(int condition, const char* message) {
    if (!condition) {
        fprintf(stderr, "[FAIL] %s\n", message);
        exit(1);
    }
}

static char* append_buffer(char* original, size_t* current_size, const char* chunk) {
    size_t chunk_len = strlen(chunk);
    char* resized = realloc(original, *current_size + chunk_len + 1);

    require_condition(resized != NULL, "failed to grow capture buffer");
    memcpy(resized + *current_size, chunk, chunk_len + 1);
    *current_size += chunk_len;
    return resized;
}

static char* run_command_capture(const char* command, int* exit_code) {
    char buffer[1024];
    size_t output_size = 0;
    char* output = malloc(1);
    FILE* pipe;
    int status;

    require_condition(output != NULL, "failed to allocate capture buffer");
    output[0] = '\0';

    pipe = popen(command, "r");
    require_condition(pipe != NULL, "failed to execute test command");

    while (fgets(buffer, sizeof(buffer), pipe)) {
        output = append_buffer(output, &output_size, buffer);
    }

    status = pclose(pipe);
    require_condition(status != -1, "failed to collect command status");
    if (WIFEXITED(status)) {
        *exit_code = WEXITSTATUS(status);
    } else {
        *exit_code = 128;
    }

    return output;
}

static int count_occurrences(const char* haystack, const char* needle) {
    int count = 0;
    size_t needle_len = strlen(needle);
    const char* cursor = haystack;

    while ((cursor = strstr(cursor, needle)) != NULL) {
        count++;
        cursor += needle_len;
    }

    return count;
}

static void assert_contains(const char* haystack, const char* needle, const char* message) {
    require_condition(strstr(haystack, needle) != NULL, message);
}

static void assert_not_contains(const char* haystack, const char* needle, const char* message) {
    require_condition(strstr(haystack, needle) == NULL, message);
}

static void assert_json_valid(const char* json_text) {
    char temp_path[] = "/tmp/toktrim-contract-json-XXXXXX";
    char command[PATH_MAX + 128];
    FILE* file;
    int fd = mkstemp(temp_path);

    require_condition(fd != -1, "failed to create temporary json file");
    file = fdopen(fd, "w");
    require_condition(file != NULL, "failed to open temporary json file");
    fputs(json_text, file);
    fclose(file);

    snprintf(
        command,
        sizeof(command),
        "python3 -c \"import json,sys; json.load(open(sys.argv[1]))\" %s >/dev/null 2>&1",
        temp_path
    );
    require_condition(system(command) == 0, "command output is not valid JSON");
    unlink(temp_path);
}

static void assert_common_json_fields(const char* json_text, const char* command_name) {
    char command_fragment[64];

    assert_json_valid(json_text);
    assert_contains(json_text, "\"version\": 1", "json must include version=1");
    snprintf(command_fragment, sizeof(command_fragment), "\"command\": \"%s\"", command_name);
    assert_contains(json_text, command_fragment, "json must include command name");
    assert_contains(json_text, "\"status\":", "json must include status");
}

static void test_doctor_json(const char* repo_root) {
    char* output;
    int exit_code;
    char command[PATH_MAX + 64];

    snprintf(command, sizeof(command), "%s/toktrim doctor --json", repo_root);
    output = run_command_capture(command, &exit_code);

    require_condition(exit_code == 0, "doctor --json should succeed for valid config");
    assert_common_json_fields(output, "doctor");
    assert_contains(output, "\"warnings\":", "doctor json must include warnings");
    assert_contains(output, "\"issues\":", "doctor json must include issues");
    assert_contains(output, "\"healthy\": true", "doctor json must include healthy=true in current environment");
    require_condition(count_occurrences(output, "\"id\":\"") == 2, "doctor providers[] must contain two entries");

    free(output);
}

static void test_doctor_missing_config(const char* repo_root) {
    char workdir_template[] = "/tmp/toktrim-contract-missing-XXXXXX";
    char* output;
    int exit_code;
    char command[PATH_MAX * 2 + 64];
    char* workdir = mkdtemp(workdir_template);

    require_condition(workdir != NULL, "failed to create missing-config workdir");
    snprintf(command, sizeof(command), "sh -c 'cd %s && %s/toktrim doctor --json'", workdir, repo_root);
    output = run_command_capture(command, &exit_code);

    require_condition(exit_code == 1, "doctor --json should fail for missing config");
    assert_common_json_fields(output, "doctor");
    assert_contains(output, "\"warnings\":", "doctor json must include warnings");
    assert_contains(output, "\"issues\":", "doctor json must include issues");
    assert_contains(output, "\"healthy\": false", "doctor json must report healthy=false when config is absent");

    free(output);
}

static void test_estimate_json(const char* repo_root) {
    char* output;
    int exit_code;
    char command[PATH_MAX + 96];

    snprintf(command, sizeof(command), "%s/toktrim estimate --json --type repo --input .", repo_root);
    output = run_command_capture(command, &exit_code);

    require_condition(exit_code == 0, "estimate --json should succeed");
    assert_common_json_fields(output, "estimate");
    assert_contains(output, "\"warnings\":", "estimate json must include warnings");
    assert_contains(output, "\"errors\":", "estimate json must include errors");
    assert_contains(output, "\"baseline_tokens\":", "estimate json must include baseline_tokens");
    assert_contains(output, "\"optimized_tokens\":", "estimate json must include optimized_tokens");
    assert_contains(output, "\"saved_tokens\":", "estimate json must include saved_tokens");
    assert_contains(output, "\"savings_percent\":", "estimate json must include savings_percent");
    assert_contains(output, "\"estimated_usd_saved\":", "estimate json must include estimated_usd_saved");
    assert_contains(output, "metrics are estimated", "estimate warnings must mention estimated metrics");

    free(output);
}

static void test_optimize_json(const char* repo_root, const char* state_dir) {
    char* output;
    int exit_code;
    char command[PATH_MAX * 2 + 160];

    snprintf(
        command,
        sizeof(command),
        "%s/toktrim optimize --json --type repo --input . --session-id contract-opt --state-dir %s",
        repo_root,
        state_dir
    );
    output = run_command_capture(command, &exit_code);

    require_condition(exit_code == 0 || exit_code == 1, "optimize --json must not crash");
    assert_common_json_fields(output, "optimize");
    assert_contains(output, "\"warnings\":", "optimize json must include warnings");
    assert_contains(output, "\"errors\":", "optimize json must include errors");
    assert_contains(output, "\"artifacts\": [", "optimize json must include artifacts[]");
    if (strstr(output, "\"status\": \"ok\"")) {
        assert_contains(output, "\"path\":\"", "successful optimize json must include artifact path");
    }

    free(output);
}

static void test_benchmark_json(const char* repo_root, const char* state_dir) {
    char* output;
    int exit_code;
    char command[PATH_MAX * 2 + 168];

    snprintf(
        command,
        sizeof(command),
        "%s/toktrim benchmark --json --type repo --input . --session-id contract-bench --state-dir %s",
        repo_root,
        state_dir
    );
    output = run_command_capture(command, &exit_code);

    require_condition(exit_code == 0 || exit_code == 1, "benchmark --json must not crash");
    assert_common_json_fields(output, "benchmark");
    assert_contains(output, "\"warnings\":", "benchmark json must include warnings");
    assert_contains(output, "\"errors\":", "benchmark json must include errors");
    assert_contains(output, "\"metrics\": {", "benchmark json must include metrics");
    assert_contains(output, "\"artifacts\": [", "benchmark json must include artifacts[]");
    assert_not_contains(output, "\"savings_percent\": 66.66", "benchmark must not use mock savings fallback");
    if (strstr(output, "\"status\": \"ok\"")) {
        assert_contains(output, "\"path\":\"", "successful benchmark json must include artifact path");
    }

    free(output);
}

static void test_no_root_repomix_artifact(const char* repo_root, const char* state_dir) {
    char optimize_command[PATH_MAX * 2 + 160];
    char benchmark_command[PATH_MAX * 2 + 168];
    char repomix_root_path[PATH_MAX + 32];
    struct stat before_stat;
    struct stat after_stat;
    int before_exists;
    int after_exists;
    int exit_code;
    char* output;

    snprintf(repomix_root_path, sizeof(repomix_root_path), "%s/repomix-output.xml", repo_root);
    before_exists = stat(repomix_root_path, &before_stat) == 0;

    snprintf(
        optimize_command,
        sizeof(optimize_command),
        "%s/toktrim optimize --json --type repo --input . --session-id contract-artifact-opt --state-dir %s",
        repo_root,
        state_dir
    );
    output = run_command_capture(optimize_command, &exit_code);
    free(output);

    snprintf(
        benchmark_command,
        sizeof(benchmark_command),
        "%s/toktrim benchmark --json --type repo --input . --session-id contract-artifact-bench --state-dir %s",
        repo_root,
        state_dir
    );
    output = run_command_capture(benchmark_command, &exit_code);
    free(output);

    after_exists = stat(repomix_root_path, &after_stat) == 0;
    require_condition(before_exists == after_exists, "commands must not create repomix-output.xml at repo root");
    if (before_exists) {
        require_condition(before_stat.st_size == after_stat.st_size, "root repomix-output.xml must not be modified");
        require_condition(before_stat.st_mtim.tv_sec == after_stat.st_mtim.tv_sec, "root repomix-output.xml mtime must not change");
        require_condition(before_stat.st_mtim.tv_nsec == after_stat.st_mtim.tv_nsec, "root repomix-output.xml mtime must not change");
    }
}

int main(void) {
    char repo_root[PATH_MAX];
    char state_dir_template[] = "/tmp/toktrim-contract-state-XXXXXX";
    char* state_dir;

    require_condition(getcwd(repo_root, sizeof(repo_root)) != NULL, "failed to determine repo root");
    state_dir = mkdtemp(state_dir_template);
    require_condition(state_dir != NULL, "failed to create contract test state dir");

    printf("Running contract tests...\n");
    test_doctor_json(repo_root);
    printf("  [OK] doctor --json valid config\n");
    test_doctor_missing_config(repo_root);
    printf("  [OK] doctor --json missing config\n");
    test_estimate_json(repo_root);
    printf("  [OK] estimate --json metrics contract\n");
    test_optimize_json(repo_root, state_dir);
    printf("  [OK] optimize --json artifacts contract\n");
    test_benchmark_json(repo_root, state_dir);
    printf("  [OK] benchmark --json metrics contract\n");
    test_no_root_repomix_artifact(repo_root, state_dir);
    printf("  [OK] no root repomix artifact regression\n");
    printf("All contract tests passed!\n");
    return 0;
}
