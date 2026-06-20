#include "toktrim.h"

void load_default_config(toktrim_config_t* cfg) {
    memset(cfg, 0, sizeof(toktrim_config_t));
    strcpy(cfg->name, "default-project");
    cfg->max_tokens = 50000;
    
    cfg->repomix.enabled = 1;
    cfg->repomix.compress = 1;
    cfg->repomix.no_files = 1;

    cfg->headroom.enabled = 1;
    strcpy(cfg->headroom.mode, "wrap");

    strcpy(cfg->policy_preset, "balanced");
}

int parse_local_config(const char* filepath, toktrim_config_t* cfg) {
    FILE* f = fopen(filepath, "r");
    if (!f) return -1; // File not found

    char line[256];
    char current_section[64] = "";

    while (fgets(line, sizeof(line), f)) {
        // Ignora comentários e linhas vazias
        if (line[0] == '#' || line[0] == '\n' || line[0] == '\r') continue;

        // Extrai [section]
        if (line[0] == '[') {
            sscanf(line, "[%63[^]]", current_section);
            continue;
        }

        // Lê chave = valor
        char key[64], val[128];
        if (sscanf(line, " %63[^=] = %127[^\n]", key, val) == 2) {
            // Remove trim spaces basic
            char* k = strtok(key, " \t");
            char* v = strtok(val, " \t\"");
            if (!k || !v) continue;

            if (strcmp(current_section, "project") == 0) {
                if (strcmp(k, "name") == 0) strcpy(cfg->name, v);
            } else if (strcmp(current_section, "budget") == 0) {
                if (strcmp(k, "max_tokens_per_task") == 0) cfg->max_tokens = atoi(v);
            } else if (strcmp(current_section, "providers.repomix") == 0) {
                if (strcmp(k, "enabled") == 0) cfg->repomix.enabled = (strcmp(v, "true") == 0);
                if (strcmp(k, "compress") == 0) cfg->repomix.compress = (strcmp(v, "true") == 0);
            } else if (strcmp(current_section, "providers.headroom") == 0) {
                if (strcmp(k, "enabled") == 0) cfg->headroom.enabled = (strcmp(v, "true") == 0);
                if (strcmp(k, "mode") == 0) strcpy(cfg->headroom.mode, v);
            } else if (strcmp(current_section, "policy") == 0) {
                if (strcmp(k, "preset") == 0) strcpy(cfg->policy_preset, v);
            }
        }
    }

    fclose(f);
    return 0;
}
