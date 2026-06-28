CC = gcc
CFLAGS = -Wall -Wextra -Iinclude -g

SRC_DIR = src
OBJ_DIR = obj
BIN = toktrim
TEST_CONTRACT_BIN = tests/test_contract

SRCS = $(wildcard $(SRC_DIR)/*.c) \
       $(wildcard $(SRC_DIR)/*/*.c)
OBJS = $(patsubst $(SRC_DIR)/%.c, $(OBJ_DIR)/%.o, $(SRCS))

$(BIN): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c -o $@ $<

test-contract: $(BIN) tests/test_contract.c
	$(CC) $(CFLAGS) -o $(TEST_CONTRACT_BIN) tests/test_contract.c
	./$(TEST_CONTRACT_BIN)

clean:
	rm -rf $(OBJ_DIR) $(BIN) $(TEST_CONTRACT_BIN)

.PHONY: clean test-contract
