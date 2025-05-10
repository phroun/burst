# BURST Design Principles and Architecture

## Overview

BURST follows a layered architecture that separates concerns while maintaining simplicity. Each layer provides abstractions for the layer above while remaining understandable and debuggable.

## Architecture Layers

```
+------------------+
|  Applications    |
+------------------+
|  Language Runtimes (LLVM, etc.) |
+------------------+
|  Shell/Terminal  |
+------------------+
|  System Services |
| (BIOS-like API)  |
+------------------+
|  Bytecode VM     |
+------------------+
|  Host Adapter    |
| (Native/Web/etc) |
+------------------+
```

## Design Decisions

### 1. Instruction Set Architecture

**Choice: Stack-Register Hybrid**
- 16 general-purpose registers for efficiency
- Stack for complex operations and unlimited operands
- Best of both worlds: simplicity and performance

**Rationale:**
- Pure stack machines are simple but inefficient
- Pure register machines are fast but complex
- Hybrid approach balances both concerns

### 2. Memory Model

**Choice: Flat 32-bit Address Space**
- Single, unified address space
- No segmentation complexity
- 4GB addressable memory

**Memory Layout:**
```
0x00000000 - 0x00000FFF : Interrupt Vector Table
0x00001000 - 0x0000FFFF : System Reserved
0x00010000 - 0x7FFFFFFF : User Space
0x80000000 - 0xBFFFFFFF : System Space
0xC0000000 - 0xFFFFFFFF : Memory-mapped I/O
```

### 3. Type System

**Choice: Weakly Typed with Safety**
- All values are 32-bit words
- Interpretation depends on instruction
- Memory protection prevents crashes

**Rationale:**
- Simplifies VM implementation
- Reduces instruction set complexity
- Safety through memory bounds checking

### 4. System Call Interface

**Choice: Register-based Convention**
- System call number in R0
- Arguments in R1-R5
- Return values in R0-R3
- Clean, RISC-like interface

### 5. Error Handling

**Choice: Error Codes with Flags**
- Success/failure in return value
- Detailed error codes available
- Flag register for conditions

## Key Design Principles

### 1. Fail-Safe Defaults
- Memory access is bounds-checked
- Division by zero returns error
- Invalid operations halt safely

### 2. Observable Behavior
- All state changes are visible
- Debugging hooks at every level
- No hidden side effects

### 3. Platform Abstraction
- Host interface is minimal
- Platform differences isolated
- Core behavior identical everywhere

### 4. Extensibility Points
- Instruction space reserved for extensions
- System call numbers organized by category
- Memory regions reserved for future use

## Implementation Strategy

### Phase 1: Minimal Viable VM
1. Core instruction set
2. Basic memory management
3. Console I/O only
4. Single-threaded execution

### Phase 2: System Services
1. File system abstraction
2. Process management
3. Inter-process communication
4. Timer and interrupt handling

### Phase 3: Development Environment
1. Assembler with macro support
2. Interactive debugger
3. Performance profiler
4. Memory visualizer

### Phase 4: Language Support
1. C compiler targeting BURST
2. LLVM backend
3. High-level language bindings
4. Standard library

## Security Considerations

### Memory Protection
- Bounds checking on all access
- No raw pointer arithmetic
- Stack overflow detection

### Process Isolation
- Separate address spaces
- Capability-based permissions
- Controlled IPC mechanisms

### Host System Access
- Sandboxed by default
- Explicit permission grants
- Auditable system calls

## Performance Considerations

### Optimization Opportunities
- Instruction caching
- JIT compilation
- Register allocation
- Dead code elimination

### Profiling Support
- Cycle counting
- Memory access patterns
- Cache behavior simulation
- Hot path identification

## Future Extensions

### Planned Features
- 64-bit addressing mode
- Vector instructions
- Hardware acceleration
- Network protocols

### Research Areas
- Garbage collection
- Type inference
- Security capabilities
- Distributed execution

## Compatibility Promise

### Stable Interfaces
- Core instruction set
- System call numbers
- Binary format
- Memory layout

### Evolution Strategy
- New features in reserved space
- Optional extensions
- Version negotiation
- Graceful degradation
