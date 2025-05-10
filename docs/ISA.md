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

## Flags Register

| Bit | Flag     | Description                    |
|-----|----------|--------------------------------|
| 0   | ZERO     | Result is zero                 |
| 1   | NEGATIVE | Result is negative             |
| 2   | CARRY    | Arithmetic carry/borrow        |
| 3   | OVERFLOW | Arithmetic overflow            |

## Instruction Set

### Memory Operations

| Opcode | Mnemonic | Format           | Description                    |
|--------|----------|------------------|--------------------------------|
| 0x01   | LOAD     | reg, addr        | Load word from memory          |
| 0x02   | STORE    | addr, reg        | Store word to memory           |
| 0x03   | PUSH     | reg              | Push register to stack         |
| 0x04   | POP      | reg              | Pop from stack to register     |

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

### Control Flow

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x20   | JMP      | addr      | Jump to address                  |
| 0x21   | JZ       | addr      | Jump if zero flag set            |
| 0x22   | JNZ      | addr      | Jump if zero flag clear          |
| 0x23   | JEQ      | addr      | Jump if equal (after CMP)        |
| 0x24   | JNE      | addr      | Jump if not equal                |
| 0x25   | JLT      | addr      | Jump if less than                |
| 0x26   | JGT      | addr      | Jump if greater than             |
| 0x27   | CALL     | addr      | Call subroutine                  |
| 0x28   | RET      |           | Return from subroutine           |

### Register Operations

| Opcode | Mnemonic | Format       | Description                    |
|--------|----------|--------------|--------------------------------|
| 0x30   | MOV      | dest, src    | Copy between registers         |
| 0x31   | MOVI     | reg, imm     | Load immediate value           |
| 0x32   | CMP      | reg1, reg2   | Compare registers (set flags)  |

### System Operations

| Opcode | Mnemonic | Format    | Description                      |
|--------|----------|-----------|----------------------------------|
| 0x40   | SYSCALL  | num       | System call                      |
| 0x41   | HALT     |           | Halt execution                   |
| 0x42   | NOP      |           | No operation                     |

## Operand Encoding

### Register Operands
- 4 bits per register (0-15)
- Packed from high bits of operand field

### Immediate Values
- 16-bit signed/unsigned values
- Sign-extended to 32 bits when loaded

### Memory Addresses
- 24-bit addresses for jumps
- 32-bit addresses for load/store (from registers)

## Instruction Encoding Examples

```
MOVI R1, 0x1234:    [0x31][0x01][0x12][0x34]
                     │     │     └─────┴───── Immediate value
                     │     └───────────────── Register 1
                     └─────────────────────── MOVI opcode

ADD R2, R0, R1:     [0x10][0x02][0x00][0x01]
                     │     │     │     └───── Source 2 (R1)
                     │     │     └─────────── Source 1 (R0)
                     │     └───────────────── Destination (R2)
                     └─────────────────────── ADD opcode

JMP 0x1000:         [0x20][0x00][0x10][0x00]
                     │     └─────┴─────┴───── 24-bit address
                     └─────────────────────── JMP opcode
```

## Calling Convention

### Function Calls
- Arguments passed in R1-R5
- Additional arguments on stack
- Return value in R0
- Caller saves R6-R10
- Callee saves R11-R15

### Stack Frame
```
+------------------+
| Return address   | <- SP after CALL
+------------------+
| Saved registers  |
+------------------+
| Local variables  |
+------------------+
| Arguments 6+     | <- SP before CALL
+------------------+
```

## Future Extensions

### Reserved Opcodes
- 0x50-0x7F: Reserved for future arithmetic extensions
- 0x80-0x9F: Reserved for SIMD operations
- 0xA0-0xBF: Reserved for floating-point
- 0xC0-0xDF: Reserved for system extensions
- 0xE0-0xFF: Reserved for custom instructions

### Planned Instructions
- LOADB/STOREB: Byte access
- LOADH/STOREH: Halfword access
- Atomic operations
- Cache control
- Debug support
