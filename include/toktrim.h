#ifndef TOKTRIM_H
#define TOKTRIM_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Subcomandos suportados
typedef enum {
    CMD_UNKNOWN,
    CMD_DOCTOR,
    CMD_INSTALL,
    CMD_STATUS,
    CMD_ESTIMATE,
    CMD_OPTIMIZE,
    CMD_PACK,
    CMD_COMPRESS,
    CMD_BENCHMARK
} command_t;

// Contexto do comando
typedef struct {
    command_t cmd;
    char* target;      // path do arquivo ou provider a instalar
    char* type;        // 'repo', 'logs', etc.
    char* input;       // arquivo input para estimate/optimize
    int json_output;   // boolean para --json
} cli_context_t;

// Estruturas de Configuração Local
typedef struct {
    int enabled;
    int compress;
    int no_files;
} repomix_cfg_t;

typedef struct {
    int enabled;
    char mode[32];
} headroom_cfg_t;

typedef struct {
    char name[128];
    int max_tokens;
    repomix_cfg_t repomix;
    headroom_cfg_t headroom;
    char policy_preset[64];
} toktrim_config_t;

// utils
int safe_exec(const char* binary_path, char* const argv[]);
void log_info(const char* msg);
void log_error(const char* msg);

// provider interface
typedef struct {
    int (*detect)(void);
    int (*run_pack)(const char* target_path);
    int (*run_compress)(const char* target_file);
} provider_vtbl_t;

provider_vtbl_t* get_repomix_provider();
provider_vtbl_t* get_headroom_provider();

// cli
int parse_args(int argc, char** argv, cli_context_t* ctx);

// config
void load_default_config(toktrim_config_t* cfg);
int parse_local_config(const char* filepath, toktrim_config_t* cfg);

// core
int run_doctor();
int run_install(const char* target);
int run_status(toktrim_config_t* cfg);
int run_estimate(const char* type, const char* input, int json_out, toktrim_config_t* cfg);
int run_optimize(const char* type, const char* input, int json_out, toktrim_config_t* cfg);
int run_benchmark(const char* type, const char* input, toktrim_config_t* cfg);

#endif // TOKTRIM_H
