# BURST Instruction Set Architecture

## Overview

BURST uses a 16-bit instruction format with conditional execution built into every instruction. The ISA follows a load-store architecture with 16 general-purpose registers. All instructions are exactly 2 bytes, providing a consistent and extensible encoding.

## Instruction Format

```
Byte 1: [CONDITION:3][FLAGS:5]
Byte 2: [OPCODE:8]
```

### Condition Field (Bits 15-13)

Every instruction can be conditionally executed based on processor flags:

- **Bit 15**: ZTest (0 = ignore Z flag, 1 = test Z flag)
- **Bit 14**: Signed (0 = ignore signed comparison, 1 = use N and V flags)
- **Bit 13**: Invert (0 = normal condition, 1 = invert entire result)

| Code | Mnemonic | ZTest | Signed | Invert | Condition                 |
|------|----------|-------|--------|--------|---------------------------|
| 000  | always   | 0     | 0      | 0      | Always execute            |
| 001  | ne/nz    | 1     | 0      | 0      | Not equal (Z == 0)        |
| 010  | ge       | 0     | 1      | 0      | Greater/equal (N == V)    |
| 011  | gt       | 1     | 1      | 0      | Greater than (Z=0 AND N=V)|
| 100  | never    | 0     | 0      | 1      | Never execute             |
| 101  | eq/z     | 1     | 0      | 1      | Equal/zero (Z == 1)       |
| 110  | lt       | 0     | 1      | 1      | Less than (N ≠ V)         |
| 111  | le       | 1     | 1      | 1      | Less/equal (Z=1 OR N≠V)   |

### Flags Field (Bits 12-8)

Currently reserved for future extensions:
- Segment overrides
- Repeat prefixes  
- Lock prefixes
- Memory ordering hints
- Privilege level transitions

### Opcode Field (Bits 7-0)

256 possible opcodes organized by category.

## Registers

- **R0-R15**: 16 general-purpose 32-bit registers
- **PC**: Program Counter
- **SP**: Stack Pointer (initialized to top of memory)
- **FLAGS**: Status flags register

### Register Convention

| Register | Alias | Purpose                    |
|----------|-------|----------------------------|
| R0       | A0    | Function return value      |
| R1-R5    | A1-A5 | Function arguments         |
| R6-R10   | T1-T5 | Temporary (caller-saved)   |
| R11-R14  | S1-S4 | Saved (callee-saved)       |
| R15      | FP    | Frame pointer              |

### Flags Register

| Bit | Flag     | Description                    |
|-----|----------|--------------------------------|
| 0   | ZERO     | Result is zero                 |
| 1   | NEGATIVE | Result is negative             |
| 2   | CARRY    | Arithmetic carry/borrow        |
| 3   | OVERFLOW | Arithmetic overflow            |

## Instruction Set

### System Operations (0x00-0x0F)

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x00   | HALT     |           | Halt execution                   |
| 0x01   | SYSCALL  |           | System call (number in R0)       |
| 0x02   | TRAP     | imm8      | Software trap/debug hook         |
| 0x03   | INT      | imm8      | Software interrupt               |
| 0x04   | IRET     |           | Return from interrupt            |
| 0x05   | Reserved |           |                                  |
| ...    | ...      | ...       | ...                              |
| 0x0F   | Reserved |           |                                  |

### Data Movement (0x10-0x1F)

| Opcode | Mnemonic | Format       | Description                    |
|--------|----------|--------------|--------------------------------|
| 0x10   | MOV      | dest, src    | Move register to register      |
| 0x11   | MOVI     | reg, imm16   | Move 16-bit immediate (sign-extended) |
| 0x12   | LIMM     | reg, imm32   | Load 32-bit immediate (3-byte instruction) |
| 0x13   | MOVHI    | reg, imm16   | Move immediate to high 16 bits |
| 0x14   | SWAP     | reg1, reg2   | Swap register contents         |
| 0x15   | LEA      | reg, [addr]  | Load effective address         |
| 0x16   | Reserved |              |                                |
| ...    | ...      | ...          | ...                            |
| 0x1F   | Reserved |              |                                |

### Arithmetic Operations (0x20-0x2F)

| Opcode | Mnemonic | Format                | Description              |
|--------|----------|-----------------------|--------------------------|
| 0x20   | ADD      | dest, src1, src2      | Add                      |
| 0x21   | SUB      | dest, src1, src2      | Subtract                 |
| 0x22   | MUL      | dest, src1, src2      | Multiply                 |
| 0x23   | DIV      | dest, src1, src2      | Divide (signed)          |
| 0x24   | MOD      | dest, src1, src2      | Modulo (signed)          |
| 0x25   | DIVU     | dest, src1, src2      | Divide (unsigned)        |
| 0x26   | MODU     | dest, src1, src2      | Modulo (unsigned)        |
| 0x27   | INC      | reg                   | Increment                |
| 0x28   | DEC      | reg                   | Decrement                |
| 0x29   | NEG      | reg                   | Negate                   |
| 0x2A   | ABS      | reg                   | Absolute value           |
| 0x2B   | ADDI     | dest, src, imm8       | Add 8-bit immediate      |
| 0x2C   | SUBI     | dest, src, imm8       | Subtract 8-bit immediate |
| 0x2D   | Reserved |                       |                          |
| ...    | ...      | ...                   | ...                      |
| 0x2F   | Reserved |                       |                          |

### Logical Operations (0x30-0x3F)

| Opcode | Mnemonic | Format                | Description              |
|--------|----------|-----------------------|--------------------------|
| 0x30   | AND      | dest, src1, src2      | Bitwise AND              |
| 0x31   | OR       | dest, src1, src2      | Bitwise OR               |
| 0x32   | XOR      | dest, src1, src2      | Bitwise XOR              |
| 0x33   | NOT      | reg                   | Bitwise NOT              |
| 0x34   | ANDI     | dest, src, imm8       | AND with immediate       |
| 0x35   | ORI      | dest, src, imm8       | OR with immediate        |
| 0x36   | XORI     | dest, src, imm8       | XOR with immediate       |
| 0x37   | Reserved |                       |                          |
| ...    | ...      | ...                   | ...                      |
| 0x3F   | Reserved |                       |                          |

### Shift Operations (0x40-0x4F)

| Opcode | Mnemonic | Format                | Description                    |
|--------|----------|-----------------------|--------------------------------|
| 0x40   | SHL      | dest, src, count      | Shift left                     |
| 0x41   | SHR      | dest, src, count      | Logical shift right            |
| 0x42   | SAR      | dest, src, count      | Arithmetic shift right         |
| 0x43   | ROL      | dest, src, count      | Rotate left                    |
| 0x44   | ROR      | dest, src, count      | Rotate right                   |
| 0x45   | SHLI     | dest, src, imm5       | Shift left immediate           |
| 0x46   | SHRI     | dest, src, imm5       | Logical shift right immediate  |
| 0x47   | SARI     | dest, src, imm5       | Arithmetic shift right immediate|
| 0x48   | Reserved |                       |                                |
| ...    | ...      | ...                   | ...                            |
| 0x4F   | Reserved |                       |                                |

### Memory Operations (0x50-0x5F)

| Opcode | Mnemonic | Format              | Description                      |
|--------|----------|---------------------|----------------------------------|
| 0x50   | LOAD     | dest, [reg+off]     | Load 32-bit word                 |
| 0x51   | STORE    | src, [reg+off]      | Store 32-bit word                |
| 0x52   | LOADB    | dest, [reg+off]     | Load byte (zero-extended)        |
| 0x53   | STOREB   | src, [reg+off]      | Store byte                       |
| 0x54   | LOADH    | dest, [reg+off]     | Load halfword (zero-extended)    |
| 0x55   | STOREH   | src, [reg+off]      | Store halfword                   |
| 0x56   | LOADSB   | dest, [reg+off]     | Load byte (sign-extended)        |
| 0x57   | LOADSH   | dest, [reg+off]     | Load halfword (sign-extended)    |
| 0x58   | Reserved |                     |                                  |
| ...    | ...      | ...                 | ...                              |
| 0x5F   | Reserved |                     |                                  |

### Stack Operations (0x60-0x6F)

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x60   | PUSH     | reg       | Push register onto stack         |
| 0x61   | POP      | reg       | Pop from stack to register       |
| 0x62   | PUSHM    | reg_mask  | Push multiple registers          |
| 0x63   | POPM     | reg_mask  | Pop multiple registers           |
| 0x64   | ENTER    | imm16     | Create stack frame               |
| 0x65   | LEAVE    |           | Destroy stack frame              |
| 0x66   | ALLOCA   | reg       | Allocate stack space             |
| 0x67   | Reserved |           |                                  |
| ...    | ...      | ...       | ...                              |
| 0x6F   | Reserved |           |                                  |

### Control Flow (0x70-0x7F)

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x70   | JMP      | addr24    | Jump to address                  |
| 0x71   | JMPR     | reg       | Jump to register                 |
| 0x72   | CALL     | addr24    | Call subroutine                  |
| 0x73   | CALLI    | reg       | Call indirect                    |
| 0x74   | RET      |           | Return from subroutine           |
| 0x75   | RETI     |           | Return from interrupt            |
| 0x76   | BRA      | rel8      | Branch relative (short)          |
| 0x77   | BSR      | rel8      | Branch to subroutine (short)     |
| 0x78   | Reserved |           |                                  |
| ...    | ...      | ...       | ...                              |
| 0x7F   | Reserved |           |                                  |

### Comparison Operations (0x80-0x8F)

| Opcode | Mnemonic | Format       | Description                    |
|--------|----------|--------------|--------------------------------|
| 0x80   | CMP      | reg1, reg2   | Compare registers              |
| 0x81   | CMPI     | reg, imm8    | Compare with 8-bit immediate   |
| 0x82   | TST      | reg1, reg2   | Test bits (AND without store)  |
| 0x83   | TSTI     | reg, imm8    | Test bits with immediate       |
| 0x84   | CMPF     | reg1, reg2   | Compare floating-point         |
| 0x85   | Reserved |              |                                |
| ...    | ...      | ...          | ...                            |
| 0x8F   | Reserved |              |                                |

### Floating-Point Operations (0x90-0x9F)
Reserved for future floating-point support.

### SIMD Operations (0xA0-0xAF)
Reserved for future SIMD support.

### Extended Operations (0xB0-0xFF)
Reserved for future extensions.

## Operand Encoding

Instructions follow the 16-bit format, with additional bytes for operands:

### Three-Register Operations
```
[CONDITION:3][FLAGS:5][OPCODE:8]
[DEST:4][SRC1:4][SRC2:4][PAD:4]
```

### Two-Register Operations
```
[CONDITION:3][FLAGS:5][OPCODE:8]
[REG1:4][REG2:4][PADDING:8]
```

### Register-Immediate8
```
[CONDITION:3][FLAGS:5][OPCODE:8]
[REG:4][PAD:4][IMMEDIATE:8]
```

### Register-Immediate16
```
[CONDITION:3][FLAGS:5][OPCODE:8]
[REG:4][PAD:12]
[IMMEDIATE:16]
```

### Memory Operations
```
[CONDITION:3][FLAGS:5][OPCODE:8]
[REG:4][BASE:4][OFFSET:8]
```

### Jump/Call Operations
```
[CONDITION:3][FLAGS:5][OPCODE:8]
[ADDRESS:24]
```

## Assembly Syntax

### Conditional Execution
```asm
; Prefix syntax (preferred)
ifz mov r1, r2       ; Move if zero
ifnz jmp loop        ; Jump if not zero
iflt add r3, r1, r2  ; Add if less than

; Traditional syntax (supported aliases)
movz r1, r2          ; Move if zero
jnz loop             ; Jump if not zero
addlt r3, r1, r2     ; Add if less than
```

### Operand Formats
- Registers: `r0`-`r15`
- Immediates: `#123` (decimal), `#0xFF` (hex), `#0b1010` (binary)
- Memory: `[r5]`, `[r5+12]`, `[r5+r6]`
- Labels: `loop_start`, `function_name`

## System Call Convention

System calls use SYSCALL instruction with:
- R0: System call number
- R1-R5: Arguments (up to 5)
- R0: Return value
- R1: Error code (if applicable)

### Standard System Calls

| Number | Name         | Description         | Arguments                    |
|--------|--------------|---------------------|------------------------------|
| 1      | SYS_ALLOC    | Allocate memory     | R1: size                     |
| 2      | SYS_FREE     | Free memory         | R1: address                  |
| 3      | SYS_REALLOC  | Reallocate memory   | R1: address, R2: new_size    |
| 10     | SYS_READ     | Read from file      | R1: fd, R2: buffer, R3: size |
| 11     | SYS_WRITE    | Write to file       | R1: fd, R2: buffer, R3: size |
| 12     | SYS_OPEN     | Open file           | R1: path, R2: flags, R3: mode|
| 13     | SYS_CLOSE    | Close file          | R1: fd                       |
| 20     | SYS_EXIT     | Exit program        | R1: exit_code                |
| 30     | SYS_PRINT    | Print string        | R1: address, R2: length      |

## Future Extensions

The FLAGS field (5 bits) is reserved for:
1. **Segment overrides** (when memory protection is added)
2. **Repeat prefixes** (for string operations)
3. **Lock prefixes** (for multiprocessor systems)
4. **Privilege transitions** (for OS support)
5. **Memory ordering** (for advanced architectures)

This 16-bit instruction format provides:
- Clean, consistent decoding
- Universal conditional execution
- 256 base instructions
- Room for significant future expansion
- Natural alignment on 16-bit boundaries
