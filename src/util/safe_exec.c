#include "toktrim.h"
#include <sys/types.h>
#include <sys/wait.h>

int safe_exec(const char* binary_path, char* const argv[]) {
    pid_t pid = fork();
    if (pid == -1) {
        log_error("Erro no fork()");
        return -1;
    } else if (pid == 0) {
        // Filho
        execvp(binary_path, argv);
        // Se chegar aqui, erro no execvp
        exit(127);
    } else {
        // Pai
        int status;
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) {
            return WEXITSTATUS(status);
        }
        return -1;
    }
}
