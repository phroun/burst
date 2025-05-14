# BURST VM Instruction Set Architecture

## Table of Contents

1. [Overview](#overview)
2. [Registers](#registers)
3. [Memory Model](#memory-model)
4. [Instruction Encoding](#instruction-encoding)
5. [Addressing Modes](#addressing-modes)
6. [Instruction Set](#instruction-set)
7. [Privilege and Protection](#privilege-and-protection)
8. [Stack Operations](#stack-operations)
9. [Assembly Language Syntax](#assembly-language-syntax)
10. [Binary Format](#binary-format)
11. [Reference Card](#reference-card)

## Overview

The BURST VM is a 32-bit architecture designed as the foundation layer for the BURST runtime system. It provides a complete instruction set with sophisticated addressing modes, memory segmentation, and privilege separation.

### Key Features
- 16 general-purpose 32-bit registers
- Segmented memory model with 48-bit physical addresses
- 16-bit opcode structure with systematic encoding
- Two privilege levels (System/User)
- Virtual I/O port system
- Stack grows downward
- Little-endian byte ordering

## Registers

### General Purpose (32-bit)
| Register | Purpose | ABI Usage | Preserved |
|----------|---------|-----------|-----------|
| R0 | Return value / SYSCALL number / INT number | Volatile | No |
| R1-R5 | Function arguments (A1-A5) | Volatile | No |
| R6-R10 | Temporary registers (T0-T4) | Caller-saved | No |
| R11-R13 | Saved registers (S0-S2) | Callee-saved | Yes |
| R14 | Stack Pointer (SP) | Special | Yes |
| R15 | Frame Pointer (FP) | Special | Yes |

### Special Purpose (32-bit)
- **PC**: Program Counter
- **FLAGS**: Status flags register

### Segment Registers (16-bit)
- **CS**: Code Segment
- **DS**: Data Segment  
- **ES**: Extra Segment
- **SS**: Stack Segment

### System Registers
- **SDTR**: Segment Descriptor Table Register (privileged)
- **PID**: Process ID (32-bit, read-only)

### FLAGS Register
| Bit | Flag | Name | Description |
|-----|------|------|-------------|
| 0 | CF | Carry Flag | Set on unsigned overflow/underflow |
| 1 | ZF | Zero Flag | Set when result is zero |
| 2 | SF | Sign Flag | Set when result is negative |
| 3 | OF | Overflow Flag | Set on signed overflow |
| 4 | DE | Divide Error | Set on divide-by-zero |
| 5 | PF | Parity Flag | Set when low byte has even parity |
| 6-31 | - | Reserved | Reserved for future use |

### CS Register Format
```
[15:2] Segment Selector (14 bits)
[1]    Reserved (must be 0)
[0]    CPL - Current Privilege Level (0=System, 1=User)
```

## Memory Model

### Segmented Addressing
- Physical Address = (Segment << 16) + Offset
- 48-bit physical address space
- Each segment up to 4GB

### Stack Operation
- Grows downward
- PUSH: SP = SP - 4, then [SS:SP] = value
- POP: value = [SS:SP], then SP = SP + 4

### Segment Descriptor Table (SDT) Entry
```
Bits 0-31:  Base Address (32-bit)
Bits 32-47: Limit (16-bit, granularity = 256 bytes)
Bits 48-51: Access Rights
  Bit 48: Present (valid segment)
  Bit 49: Readable/Writable
  Bit 50: Executable
  Bit 51: Privilege (0=System only, 1=User accessible)
Bits 52-63: Reserved
```

### Initial Memory Map
Memory regions with their segment:offset starting points:
```
0x00000000-0x0000FFFF: Boot/Code (64KB) - CS:0
0x00010000-0x0001FFFF: Data (64KB) - DS:0  
0x00020000-0x00027FFF: Stack (32KB) - SS:0
Total: 160KB initial allocation
```

## Instruction Encoding

### 16-bit Opcode Structure
```
[15:12] Category (4 bits) - Instruction category
[11:5]  Operation (8 bits) - Specific operation  
[4:0]   Addressing Mode (4 bits) - Operand addressing
```

### Category Assignments
| Category | Hex | Description |
|----------|-----|-------------|
| 0000 | 0 | System & Flow |
| 0001 | 1 | Conditional Branches |
| 0010 | 2 | Data Movement |
| 0011 | 3 | Arithmetic |
| 0100 | 4 | Logical |
| 0101 | 5 | Shift/Rotate |
| 0110 | 6 | Reserved |
| 0111 | 7 | I/O |
| 1000 | 8 | Stack |
| 1001 | 9 | Flag Manipulation |
| 1010 | A | Segment Management |
| 1011-1110 | B-E | Reserved |
| 1111 | F | Prefix/Extended |

### RegOperand Byte
When register operands need to be specified (modes 4-F):
```
[7:4] First register field (typically destination)
[3:0] Second register field (typically source)
```

## Addressing Modes

| Mode | Hex | Description | RegOperand Required | Example |
|------|-----|-------------|---------------------|---------|
| 00000 | 0 | IMPL - Implied | No | HALT |
| 00001 | 1 | I8 - 8-bit immediate | No | INT #3 |
| 00010 | 2 | I16 - 16-bit immediate | No | PUSHM #0xFF |
| 00011 | 3 | I32 - 32-bit immediate | No | PUSH #0x12345678 |
| 00100 | 4 | R - Single register | Yes | INC R1 |
| 00101 | 5 | R,R - Register to register | Yes | MOV R1, R2 |
| 00110 | 6 | R,I8 - Register, 8-bit immediate | Yes | ADD R3, #10 |
| 00111 | 7 | R,I32 - Register, 32-bit immediate | Yes | MOV R0, #0x12345678 |
| 01000 | 8 | R,[R] - Register, indirect | Yes | MOV R1, [R2], JZ [R3] |
| 01001 | 9 | [R],R - Indirect, register | Yes | MOV [R3], R4 |
| 01010 | A | R,M - Register, direct memory | Yes | MOV R5, [0x1000], JZ 0x2000 |
| 01011 | B | M,R - Direct memory, register | Yes | MOV [0x2000], R6 |
| 01100 | C | R,[R+I] - Register, indexed | Yes | MOV R7, [R8+0x100] |
| 01101 | D | [R+I],R - Indexed, register | Yes | MOV [R9+0x200], R10 |
| 01110 | E | (Unused) | Yes | Reserved |
| 01111 | F | Special - Extended modes | Varies | FAR JMP, LOADX |

### Special Mode F Encodings

#### Scaled Index (LDX, STX, LEAX)
```
[Opcode][RegOperand][ScaleIndex][Displacement]
ScaleIndex byte:
  [7:6] = Scale (00=1, 01=2, 10=4, 11=8)
  [5:2] = Index register
  [1:0] = Reserved
```

#### Register-Scaled (LDR, STR, LEAR)
```
[Opcode][RegOperand][IndexScale][Displacement]
IndexScale byte:
  [7:4] = Index register
  [3:0] = Scale register
```

#### Far Operations
Far operations use Mode F with the following encoding:
```
[Opcode][Segment:16][Offset:32]
```
This applies to FAR JMP, FAR CALL, and segment load instructions.

#### Segment Operations
```
[Opcode][SegOperand]
SegOperand:
  [7:4] = General register
  [3:2] = Segment register (00=CS, 01=DS, 10=ES, 11=SS)
  [1:0] = Direction (00=R,S, 01=S,R)
```

#### ENTER Operation
```
[Opcode][LocalSize:16][NestingLevel:8]
```
Creates a stack frame with specified local variable space and nesting level.

## Instruction Set

### Complete Opcode Map

#### Category 0: System & Flow
| Op | Opcode | Mnemonic | Syntax | Description |
|----|--------|----------|--------|-------------|
| 00 | 0x0000 | HALT | HALT | Halt execution |
| 01 | 0x0020 | CPUID | CPUID | CPU identification |
| 02 | 0x0040 | SYSCALL | SYSCALL | System call |
| 03 | 0x0061 | TRAP | TRAP #n | Debug trap |
| 04 | 0x0081 | INT | INT #n | Software interrupt |
| 05 | 0x00A0 | IRET | IRET | Return from interrupt |
| 06 | 0x00C1 | CALL | CALL rel8 | Call relative (8-bit) |
| 06 | 0x00CA | CALL | CALL addr | Call absolute |
| 06 | 0x00C8 | CALL | CALL [R] | Call indirect |
| 06 | 0x00CF | FCALL | FCALL seg:off | Far call |
| 07 | 0x00E0 | RET | RET | Return |
| 08 | 0x0100 | RETF | RETF | Far return |

#### Category 1: Branching
| Op | Opcode | Mnemonic | Mode | Condition | Description |
|----|--------|----------|------|-----------|-------------|
| 00 | 0x1001 | JMP | I8 | Always | Jump relative 8-bit |
| 00 | 0x1002 | JMP | I16 | Always | Jump relative 16-bit |
| 00 | 0x1008 | JMP | [R] | Always | Jump register indirect |
| 00 | 0x100A | JMP | M | Always | Jump absolute |
| 00 | 0x100F | JMP | seg:offs | Always | Far Jump absolute |
| 01 | 0x1020 | NOP | NOP | No operation |
| 01 | 0x1021 | NOP | I8 | Never | No operation |
| 01 | 0x1022 | NOP | I16 | Never | No operation |
| 01 | 0x1023 | NOP | NOP i32 | Never | No operation |
| 01 | 0x1024 | NOP | NOP R | Never | No operation |
| 01 | 0x1025 | NOP | NOP R,R | Never | No operation |
| 01 | 0x1026 | NOP | NOP R,I8 | Never | No operation |
| 01 | 0x1027 | NOP | NOP R,I32 | Never | No operation |
| 01 | 0x1028 | NOP | [R] | Never | No jump (indirect) |
| 01 | 0x1029 | NOP | NOP [R],R | Never | No operation |
| 01 | 0x102A | NOP | M | Never | No jump (absolute) |
| 01 | 0x102B | NOP | NOP M,R | Never | No operation |
| 01 | 0x102C | NOP | NOP R,[R+I] | Never | No operation |
| 01 | 0x102D | NOP | NOP [R+I],R | Never | No operation |
| 01 | 0x102E | NOP | NOP (Undefined) | Never | (Reserved) |
| 01 | 0x102F | NOP | seg:offs | Never | No operation |
| 02 | 0x1041 | JNZ/JNE | I8 | Z==0 | Jump if not zero (8-bit) |
| 02 | 0x1042 | JNZ/JNE | I16 | Z==0 | Jump if not zero (16-bit) |
| 02 | 0x1048 | JNZ/JNE | [R] | Z==0 | Jump if not zero (indirect) |
| 02 | 0x104A | JNZ/JNE | M | Z==0 | Jump if not zero (absolute) |
| 03 | 0x1061 | JZ/JE | I8 | Z==1 | Jump if zero (8-bit) |
| 03 | 0x1062 | JZ/JE | I16 | Z==1 | Jump if zero (16-bit) |
| 03 | 0x1068 | JZ/JE | [R] | Z==1 | Jump if zero (indirect) |
| 03 | 0x106A | JZ/JE | M | Z==1 | Jump if zero (absolute) |
| 04 | 0x1081 | JGE/JNL | I8 | S==O | Jump if greater or equal (8-bit) |
| 04 | 0x1082 | JGE/JNL | I16 | S==O | Jump if greater or equal (16-bit) |
| 04 | 0x1088 | JGE/JNL | [R] | S==O | Jump if greater or equal (indirect) |
| 04 | 0x108A | JGE/JNL | M | S==O | Jump if greater or equal (absolute) |
| 05 | 0x10A1 | JL/JNGE | I8 | S≠O | Jump if less (8-bit) |
| 05 | 0x10A2 | JL/JNGE | I16 | S≠O | Jump if less (16-bit) |
| 05 | 0x10A8 | JL/JNGE | [R] | S≠O | Jump if less (indirect) |
| 05 | 0x10AA | JL/JNGE | M | S≠O | Jump if less (absolute) |
| 06 | 0x10C1 | JG/JNLE | I8 | Z==0 & S==O | Jump if greater (8-bit) |
| 06 | 0x10C2 | JG/JNLE | I16 | Z==0 & S==O | Jump if greater (16-bit) |
| 06 | 0x10C8 | JG/JNLE | [R] | Z==0 & S==O | Jump if greater (indirect) |
| 06 | 0x10CA | JG/JNLE | M | Z==0 & S==O | Jump if greater (absolute) |
| 07 | 0x10E1 | JLE/JNG | I8 | Z==1 or S≠O | Jump if less or equal (8-bit) |
| 07 | 0x10E2 | JLE/JNG | I16 | Z==1 or S≠O | Jump if less or equal (16-bit) |
| 07 | 0x10E8 | JLE/JNG | [R] | Z==1 or S≠O | Jump if less or equal (indirect) |
| 07 | 0x10EA | JLE/JNG | M | Z==1 or S≠O | Jump if less or equal (absolute) |
| 0A | 0x1141 | JB/JC | I8 | C==1 | Jump if below/carry (8-bit) |
| 0A | 0x1142 | JB/JC | I16 | C==1 | Jump if below/carry (16-bit) |
| 0A | 0x1148 | JB/JC | [R] | C==1 | Jump if below/carry (indirect) |
| 0A | 0x114A | JB/JC | M | C==1 | Jump if below/carry (absolute) |
| 0B | 0x1161 | JAE/JNC | I8 | C==0 | Jump if above or equal (8-bit) |
| 0B | 0x1162 | JAE/JNC | I16 | C==0 | Jump if above or equal (16-bit) |
| 0B | 0x1168 | JAE/JNC | [R] | C==0 | Jump if above or equal (indirect) |
| 0B | 0x116A | JAE/JNC | M | C==0 | Jump if above or equal (absolute) |
| 0C | 0x1181 | JA/JNBE | I8 | C==0 & Z==0 | Jump if above (8-bit) |
| 0C | 0x1182 | JA/JNBE | I16 | C==0 & Z==0 | Jump if above (16-bit) |
| 0C | 0x1188 | JA/JNBE | [R] | C==0 & Z==0 | Jump if above (indirect) |
| 0C | 0x118A | JA/JNBE | M | C==0 & Z==0 | Jump if above (absolute) |
| 0D | 0x11A1 | JBE/JNA | I8 | C==1 or Z==1 | Jump if below or equal (8-bit) |
| 0D | 0x11A2 | JBE/JNA | I16 | C==1 or Z==1 | Jump if below or equal (16-bit) |
| 0D | 0x11A8 | JBE/JNA | [R] | C==1 or Z==1 | Jump if below or equal (indirect) |
| 0D | 0x11AA | JBE/JNA | M | C==1 or Z==1 | Jump if below or equal (absolute) |
| 10 | 0x1201 | JDE | I8 | DE==1 | Jump if divide error (8-bit) |
| 10 | 0x1202 | JDE | I16 | DE==1 | Jump if divide error (16-bit) |
| 10 | 0x1208 | JDE | [R] | DE==1 | Jump if divide error (indirect) |
| 10 | 0x120A | JDE | M | DE==1 | Jump if divide error (absolute) |
| 11 | 0x1211 | JNDE | I8 | DE==0 | Jump if no divide error (8-bit) |
| 11 | 0x1212 | JNDE | I16 | DE==0 | Jump if no divide error (16-bit) |
| 11 | 0x1218 | JNDE | [R] | DE==0 | Jump if no divide error (indirect) |
| 11 | 0x121A | JNDE | M | DE==0 | Jump if no divide error (absolute) |

#### Category 2: Data Movement
| Op | Opcode | Mnemonic | Modes | Description |
|----|--------|----------|-------|-------------|
| 00 | 0x2005 | MOV | R,R | Move register to register |
| 00 | 0x2007 | MOV | R,I32 | Move immediate to register |
| 00 | 0x2008 | MOV | R,[R] | Load from memory (indirect) |
| 00 | 0x2009 | MOV | [R],R | Store to memory (indirect) |
| 00 | 0x200A | MOV | R,M | Load from memory (direct) |
| 00 | 0x200B | MOV | M,R | Store to memory (direct) |
| 00 | 0x200C | MOV | R,[R+I] | Load from memory (indexed) |
| 00 | 0x200D | MOV | [R+I],R | Store to memory (indexed) |
| 01 | 0x202F | LDX | R,[R+R*S+I] | Load with scaled index |
| 02 | 0x204F | LDR | R,[R+R*R+I] | Load with register scaling |
| 03 | 0x206F | STX | [R+R*S+I],R | Store with scaled index |
| 04 | 0x208F | STR | [R+R*R+I],R | Store with register scaling |
| 05 | 0x20A5 | XCHG | R,R | Exchange registers |
| 06 | 0x20C5 | MOVZX | R,R | Move with zero extend |
| 07 | 0x20E5 | MOVSX | R,R | Move with sign extend |
| 08 | 0x210C | LEA | R,[R+I] | Load effective address |
| 09 | 0x212F | LEAX | R,[R+R*S+I] | Load indexed address |
| 0A | 0x214F | LEAR | R,[R+R*R+I] | Load register-scaled address |

#### Category 3: Arithmetic
| Op | Opcode | Mnemonic | Modes | Flags |
|----|--------|----------|-------|-------|
| 00 | 0x3005 | ADD | R,R | CF,ZF,SF,OF,PF |
| 00 | 0x3006 | ADD | R,I8 | CF,ZF,SF,OF,PF |
| 00 | 0x3007 | ADD | R,I32 | CF,ZF,SF,OF,PF |
| 01 | 0x3025 | ADC | R,R | CF,ZF,SF,OF,PF |
| 02 | 0x3045 | SUB | R,R | CF,ZF,SF,OF,PF |
| 02 | 0x3046 | SUB | R,I8 | CF,ZF,SF,OF,PF |
| 03 | 0x3065 | SBB | R,R | CF,ZF,SF,OF,PF |
| 04 | 0x3085 | UMUL | R,R | CF,OF |
| 05 | 0x30A5 | IMUL | R,R | CF,OF |
| 06 | 0x30C4 | IDIV | R | DE |
| 07 | 0x30E4 | IMOD | R | DE |
| 08 | 0x3104 | UDIV | R | DE |
| 09 | 0x3124 | UMOD | R | DE |
| 0A | 0x3144 | INC | R | ZF,SF,OF,PF |
| 0B | 0x3164 | DEC | R | ZF,SF,OF,PF |
| 0C | 0x3184 | NEG | R | CF,ZF,SF,OF,PF |

#### Category 4: Logical
| Op | Opcode | Mnemonic | Modes | Flags |
|----|--------|----------|-------|-------|
| 00 | 0x4005 | AND | R,R | ZF,SF,PF,CF=0,OF=0 |
| 00 | 0x4006 | AND | R,I8 | ZF,SF,PF,CF=0,OF=0 |
| 01 | 0x4025 | OR | R,R | ZF,SF,PF,CF=0,OF=0 |
| 01 | 0x4026 | OR | R,I8 | ZF,SF,PF,CF=0,OF=0 |
| 02 | 0x4045 | XOR | R,R | ZF,SF,PF,CF=0,OF=0 |
| 02 | 0x4046 | XOR | R,I8 | ZF,SF,PF,CF=0,OF=0 |
| 03 | 0x4064 | NOT | R | None |
| 04 | 0x4085 | CMP | R,R | CF,ZF,SF,OF,PF |
| 04 | 0x4086 | CMP | R,I8 | CF,ZF,SF,OF,PF |
| 05 | 0x40A5 | TST | R,R | ZF,SF,PF,CF=0,OF=0 |

#### Category 5: Shift/Rotate
| Op | Opcode | Mnemonic | Modes | Flags |
|----|--------|----------|-------|-------|
| 00 | 0x5005 | ROL | R,R | CF,OF |
| 00 | 0x5006 | ROL | R,I8 | CF,OF |
| 01 | 0x5025 | ROR | R,R | CF,OF |
| 01 | 0x5026 | ROR | R,I8 | CF,OF |
| 02 | 0x5045 | SHL | R,R | CF,ZF,SF,PF,OF |
| 02 | 0x5046 | SHL | R,I8 | CF,ZF,SF,PF,OF |
| 03 | 0x5065 | SHR | R,R | CF,ZF,SF,PF,OF |
| 03 | 0x5066 | SHR | R,I8 | CF,ZF,SF,PF,OF |
| 04 | 0x5085 | SAR | R,R | CF,ZF,SF,PF,OF |
| 04 | 0x5086 | SAR | R,I8 | CF,ZF,SF,PF,OF |

#### Category 7: I/O
| Op | Opcode | Mnemonic | Modes | Description |
|----|--------|----------|-------|-------------|
| 00 | 0x7005 | IN | R,R | Input from register port |
| 00 | 0x7006 | IN | R,I8 | Input from immediate port |
| 01 | 0x7025 | OUT | R,R | Output to register port |
| 01 | 0x7026 | OUT | I8,R | Output R to port I8 |

#### Category 8: Stack
| Op | Opcode | Mnemonic | Modes | Description |
|----|--------|----------|-------|-------------|
| 00 | 0x8004 | PUSH | R | Push register |
| 00 | 0x8003 | PUSH | I32 | Push immediate |
| 00 | 0x8008 | PUSH | [R] | Push memory |
| 00 | 0x800F | PUSHS | S | Push segment |
| 01 | 0x8024 | POP | R | Pop register |
| 01 | 0x8028 | POP | [R] | Pop to memory |
| 01 | 0x802F | POPS | S | Pop segment |
| 04 | 0x8082 | PUSHM | I16 | Push multiple |
| 05 | 0x80A2 | POPM | I16 | Pop multiple |
| 06 | 0x80C0 | PUSHF | IMPL | Push flags |
| 07 | 0x80E0 | POPF | IMPL | Pop flags |
| 08 | 0x810F | ENTER | special | Enter procedure |
| 09 | 0x8120 | LEAVE | IMPL | Leave procedure |

#### Category 9: Flag Manipulation
| Op | Opcode | Mnemonic | Description | Flags |
|----|--------|----------|-------------|-------|
| 00 | 0x9000 | CLC | Clear carry | CF=0 |
| 01 | 0x9020 | STC | Set carry | CF=1 |
| 02 | 0x9040 | CMC | Complement carry | CF=~CF |
| 03 | 0x9060 | CLRE | Clear error flags | OF=0,DE=0 |

#### Category A: Segment Management
| Op | Opcode | Mnemonic | Modes | Description |
|----|--------|----------|-------|-------------|
| 00 | 0xA00F | MOVS | R,S/S,R | Move to/from segment register |
| 01 | 0xA02F | LDS | R,FAR M | Load far pointer to DS |
| 02 | 0xA04F | LES | R,FAR M | Load far pointer to ES |
| 03 | 0xA06F | LSS | R,FAR M | Load far pointer to SS |
| 04 | 0xA08F | LSL | R,S | Load segment limit |
| 05 | 0xA0AF | LAR | R,S | Load access rights |
| 06 | 0xA0CF | VERR | S | Verify segment for read |
| 07 | 0xA0EF | VERW | S | Verify segment for write |

#### Category F: Prefixes (Not Yet Defined)
| Op | Opcode | Mnemonic | Description |
|----|--------|----------|-------------|
| F0 | 0xFF00 | CS: | Code segment override |
| F1 | 0xFF20 | DS: | Data segment override |
| F2 | 0xFF40 | ES: | Extra segment override |
| F3 | 0xFF60 | SS: | Stack segment override |

## Privilege and Protection

### Privilege Levels
- **System Mode** (CPL=0): Full access to all instructions and resources
- **User Mode** (CPL=1): Restricted access, requires SYSCALL for privileged operations

### Protected Instructions (System Mode Only)
- SYSCALL (callable from user mode for transition)
- IRET (when changing privilege levels)
- MOVS (writing to segment registers)
- LSL, LAR (segment access)
- I/O operations (configurable per port)

### SYSCALL Mechanism

1. **Entry from User Mode**:
   - Save state on system stack: FLAGS, CS, IP, SS, SP
   - Disable interrupts (FLAGS.IF = 0)
   - Switch to System Mode (CS.CPL = 0)
   - Jump to SYSCALL handler

2. **Return to User Mode**:
   - Validate saved state
   - Restore user state from system stack
   - Return to User Mode with IRET

### Interrupt Handling

1. **Interrupt Entry**:
   - Push FLAGS, CS, IP on current or system stack
   - Push ERROR_CODE and FAULT_ADDR if applicable
   - Load handler CS:IP (CS:0000 for all interrupts)

2. **Privilege Changes**:
   - If switching from User to System, use system stack
   - IRET validates privilege transitions

## Stack Operations

### ENTER Instruction
Creates stack frame for procedure entry:
```assembly
ENTER local_size, nesting_level
```

1. Push old FP
2. FP = SP
3. If nesting_level > 0:
   - Copy parent frame pointers
   - Push current FP
4. SP = SP - local_size

### LEAVE Instruction
Destroys stack frame for procedure exit:
```assembly
LEAVE
```

1. SP = FP
2. Pop FP

### Stack Frame Layout
```
+------------------+
| Return Address   | <- Previous SP
+------------------+
| Old FP          | <- FP points here
+------------------+
| Parent FPs      | (if nesting_level > 0)
+------------------+
| Local Variables | 
+------------------+ <- SP
```

## Assembly Language Syntax

### Basic Format
```assembly
label:                  ; Label definition
    MNEMONIC dest, src  ; Instruction format
    ; Comment

; Operand types:
R0-R15                  ; General registers
#123                    ; Decimal immediate
#0x7F                   ; Hexadecimal immediate
[R1]                    ; Register indirect
[R1+100]                ; Register + displacement
[0x1000]                ; Direct memory
CS:[R1]                 ; Segment override
```

### Directives
```assembly
.section .text          ; Code section
.section .data          ; Data section
.org 0x1000            ; Set origin
.align 4               ; Align to boundary

.byte 0x12             ; Define byte
.word 0x1234           ; Define word
.dword 0x12345678      ; Define dword
.string "Hello"        ; String with null
.ascii "World"         ; String without null

.global symbol         ; Export symbol
.extern symbol         ; Import symbol
```

## Binary Format

### Executable Header (VMX)
```c
struct vmx_header {
    uint32_t magic;         // 0x584D5600 ('VMX\0')
    uint32_t version;       // Format version
    uint32_t flags;         // Executable flags
    uint32_t entry_point;   // Entry CS:IP
    uint32_t text_offset;   // Code section offset
    uint32_t text_size;     // Code section size
    uint32_t data_offset;   // Data section offset
    uint32_t data_size;     // Data section size
    uint32_t bss_size;      // BSS section size
    uint32_t stack_size;    // Requested stack size
    // ... additional fields
};
```

### Instruction Encoding Examples

#### Simple Instructions
```
HALT:           0x0000
NOP:            0x1020
RET:            0x0120
```

#### Conditional Branch Operations
```
JZ rel8:        0x1061 0xXX
JZ rel16:       0x1062 0xXXXX
JZ [R1]:        0x1068 0x10
JZ addr:        0x106A 0xXXXXXXXX
```

#### Immediate Operations
```
INT #3:         0x00A1 0x03
ADD R3, #10:    0x3006 0x30 0x0A
MOV R7, #0x12345678: 0x2007 0x70 0x78 0x56 0x34 0x12
```

#### Memory Operations (using MOV)
```
MOV R1, [R2]:   0x2008 0x12
MOV [R3], R4:   0x2009 0x34
MOV R7, [R8+0x100]: 0x200C 0x78 0x00 0x01 0x00 0x00
```

#### Complex Addressing
```
LDX R0, [R1+R2*4+0x50]:  0x202F 0x01 0x82 0x50 0x00 0x00 0x00
STX [R1+R2*4+0x50], R0:  0x206F 0x01 0x82 0x50 0x00 0x00 0x00
LDR R3, [R4+R5*R6+0x10]: 0x204F 0x34 0x56 0x10 0x00 0x00 0x00
STR [R4+R5*R6+0x10], R3: 0x208F 0x34 0x56 0x10 0x00 0x00 0x00
```

#### Far Operations
```
JMP 0x1234:0x56789ABC: 0x00EF 0x34 0x12 0xBC 0x9A 0x78 0x56
```

### Instruction Size Summary

| Addressing Mode | Base Size | Additional Bytes | Total Size |
|----------------|-----------|------------------|------------|
| IMPL (00) | 2 | 0 | 2 |
| I8 (01) | 2 | 1 | 3 |
| I16 (02) | 2 | 2 | 4 |
| I32 (03) | 2 | 4 | 6 |
| R (04) | 2 | 1 | 3 |
| R,R (05) | 2 | 1 | 3 |
| R,I8 (06) | 2 | 2 | 4 |
| R,I32 (07) | 2 | 5 | 7 |
| R,[R] (08) | 2 | 1 | 3 |
| [R],R (09) | 2 | 1 | 3 |
| R,M (0A) | 2 | 5 | 7 |
| M,R (0B) | 2 | 5 | 7 |
| R,[R+I] (0C) | 2 | 5 | 7 |
| [R+I],R (0D) | 2 | 5 | 7 |
| Scaled (0E) | 2 | 6 | 8 |
| Special (0F) | 2 | varies | varies |

### Encoding Details by Mode

#### Modes 0-3: No RegOperand Byte
```
Mode 0 (IMPL):  [Opcode:16]
Mode 1 (I8):    [Opcode:16][Imm8:8]
Mode 2 (I16):   [Opcode:16][Imm16:16]
Mode 3 (I32):   [Opcode:16][Imm32:32]
```

#### Modes 4-F: RegOperand Byte Required
```
Mode 4 (R):     [Opcode:16][RegOp:8]
Mode 5 (R,R):   [Opcode:16][RegOp:8]
Mode 6 (R,I8):  [Opcode:16][RegOp:8][Imm8:8]
Mode 7 (R,I32): [Opcode:16][RegOp:8][Imm32:32]
... etc
```

## Reference Card

### Registers
```
General:    R0-R15 (R14=SP, R15=FP)
Segments:   CS, DS, ES, SS
Flags:      CF ZF SF OF DE PF
Special:    PC, FLAGS, SDTR, PID
```

### Addressing Modes
```
#n          - Immediate (8/16/32-bit)
[addr]      - Direct memory
R           - Register
[R]         - Register indirect
[R+I]       - Register + displacement
[R+R*S+I]   - Scaled index (S=1,2,4,8)
SEG:[...]   - Segment override
```

### Common Instructions
```
Movement:    MOV, LDX/STX, LDR/STR, PUSH, POP
Addressing:  LEA, LEAX, LEAR
Arithmetic:  ADD, SUB, MUL, DIV, INC, DEC
Logical:     AND, OR, XOR, NOT, CMP
Control:     JMP, CALL, RET, Jcc (conditional jumps)
Conditional: JZ, JNZ, JL, JG, JLE, JGE, JB, JA, JBE, JAE
System:      SYSCALL, INT, IRET
```

### Branch Addressing
Branches support multiple addressing modes:
- **8-bit relative** (mode 1): Default, compact, ±127 bytes
- **16-bit relative** (mode 2): Extended range, ±32KB
- **Register indirect** (mode 8): Jump tables, computed branches
- **Absolute** (mode A): Direct addressing, function pointers
- **Far** (seg:offs): Far mode addressing

Example usage:
```assembly
    JZ near_label       ; 8-bit relative (default)
    JZ.W far_label      ; 16-bit relative (assembler notation)
    MOV R1, jump_table[R2]
    JZ [R1]             ; Register indirect
    JZ handler_address  ; Absolute address
    JZ CS:far_label     : Far Absolute Addressing
```

### Assembly Example
```assembly
; Function with stack frame
my_func:
    ENTER 8, 0          ; Allocate 8 bytes locals
    MOV R1, [FP+8]      ; Get first parameter
    MOV R2, [FP+12]     ; Get second parameter
    ADD R1, R2          ; Compute sum
    MOV [FP-4], R1      ; Store in local variable
    MOV R0, R1          ; Return value
    LEAVE               ; Clean up frame
    RET                 ; Return to caller
```

### Calling Convention
- Arguments: R1-R5, then stack (right to left)
- Return value: R0
- Caller saves: R0-R10
- Callee saves: R11-R13, SP, FP
- Stack cleaned by caller

# Assembly Language Conventions

This document outlines the assembly language syntax and conventions for the
BURST VM, focusing on operand disambiguation and immediate value representation.

The following conventions are used for the BURST VM assembly language:

### Basic Format

```assembly
label:                  ; Label definition
    MNEMONIC dest, src  ; Instruction format
    ; Comment
```

### Operand Types

To provide clarity and flexibility, the BURST VM assembly language uses a combination
of operand type indicators and typecasting-style syntax to disambiguate operands.

|   Syntax    | Description                                   |
| :---------- | :-------------------------------------------- |
| `R0-R15`    | General registers                           |
| `#value`    | Decimal immediate                           |
| `#0xNN`     | Hexadecimal immediate                       |
| `[address]` | Register indirect (e.g., `[R1]`)              |
| `[R+offset]`  | Register + displacement (e.g., `[R1+100]`)    |
| `[0xADDR]`  | Direct memory access (e.g., `[0x1000]`)      |
| `SEG:[...]` | Segment override (e.g., `CS:[R1]`)            |
| `NEAR(label)` | Relative branch target (e.g., `JMP NEAR(loop)`) |
| `ABS(label)`  | Absolute branch target (e.g., `JMP ABS(handler)`) |

### Immediate Values

Negative immediate values are represented with the minus sign preceding the `#`:

```assembly
    MOV R1, #-10   ; Move -10 to R1
    ADD R2, #-5     ; Add -5 to R2
```

### Typecasting

Typecasting syntax is used to explicitly specify the size of operands:

|   Syntax      | Description                     |
| :------------ | :------------------------------ |
| `BYTE(operand)` | 8-bit operand                   |
| `WORD(operand)` | 16-bit operand                  |
| `DWORD(operand)`| 32-bit operand                  |
| `NEAR(label)`   | Near (relative) branch target  |
| `ABS(label)`    | Absolute branch target        |

**Example:**

```assembly
    MOV R1, DWORD(#1000)  ; Move 32-bit immediate 1000 to R1
    ADD R2, BYTE(#10)     ; Add 8-bit immediate 10 to R2
    JMP NEAR(loop_start)  ; Jump to relative address 'loop_start'
    JMP ABS(handler)      ; Jump to absolute address 'handler'
```

If you explicitly specify an operand size, and that exact encoding does not
exist, an error will be triggered during assembly to inform you of the situation.
