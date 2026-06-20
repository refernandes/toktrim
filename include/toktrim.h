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
    CMD_COMPRESS
} command_t;

// Contexto do comando
typedef struct {
    command_t cmd;
    char* target;      // path do arquivo ou provider a instalar
    char* type;        // 'repo', 'logs', etc.
    char* input;       // arquivo input para estimate/optimize
    int json_output;   // boolean para --json
} cli_context_t;

// utils
int safe_exec(const char* binary_path, char* const argv[]);
void log_info(const char* msg);
void log_error(const char* msg);

// cli
int parse_args(int argc, char** argv, cli_context_t* ctx);

// core
int run_doctor();
int run_install(const char* target);
int run_status();
int run_estimate(const char* type, const char* input, int json_out);
int run_optimize(const char* type, const char* input, int json_out);

#endif // TOKTRIM_H
