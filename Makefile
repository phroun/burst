# BURST VM Makefile

.PHONY: all test repl demo clean

all: test

test:
	@echo "Running BURST VM tests..."
	@node burst-test.js

repl:
	@echo "Starting BURST REPL..."
	@node burst-repl.js

demo:
	@echo "Running BURST interactive demo..."
	@node burst-interactive-demo.js

example:
	@echo "Creating example assembly files..."
	@node burst-demo.js

# Assemble a specific file
%.bin: %.asm
	@echo "Assembling $<..."
	@node -e "const BurstREPL = require('./burst-repl.js'); const repl = new BurstREPL(); repl.cmdAssemble(['$<']);"

# Run assembled program
run-%.bin: %.bin
	@echo "Running $<..."
	@node -e "const fs = require('fs'); const {BurstVM} = require('./burst-vm.js'); const vm = new BurstVM(); const prog = fs.readFileSync('$<'); vm.loadProgram(new Uint8Array(prog)); vm.run();"

clean:
	@echo "Cleaning up..."
	@rm -f *.bin
	@rm -f test_*.asm
	@rm -f demo.asm

help:
	@echo "BURST VM Build System"
	@echo "===================="
	@echo ""
	@echo "Available targets:"
	@echo "  make test     - Run tests"
	@echo "  make repl     - Start REPL"
	@echo "  make demo     - Run interactive demo"
	@echo "  make example  - Create example programs"
	@echo "  make clean    - Clean up build files"
	@echo ""
	@echo "Assembly targets:"
	@echo "  make file.bin - Assemble file.asm"
	@echo "  make run-file.bin - Run assembled program"
	@echo ""
