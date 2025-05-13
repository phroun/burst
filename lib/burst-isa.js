// Condition codes for the new ISA
const CONDITIONS = {
    // Code Name    ZTest Signed Invert
    ALWAYS: 0b000, // 0     0      0
    NE:     0b001, // 1     0      0  (not equal/not zero)
    GE:     0b010, // 0     1      0  (greater/equal)
    GT:     0b011, // 1     1      0  (greater than)
    NEVER:  0b100, // 0     0      1  (never)
    EQ:     0b101, // 1     0      1  (equal/zero)
    LT:     0b110, // 0     1      1  (less than)
    LE:     0b111, // 1     1      1  (less/equal)
};

// Instruction opcodes (updated for new ISA)
const OPCODES = {
    // System operations (0x00-0x0F)
    HALT:    0x00,    // Halt execution
    SYSCALL: 0x01,    // System call
    TRAP:    0x02,    // Software trap
    INT:     0x03,    // Software interrupt
    IRET:    0x04,    // Return from interrupt
    
    // Data movement (0x10-0x1F)
    MOV:     0x10,    // Move register to register
    MOVI:    0x11,    // Move 16-bit immediate (sign-extended)
    LIMM:    0x12,    // Load 32-bit immediate (3-byte instruction)
    MOVHI:   0x13,    // Move immediate to high 16 bits
    SWAP:    0x14,    // Swap register contents
    LEA:     0x15,    // Load effective address
    
    // Arithmetic operations (0x20-0x2F)
    ADD:     0x20,    // Add
    SUB:     0x21,    // Subtract
    MUL:     0x22,    // Multiply
    DIV:     0x23,    // Divide (signed)
    MOD:     0x24,    // Modulo (signed)
    DIVU:    0x25,    // Divide (unsigned)
    MODU:    0x26,    // Modulo (unsigned)
    INC:     0x27,    // Increment
    DEC:     0x28,    // Decrement
    NEG:     0x29,    // Negate
    ABS:     0x2A,    // Absolute value
    ADDI:    0x2B,    // Add 8-bit immediate
    SUBI:    0x2C,    // Subtract 8-bit immediate
    
    // Logical operations (0x30-0x3F)
    AND:     0x30,    // Bitwise AND
    OR:      0x31,    // Bitwise OR
    XOR:     0x32,    // Bitwise XOR
    NOT:     0x33,    // Bitwise NOT
    ANDI:    0x34,    // AND with immediate
    ORI:     0x35,    // OR with immediate
    XORI:    0x36,    // XOR with immediate
    
    // Shift operations (0x40-0x4F)
    SHL:     0x40,    // Shift left
    SHR:     0x41,    // Logical shift right
    SAR:     0x42,    // Arithmetic shift right
    ROL:     0x43,    // Rotate left
    ROR:     0x44,    // Rotate right
    SHLI:    0x45,    // Shift left immediate
    SHRI:    0x46,    // Logical shift right immediate
    SARI:    0x47,    // Arithmetic shift right immediate
    
    // Memory operations (0x50-0x5F)
    LOAD:    0x50,    // Load 32-bit word
    STORE:   0x51,    // Store 32-bit word
    LOADB:   0x52,    // Load byte (zero-extended)
    STOREB:  0x53,    // Store byte
    LOADH:   0x54,    // Load halfword (zero-extended)
    STOREH:  0x55,    // Store halfword
    LOADSB:  0x56,    // Load byte (sign-extended)
    LOADSH:  0x57,    // Load halfword (sign-extended)
    
    // Stack operations (0x60-0x6F)
    PUSH:    0x60,    // Push register onto stack
    POP:     0x61,    // Pop from stack to register
    PUSHM:   0x62,    // Push multiple registers
    POPM:    0x63,    // Pop multiple registers
    ENTER:   0x64,    // Create stack frame
    LEAVE:   0x65,    // Destroy stack frame
    ALLOCA:  0x66,    // Allocate stack space
    
    // Control flow (0x70-0x7F)
    JMP:     0x70,    // Jump to address
    JMPR:    0x71,    // Jump to register
    CALL:    0x72,    // Call subroutine
    CALLI:   0x73,    // Call indirect
    RET:     0x74,    // Return from subroutine
    RETI:    0x75,    // Return from interrupt
    BRA:     0x76,    // Branch relative (short)
    BSR:     0x77,    // Branch to subroutine (short)
    
    // Comparison operations (0x80-0x8F)
    CMP:     0x80,    // Compare registers
    CMPI:    0x81,    // Compare with 8-bit immediate
    TST:     0x82,    // Test bits (AND without store)
    TSTI:    0x83,    // Test bits with immediate
    CMPF:    0x84,    // Compare floating-point
};

// System call numbers (unchanged)
const SYSCALLS = {
    SYS_ALLOC:    1,
    SYS_FREE:     2,
    SYS_REALLOC:  3,
    SYS_MMAP:     4,
    SYS_PROTECT:  5,
    SYS_READ:     10,
    SYS_WRITE:    11,
    SYS_OPEN:     12,
    SYS_CLOSE:    13,
    SYS_SEEK:     14,
    SYS_EXIT:     20,
    SYS_FORK:     21,
    SYS_EXEC:     22,
    SYS_WAIT:     23,
    SYS_GETPID:   24,
    SYS_PRINT:    30,
    SYS_INPUT:    31,
    SYS_PUTCHAR:  32,
    SYS_GETCHAR:  33,
    SYS_TIME:     40,
    SYS_SLEEP:    41,
    SYS_HOST_EXEC: 50,
    SYS_HOST_ENV:  51,
    SYS_HOST_CWD:  52,
};

// Error codes
const ERRORS = {
    E_OK:       0,
    E_NOMEM:    1,
    E_BADFD:    2,
    E_NOTFOUND: 3,
    E_PERM:     4,
    E_IO:       5,
    E_NOSYS:    6,
    E_INVALID:  7,
};

// Flags
const FLAGS = {
    ZERO:     0x01,
    NEGATIVE: 0x02,
    CARRY:    0x04,
    OVERFLOW: 0x08,
};

module.exports = {
  FLAGS, CONDITIONS, OPCODES, SYSCALLS, ERRORS
}
