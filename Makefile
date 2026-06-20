CC = gcc
CFLAGS = -Wall -Wextra -Werror -O2 -fsanitize=address,undefined -g
TARGET = toktrim
SRC = toktrim.c

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

clean:
	rm -f $(TARGET)
	rm -rf *.dSYM

re: clean all

.PHONY: all clean re
