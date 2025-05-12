Looking at the file tree and considering the goal of improving the ISA without breaking existing functionality, here are the key files you should provide when making ISA changes:

## Core VM and ISA Files (Essential):

1. **`burst-vm.js`** - The main VM implementation that contains the ISA definitions and execution logic
2. **`repl/assembler-utils.js`** - Utilities for assembly operations
3. **`repl/disassembler.js`** - Handles disassembly of instructions back to mnemonics
4. **`repl/commands/basic/assemble.js`** - The actual assemble command implementation

## Test Files (If they exist):

5. **`tests/assembler-syntax-test.js`** - Test suite that needs to be kept up to date.

## Expression Evaluators (Potentially Important):

6. **`repl/expression-evaluator.js`** - If it handles assembly expressions
7. **`repl/vm-expression-evaluator.js`** - VM-specific expression evaluation

Any other test files related to:
- Assembly parsing
- Instruction execution 
- Disassembly
- VM operations

## Supporting Files (Context-dependent):

8. **`repl/commands/debugger/info.js`** - Info command that might display registers/memory
9. **`repl/commands/debugger/step.js`** - Single-step execution
10. **`repl/debugger.js`** - Debugger implementation that might need to know about new instructions
11. **`repl/assembly-commands.js`** - If it contains ISA-specific command logic
12. **`repl/repl-commands.js`** - If it has special handling for assembly input
13. **`repl/commands/debugger/disasm.js`** - Disassembly command
14. **`repl/commands/basic/run.js`** - Execution command that might have ISA dependencies
15. **`repl/mnemonic-utils.js`** - Contains mnemonic validation and suggestion logic
16. **`repl/assembly-parser.js`** - Handles parsing of assembly instructions, but it reads opcode list from assembler-utils.js.

When making ISA changes, the main areas that could break are:

1. **Instruction parsing/assembly** - New syntax or operand formats
2. **Instruction execution** - New opcodes or modified behavior
3. **Disassembly** - Reverse mapping from opcodes to mnemonics
4. **Debugger features** - Display of instruction details
5. **Expression evaluation** - If new addressing modes are added

The files in the `repl/commands/shell/` directory are unlikely to be affected by ISA changes, as they handle file system operations.

So for ISA improvements, I'd recommend providing at minimum files 1-6 from the list above, plus any others that seem relevant to the specific changes you're making.
