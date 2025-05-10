# BURST VM Test Makefile

.PHONY: all test test-arithmetic test-logical test-memory test-control test-system test-registers test-mm clean

all: test

# Run all tests
test:
	@echo "Running BURST VM Test Suite..."
	@node burst-test-runner.js

# Individual test targets
test-arithmetic:
	@echo "Running Arithmetic Tests..."
	@node burst-test-runner.js --file test-arithmetic.asm

test-logical:
	@echo "Running Logical Tests..."
	@node burst-test-runner.js --file test-logical.asm

test-memory:
	@echo "Running Memory Tests..."
	@node burst-test-runner.js --file test-memory.asm

test-control:
	@echo "Running Control Flow Tests..."
	@node burst-test-runner.js --file test-control.asm

test-system:
	@echo "Running System Tests..."
	@node burst-test-runner.js --file test-system.asm

test-registers:
	@echo "Running Register Tests..."
	@node burst-test-runner.js --file test-registers.asm

# Memory Manager unit test
test-mm:
	@echo "Running Memory Manager Unit Tests..."
	@node memory-manager-test.js

# Run all tests including unit tests
test-all: test test-mm

# Clean up test files
clean:
	@echo "Cleaning up test files..."
	@rm -f test-*.asm test-*.bin

help:
	@echo "BURST VM Test Suite"
	@echo "=================="
	@echo ""
	@echo "Available targets:"
	@echo "  make test           - Run all VM instruction tests"
	@echo "  make test-arithmetic - Run arithmetic instruction tests"
	@echo "  make test-logical   - Run logical instruction tests"
	@echo "  make test-memory    - Run memory instruction tests"
	@echo "  make test-control   - Run control flow tests"
	@echo "  make test-system    - Run system instruction tests"
	@echo "  make test-registers - Run register operation tests"
	@echo "  make test-mm        - Run memory manager unit tests"
	@echo "  make test-all       - Run all tests (VM + unit tests)"
	@echo "  make clean          - Clean up test files"
	@echo ""
