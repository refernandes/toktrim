#include "toktrim.h"

static int repomix_detect(void) {
    // Check if repomix is in PATH
    char* args[] = {"repomix", "--version", NULL};
    if (safe_exec("repomix", args) == 0) {
        return 1;
    }
    return 0;
}

static int repomix_run_pack(const char* target_path, const char* output_path) {
    if (!target_path) target_path = ".";
    if (!output_path) return -1;
    char* args[] = {"repomix", "--compress", "--no-files", (char*)target_path, "--output", (char*)output_path, NULL};
    return safe_exec("repomix", args);
}

static int repomix_run_compress(const char* target_file, const char* output_path) {
    // Repomix is meant for repos, but if asked to compress a single file:
    (void)target_file;
    (void)output_path;
    return -1; // Not the primary use case for Repomix
}

static provider_vtbl_t repomix_provider = {
    .detect = repomix_detect,
    .run_pack = repomix_run_pack,
    .run_compress = repomix_run_compress
};

provider_vtbl_t* get_repomix_provider() {
    return &repomix_provider;
}
