# BURST Instruction Set Architecture

## Overview

BURST uses a 32-bit instruction format with 8-bit opcodes and 24-bit operands. The ISA follows a load-store architecture with 16 general-purpose registers.

## Instruction Format

```
[OPCODE: 8 bits][OPERANDS: 24 bits]
```

## Registers

- **R0-R15**: 16 general-purpose 32-bit registers
- **PC**: Program Counter
- **SP**: Stack Pointer (initialized to top of memory)
- **FLAGS**: Status flags register

### Register Aliases (ISA Addendum)

| Alias | Reg | Description             |
|-------|-----|-------------------------|
| R0    | R0  | Return value            |
| A1–A5 | R1–R5 | Argument registers    |
| T1–T5 | R6–R10 | Temporary/caller-saved |
| S1–S4 | R11–R14 | Callee-saved       |
| FP    | R15 | Frame pointer           |

## Flags Register

| Bit | Flag     | Description                    |
|-----|----------|--------------------------------|
| 0   | ZERO     | Result is zero                 |
| 1   | NEGATIVE | Result is negative             |
| 2   | CARRY    | Arithmetic carry/borrow        |
| 3   | OVERFLOW | Arithmetic overflow            |

## Instruction Set

### Memory Operations

| Opcode | Mnemonic | Format              | Description                      |
|--------|----------|---------------------|----------------------------------|
| 0x01   | LOAD     | dest, addrReg, off  | Load word from [reg + offset]    |
| 0x02   | STORE    | src, addrReg, off   | Store word to [reg + offset]     |
| 0x03   | PUSH     | reg                 | Push register to stack           |
| 0x04   | POP      | reg                 | Pop from stack to register       |
| 0x05   | LOADB    | dest, addrReg, off  | Load byte from [reg + offset]    |
| 0x06   | STOREB   | src, addrReg, off   | Store byte to [reg + offset]     |

### Arithmetic and Logic

| Opcode | Mnemonic | Format                | Description              |
|--------|----------|-----------------------|--------------------------|
| 0x10   | ADD      | dest, src1, src2      | dest = src1 + src2       |
| 0x11   | SUB      | dest, src1, src2      | dest = src1 - src2       |
| 0x12   | MUL      | dest, src1, src2      | dest = src1 * src2       |
| 0x13   | DIV      | dest, src1, src2      | dest = src1 / src2       |
| 0x14   | MOD      | dest, src1, src2      | dest = src1 % src2       |
| 0x15   | AND      | dest, src1, src2      | dest = src1 & src2       |
| 0x16   | OR       | dest, src1, src2      | dest = src1 \| src2      |
| 0x17   | XOR      | dest, src1, src2      | dest = src1 ^ src2       |
| 0x18   | NOT      | dest, src             | dest = ~src              |
| 0x19   | SHL      | dest, src, count      | dest = src << count      |
| 0x1A   | SHR      | dest, src, count      | dest = src >> count      |
| 0x1B   | INC      | reg                   | reg = reg + 1            |
| 0x1C   | DEC      | reg                   | reg = reg - 1            |
| 0x1D   | NEG      | reg                   | reg = -reg               |

### Control Flow

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x20   | JMP      | addr      | Jump to address                  |
| 0x21   | JZ       | addr      | Jump if zero flag set            |
| 0x22   | JNZ      | addr      | Jump if zero flag clear          |
| 0x23   | JEQ      | addr      | Jump if equal (same as JZ)       |
| 0x24   | JNE      | addr      | Jump if not equal (same as JNZ)  |
| 0x25   | JLT      | addr      | Jump if less than                |
| 0x26   | JGT      | addr      | Jump if greater than             |
| 0x27   | CALL     | addr      | Call subroutine                  |
| 0x28   | RET      |           | Return from subroutine           |
| 0x29   | JLE      | addr      | Jump if less or equal            |
| 0x2A   | JGE      | addr      | Jump if greater or equal         |

### Register Operations

| Opcode | Mnemonic | Format       | Description                    |
|--------|----------|--------------|--------------------------------|
| 0x30   | MOV      | dest, src    | Copy between registers         |
| 0x31   | MOVI     | reg, imm     | Load immediate value (sign extended) |
| 0x32   | CMP      | reg1, reg2   | Compare registers (set flags)  |

### System Operations

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x40   | SYSCALL  |           | System call (number in R0)       |
| 0x41   | HALT     |           | Halt execution                   |
| 0x42   | NOP      |           | No operation                     |

### ISA Addendum Extensions

#### Extended Instructions

| Opcode | Mnemonic | Format           | Description                    |
|--------|----------|------------------|--------------------------------|
| 0x43   | LIMM     | reg, imm32       | Load full 32-bit constant      |
| 0x46   | ENTER    | imm16            | Push FP, set FP = SP, alloc locals|
| 0x47   | LEAVE    |                  | SP = FP, pop old FP            |
| 0x48   | CALLI    | reg              | Call function at reg address   |
| 0x49   | JMPR     | reg              | Jump to address in register    |
| 0x4A   | ROL      | dest, src, shiftReg | Rotate left                 |
| 0x4B   | ROR      | dest, src, shiftReg | Rotate right                |
| 0x4C   | SAR      | dest, src, shiftReg | Arithmetic (signed) right shift|
| 0x4D   | ADDI     | dest, src, imm8  | dest = src + immediate         |
| 0x4E   | CMPI     | reg, imm8        | Compare reg with immediate     |
| 0x4F   | TRAP     | imm8             | Trigger trap/debug hook        |

#### Conditional Move Instructions

| Opcode | Mnemonic | Format     | Description                   | Equivalent Jump |
|--------|----------|------------|-------------------------------|-----------------|
| 0x60   | MOVC     | dest, src  | Unconditional move            | JMP             |
| 0x61   | MOVZ     | dest, src  | Move if Z == 1 (Zero)         | JZ              |
| 0x62   | MOVNZ    | dest, src  | Move if Z == 0 (Non-Zero)     | JNZ             |
| 0x63   | MOVLT    | dest, src  | N ≠ V (signed less than)      | JLT             |
| 0x64   | MOVGE    | dest, src  | N == V (signed greater or eq) | JGE             |
| 0x65   | MOVLE    | dest, src  | Z == 1 or N ≠ V               | JLE             |
| 0x66   | MOVGT    | dest, src  | Z == 0 and N == V             | JGT             |
| 0x67   | MOVNE    | dest, src  | Z == 0 (alias of MOVNZ)       | JNE             |

## System Call Convention

System calls are invoked using the SYSCALL instruction with:
- R0: System call number
- R1-R5: Arguments
- R0: Return value (after syscall)

### Standard System Calls

| Number | Name         | Description                    | Args        |
|--------|--------------|--------------------------------|-------------|
| 1      | SYS_ALLOC    | Allocate memory                | R1: size    |
| 2      | SYS_FREE     | Free memory                    | R1: address |
| 3      | SYS_REALLOC  | Reallocate memory              | R1: addr, R2: size |
| 10     | SYS_READ     | Read from file                 | R1: fd, R2: buffer, R3: size |
| 11     | SYS_WRITE    | Write to file                  | R1: fd, R2: buffer, R3: size |
| 20     | SYS_EXIT     | Exit program                   | R1: code    |
| 30     | SYS_PRINT    | Print string                   | R1: address, R2: length |
| 32     | SYS_PUTCHAR  | Output character               | R1: char    |

## Operand Encoding

### Three-Register Operations (ADD, SUB, etc.)
```
[OPCODE:8][DEST:4][SRC1:4][SRC2:4][PAD:4]
```

### Two-Register Operations (MOV, CMP)
```
[OPCODE:8][REG1:4][REG2:4][PADDING:12]
```

### Single Register Operations (INC, DEC, etc.)
```
[OPCODE:8][REG:4][PADDING:20]
```

### Register-Immediate (MOVI)
```
[OPCODE:8][REG:4][PAD:4][IMMEDIATE:16]
```
- Immediate values are sign-extended to 32 bits

### Register-Immediate8 (ADDI, CMPI)
```
[OPCODE:8][REG:4][SRC:4][IMM8:8][PAD:4]
```
- Immediate values are sign-extended to 32 bits

### Load 32-bit Immediate (LIMM)
```
Word 1: [0x43][REG:8][RESERVED:16]
Word 2: [IMM32: 32-bit immediate value]
```
- Two-word instruction for loading 32-bit constants

### Memory Operations (LOAD/STORE)
```
[OPCODE:8][REG:4][ADDR_REG:4][OFFSET:12]
```
- Effective address = ADDR_REG + sign_extend(OFFSET)

### Jump/Branch Operations
```
[OPCODE:8][ADDRESS:24]
```

### Stack Frame Operations (ENTER)
```
[OPCODE:8][RESERVED:8][LOCALS_SIZE:16]
```

## Instruction Encoding Examples

```
MOVI R1, 0x1234:     [0x31][0x1][0x0][0x1234]
                      │     │    │     └── Immediate value
                      │     │    └──────── Padding
                      │     └───────────── Register 1
                      └─────────────────── MOVI opcode

ADD R2, R0, R1:      [0x10][0x2][0x0][0x1][0x0]
                      │     │    │    │    └── Padding
                      │     │    │    └─────── Source 2 (R1)
                      │     │    └──────────── Source 1 (R0)
                      │     └────────────────── Destination (R2)
                      └──────────────────────── ADD opcode

LOAD R3, R5, 0x10:   [0x01][0x3][0x5][0x010]
                      │     │    │    └── Offset (16)
                      │     │    └─────── Address Register (R5)
                      │     └──────────── Destination (R3)
                      └────────────────── LOAD opcode

LIMM R4, 0x12345678: [0x43][0x4][0x00][0x0000]
                      │     │    │     └── Reserved
                      │     │    └──────── Reserved
                      │     └───────────── Register 4
                      └─────────────────── LIMM opcode
                     [0x12345678]
                      └─────────────────── 32-bit immediate value

ADDI R1, R2, -5:     [0x4D][0x1][0x2][0xFB][0x0]
                      │     │    │    │    └── Padding
                      │     │    │    └─────── Immediate (-5)
                      │     │    └──────────── Source (R2)
                      │     └────────────────── Destination (R1)
                      └──────────────────────── ADDI opcode
```

## Calling Convention

### Function Calls
- Arguments passed in R1-R5
- Additional arguments on stack
- Return value in R0
- Caller saves R6-R10
- Callee saves R11-R15

### Stack Frame (Enhanced with ENTER/LEAVE)
```
+------------------+
| Return address   | <- SP after CALL
+------------------+
| Saved FP (R15)   | <- SP after ENTER
+------------------+
| Local variables  | <- FP (R15) points here
+------------------+
| Saved registers  |
+------------------+
| Arguments 6+     | <- SP before CALL
+------------------+
```

#### ENTER Instruction
1. Pushes current FP (R15) onto stack
2. Sets FP = SP (new frame)
3. Allocates space for locals by decreasing SP

#### LEAVE Instruction
1. Restores SP = FP (deallocates locals)
2. Pops old FP from stack

## Notes

### Extensions from Original ISA
- LOADB/STOREB: Byte-level memory operations
- INC/DEC/NEG: Common arithmetic operations
- JLE/JGE: Additional conditional jumps
- Flexible memory addressing with register + offset

### ISA Addendum Extensions
- LIMM: Load 32-bit immediate values
- ENTER/LEAVE: Stack frame management
- CALLI/JMPR: Indirect control flow
- ROL/ROR/SAR: Extended shift operations
- ADDI/CMPI: Immediate arithmetic/compare
- TRAP: Software interrupts/debugging
- MOVC.*: Conditional move family

### Design Decisions
- Register + offset addressing makes array/structure access easier
- Immediate values are sign-extended for signed arithmetic
- System call convention uses registers for efficiency
- Extra instructions added for common operations to reduce code size
- Enhanced stack frame support for higher-level languages
- Conditional moves enable branch-free programming
