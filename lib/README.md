# BURST VM REPL - Refactored Structure

This is a refactored version of the BURST VM REPL, organized into modular components for better maintainability.

## Directory Structure

```
.
├── burst-repl.js          # Main REPL file (simplified)
├── burst-vm.js            # BURST VM core (unchanged, required dependency)
├── package.json          # Project metadata
├── README.md            # This file
└── repl/                # REPL module directory
    ├── command-handlers.js    # All command implementations
    ├── assembler-utils.js     # Assembly instruction parsing
    ├── debugger.js           # Debugging functionality
    ├── expression-evaluator.js # Expression evaluation for debugger
    └── disassembler.js       # Instruction disassembly
```

## Module Breakdown

### burst-repl.js (Main)
- Simplified main file
- Sets up readline interface
- Handles command dispatch
- Manages history

### repl/command-handlers.js
- Contains all command implementations (help, run, step, etc.)
- Assembly file processing
- Direct instruction parsing

### repl/assembler-utils.js
- Instruction parsing and validation
- Operand type checking
- Assembly method dispatch

### repl/debugger.js
- Breakpoint management
- Watchpoint functionality
- Symbol table for debugging
- Execution control

### repl/expression-evaluator.js
- Expression evaluation for print command
- Register and memory access
- Address and value parsing utilities

### repl/disassembler.js
- Instruction disassembly functionality
- Converts machine code back to assembly mnemonics

## Usage

The refactored code maintains the same functionality as the original:

```bash
node burst-repl.js
```

All commands work exactly as before:
- `help` - Show available commands
- `run` - Run program
- `step` - Step through instructions
- `break` - Set breakpoints
- `watch` - Set watchpoints
- `info` - Show register/memory information
- `assemble` - Assemble source files
- etc.

## Benefits of Refactoring

1. **Modularity**: Each module has a single responsibility
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Reusability**: Modules can be imported separately if needed
4. **Testing**: Easier to unit test individual components
5. **Clarity**: Improved code organization and readability

## Dependencies

The refactored code still requires the `burst-vm.js` file to be in the same directory as `burst-repl.js`.

## Migration Notes

- No functionality has been changed
- All commands work identically
- The same error messages are preserved
- File paths are relative to maintain compatibility

The refactoring preserves all original functionality while improving code organization.
