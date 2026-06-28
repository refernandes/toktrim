#include "toktrim.h"

static int headroom_detect(void) {
    // We assume headroom is installed at a specific path or globally accessible
    char* args[] = {"headroom", "--version", NULL};
    if (safe_exec("headroom", args) == 0) {
        return 1;
    }
    // Fallback detection logic could go here
    return 0;
}

static int headroom_run_pack(const char* target_path, const char* output_path) {
    (void)target_path;
    (void)output_path;
    return -1; // Headroom is for compressing files/logs, not repo maps
}

static int headroom_run_compress(const char* target_file, const char* output_path) {
    if (!target_file) return -1;
    (void)output_path;
    // For now we will mock the exact flags, as headroom has wrap/compress
    char* args[] = {"headroom", "--compress", (char*)target_file, NULL};
    return safe_exec("headroom", args);
}

static provider_vtbl_t headroom_provider = {
    .detect = headroom_detect,
    .run_pack = headroom_run_pack,
    .run_compress = headroom_run_compress
};

provider_vtbl_t* get_headroom_provider() {
    return &headroom_provider;
}
