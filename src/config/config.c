#include "toktrim.h"
#include <ctype.h>

static char* trim_whitespace(char* text) {
    char* end;

    while (*text && isspace((unsigned char)*text)) {
        text++;
    }

    end = text + strlen(text);
    while (end > text && isspace((unsigned char)end[-1])) {
        end--;
    }

    *end = '\0';
    return text;
}

static int parse_bool_value(const char* value, int* out_value) {
    if (strcmp(value, "true") == 0) {
        *out_value = 1;
        return 0;
    }

    if (strcmp(value, "false") == 0) {
        *out_value = 0;
        return 0;
    }

    return -1;
}

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
    int saw_project_name = 0;
    int saw_policy_preset = 0;
    int parse_error = 0;

    if (!f) return -1;

    char line[256];
    char current_section[64] = "";

    while (fgets(line, sizeof(line), f)) {
        char* trimmed = trim_whitespace(line);
        char* equals;
        char* key;
        char* value;

        if (*trimmed == '\0' || *trimmed == '#') continue;

        if (*trimmed == '[') {
            char* section_end = strchr(trimmed, ']');

            if (!section_end || sscanf(trimmed, "[%63[^]]", current_section) != 1) {
                parse_error = 1;
                break;
            }

            continue;
        }

        equals = strchr(trimmed, '=');
        if (!equals) {
            parse_error = 1;
            break;
        }

        *equals = '\0';
        key = trim_whitespace(trimmed);
        value = trim_whitespace(equals + 1);
        if (*key == '\0' || *value == '\0') {
            parse_error = 1;
            break;
        }

        if (*value == '"') {
            size_t value_len = strlen(value);

            if (value_len < 2 || value[value_len - 1] != '"') {
                parse_error = 1;
                break;
            }

            value[value_len - 1] = '\0';
            value++;
        }

        if ((strcmp(current_section, "project") == 0 || current_section[0] == '\0') && strcmp(key, "name") == 0) {
            strcpy(cfg->name, value);
            saw_project_name = 1;
            continue;
        }

        if (strcmp(current_section, "budget") == 0 && strcmp(key, "max_tokens_per_task") == 0) {
            char* endptr = NULL;
            long parsed = strtol(value, &endptr, 10);

            if (!endptr || *trim_whitespace(endptr) != '\0') {
                parse_error = 1;
                break;
            }

            cfg->max_tokens = (int)parsed;
            continue;
        }

        if (strcmp(current_section, "providers.repomix") == 0) {
            if (strcmp(key, "enabled") == 0) {
                if (parse_bool_value(value, &cfg->repomix.enabled) != 0) {
                    parse_error = 1;
                    break;
                }
            } else if (strcmp(key, "compress") == 0) {
                if (parse_bool_value(value, &cfg->repomix.compress) != 0) {
                    parse_error = 1;
                    break;
                }
            }
            continue;
        }

        if (strcmp(current_section, "providers.headroom") == 0) {
            if (strcmp(key, "enabled") == 0) {
                if (parse_bool_value(value, &cfg->headroom.enabled) != 0) {
                    parse_error = 1;
                    break;
                }
            } else if (strcmp(key, "mode") == 0) {
                strcpy(cfg->headroom.mode, value);
            }
            continue;
        }

        if (strcmp(current_section, "policy") == 0 && strcmp(key, "preset") == 0) {
            strcpy(cfg->policy_preset, value);
            saw_policy_preset = 1;
            continue;
        }
    }

    fclose(f);

    if (parse_error) {
        return -2;
    }

    if (!saw_project_name || !saw_policy_preset) {
        return -3;
    }

    return 0;
}
