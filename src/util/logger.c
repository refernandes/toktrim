#include "toktrim.h"

void log_info(const char* msg) {
    printf("[INFO] %s\n", msg);
}

void log_error(const char* msg) {
    fprintf(stderr, "[ERRO] %s\n", msg);
}
