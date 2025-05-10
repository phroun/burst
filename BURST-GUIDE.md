# BURST VM REPL User Guide

## Overview

The BURST REPL (Read-Eval-Print Loop) provides an interactive environment for working with the BURST Virtual Machine. It includes a debugger, assembler, and command interpreter all in one interface.

## Getting Started

To start the REPL:

```bash
node burst-repl.js
```

Or run the demo:

```bash
node burst-demo.js
```

## Commands

### Basic Commands

- **help [command]** - Show help for all commands or a specific command
- **quit** (or **q**) - Exit the REPL

### Execution Control

- **run [file]** - Run program from beginning (optionally load file first)
- **step [n]** - Execute n instructions (default: 1)
- **continue** (or **c**) - Continue execution until breakpoint or halt
- **reset** - Reset VM to initial state

### Debugging

- **break <address>** (or **b**) - Toggle breakpoint at address
- **watch <address>** (or **w**) - Toggle watchpoint at address
- **info <what>** (or **i**) - Show information:
  - **info regs** - Display all registers
  - **info mem <addr> [length]** - Display memory contents
  - **info breaks** - List all breakpoints and watchpoints

### Memory and Registers

- **print <expression>** (or **p**) - Evaluate and print expression
- **set <register> <value>** - Set register value
- **disasm [addr] [count]** (or **d**) - Disassemble instructions

### File Operations

- **load <file>** - Load binary program from file
- **save <file>** - Save memory contents to file
- **assemble <file> [-l]** - Assemble source file (use -l to load immediately)

## Direct Assembly Input

You can enter assembly instructions directly at the prompt:

```
burst> movi r0, #42
burst> add r1, r0, r0
burst> push r1
```

## Assembly Language Syntax

### Instructions

```assembly
; Arithmetic
add r0, r1, r2    ; r0 = r1 + r2
sub r0, r1, r2    ; r0 = r1 - r2
mul r0, r1, r2    ; r0 = r1 * r2
div r0, r1, r2    ; r0 = r1 / r2
mod r0, r1, r2    ; r0 = r1 % r2
inc r0            ; r0++
dec r0            ; r0--
neg r0            ; r0 = -r0

; Logical
and r0, r1, r2    ; r0 = r1 & r2
or r0, r1, r2     ; r0 = r1 | r2
xor r0, r1, r2    ; r0 = r1 ^ r2
not r0            ; r0 = ~r0
shl r0, r1, r2    ; r0 = r1 << r2
shr r0, r1, r2    ; r0 = r1 >> r2

; Memory
load r0, r1, #offset   ; r0 = memory[r1 + offset]
store r0, r1, #offset  ; memory[r1 + offset] = r0
loadb r0, r1, #offset  ; Load byte
storeb r0, r1, #offset ; Store byte
push r0               ; Push to stack
pop r0                ; Pop from stack

; Control Flow
jmp label         ; Unconditional jump
jz label          ; Jump if zero
jnz label         ; Jump if not zero
jeq label         ; Jump if equal
jne label         ; Jump if not equal
jlt label         ; Jump if less than
jgt label         ; Jump if greater than
jle label         ; Jump if less or equal
jge label         ; Jump if greater or equal
call label        ; Function call
ret               ; Return from function

; System
syscall           ; System call (number in r0)
halt              ; Stop execution
nop               ; No operation
```

### Registers

- **r0-r15** - General purpose registers
- **pc** - Program counter
- **sp** - Stack pointer

### Addressing Modes

```assembly
movi r0, #42      ; Immediate value
mov r0, r1        ; Register to register
load r0, r1, #4   ; Register + offset
```

### System Calls

System calls use register r0 for the call number and r1, r2, etc. for arguments:

- **SYS_ALLOC (1)** - Allocate memory (size in r1, returns address in r0)
- **SYS_FREE (2)** - Free memory (address in r1)
- **SYS_PRINT (30)** - Print string (address in r1, length in r2)
- **SYS_PUTCHAR (32)** - Print character (char in r1)
- **SYS_EXIT (20)** - Exit program (exit code in r1)

## Example Session

```
burst> help
Available commands:
  help [command]   - Show help
  run [file]       - Run program
  step [n]         - Step n instructions
  ...

burst> movi r0, #65
burst> movi r1, r0
burst> movi r0, #32
burst> syscall
A
burst> info regs
=== Register Dump ===
R0: 0x00000001 (1)
R1: 0x00000041 (65)
...

burst> break main
Breakpoint set at 0x0
burst> run hello.asm
Breakpoint at 0x0
burst> step
0x00000000: jmp 0x4
burst> continue
Hello, BURST World!
Program halted
```

## Tips

1. Use tab completion for commands
2. Command history is available with up/down arrows
3. Most commands have short aliases (r, s, c, b, etc.)
4. Addresses can be specified in hex (0x1000) or decimal (4096)
5. The REPL maintains state between commands - you can build programs incrementally

## Debugging Workflow

1. Load or assemble your program
2. Set breakpoints at interesting locations
3. Run the program
4. When stopped at a breakpoint:
   - Examine registers and memory
   - Single-step to see instruction effects
   - Modify registers or memory for testing
5. Continue execution or reset to try again

## Writing Assembly Programs

1. Create a .asm file with your code
2. Use labels for jump targets and data
3. Comments start with semicolon (;)
4. Use `.string` directive for string data
5. Assemble with `assemble file.asm`
6. Run with `run` or debug with breakpoints

## Advanced Features

- **Watchpoints** - Break when memory location changes
- **Expression evaluation** - Print complex expressions
- **Memory examination** - View memory in different formats
- **Disassembly** - See machine code as assembly
- **Symbol table** - Track labels and their addresses

The BURST REPL provides a complete environment for learning about computer architecture, debugging low-level code, and understanding how virtual machines work.
