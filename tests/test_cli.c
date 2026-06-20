#include <assert.h>
#include <string.h>
#include <stdio.h>
#include "../include/toktrim.h"

void test_parse_args() {
    cli_context_t ctx;
    
    char* args1[] = {"toktrim", "doctor"};
    assert(parse_args(2, args1, &ctx) == 0);
    assert(ctx.cmd == CMD_DOCTOR);

    char* args2[] = {"toktrim", "estimate", "--type", "repo", "--input", "src"};
    assert(parse_args(6, args2, &ctx) == 0);
    assert(ctx.cmd == CMD_ESTIMATE);
    assert(strcmp(ctx.type, "repo") == 0);
    assert(strcmp(ctx.input, "src") == 0);
    assert(ctx.json_output == 0);
    
    printf("  [OK] parse_args tests passed.\n");
}

int main() {
    printf("Running Unit Tests...\n");
    test_parse_args();
    printf("All Unit Tests Passed!\n");
    return 0;
}
