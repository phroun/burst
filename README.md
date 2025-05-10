# BURST - Basic Universal Reference System Toolkit

BURST is a minimal bytecode runtime and virtual machine designed to be a universal computing foundation. Created with AI assistance, it aims to provide an educational, cross-platform environment for learning about computer architecture and operating systems.

## Core Goals

1. **Minimal bytecode runtime** - A clean, efficient instruction set that's easy to understand and implement
2. **Platform agnostic** - Target native systems, web browsers, Electron, and more
3. **Educational focus** - Designed for people learning about computers and system programming
4. **Language ecosystem** - Support for LLVM and native language development
5. **Interactive environment** - Built-in terminal and REPL for exploration
6. **Host OS integration** - Bridge to native filesystem and system resources
7. **Self-contained** - Built-in filesystem and core utilities

## Project Structure

- `burst-vm.js` - Core virtual machine implementation
- `docs/` - Documentation and specifications
  - `GOALS.md` - Detailed project goals and vision
  - `DESIGN.md` - Design principles and architecture
  - `ISA.md` - Instruction Set Architecture specification
  - `SYSCALLS.md` - System call interface documentation

## Quick Start

```javascript
const { BurstVM, BurstAssembler } = require('./burst-vm.js');

// Create a new VM instance
const vm = new BurstVM();

// Load and run a program
const program = createProgram();
vm.loadProgram(program);
vm.run();
```

## Development Roadmap

### Phase 1: Core VM ✅
- Basic instruction set
- Memory management
- Simple I/O

### Phase 2: Shell/Terminal
- Command interpreter
- File operations
- Process management

### Phase 3: Host OS Bridge
- Native filesystem access
- Process spawning
- Network access

### Phase 4: Development Tools
- Assembler
- Debugger
- Simple compiler

### Phase 5: LLVM Backend
- LLVM target definition
- Optimization passes
- Standard library

## Contributing

BURST is an AI-assisted project, meaning it was designed and implemented in collaboration with AI systems. We welcome contributions that maintain this spirit of human-AI collaboration.

## License

[To be determined]

## Acknowledgments

This project was created through human-AI collaboration, demonstrating the potential for AI systems to assist in complex software engineering tasks.
