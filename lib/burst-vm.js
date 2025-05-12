// BURST VM - Basic Universal Reference System Toolkit
// This is a JavaScript implementation that can run in Node.js or browser
// Updated to use refactored instruction handling and memory management

// Import refactored modules
const executeInstruction = require('./burst-instructions.js');
const MemoryManager = require('./burst-memory-manager.js');

// Instruction opcodes (aligned with documented ISA + Addendum)
const OPCODES = {
    // Memory operations
    LOAD:  0x01,    // Load word from memory
    STORE: 0x02,    // Store word to memory
    PUSH:  0x03,    // Push to stack
    POP:   0x04,    // Pop from stack
    LOADB: 0x05,    // Load byte from memory (extension)
    STOREB:0x06,    // Store byte to memory (extension)
    
    // Arithmetic/Logic
    ADD:   0x10,    // Add
    SUB:   0x11,    // Subtract
    MUL:   0x12,    // Multiply
    DIV:   0x13,    // Divide
    MOD:   0x14,    // Modulo
    AND:   0x15,    // Bitwise AND
    OR:    0x16,    // Bitwise OR
    XOR:   0x17,    // Bitwise XOR
    NOT:   0x18,    // Bitwise NOT
    SHL:   0x19,    // Shift left
    SHR:   0x1A,    // Shift right
    INC:   0x1B,    // Increment (extension)
    DEC:   0x1C,    // Decrement (extension)
    NEG:   0x1D,    // Negate (extension)
    
    // Control flow
    JMP:   0x20,    // Jump
    JZ:    0x21,    // Jump if zero
    JNZ:   0x22,    // Jump if not zero
    JEQ:   0x23,    // Jump if equal
    JNE:   0x24,    // Jump if not equal
    JLT:   0x25,    // Jump if less than
    JGT:   0x26,    // Jump if greater than
    CALL:  0x27,    // Function call
    RET:   0x28,    // Return from function
    JLE:   0x29,    // Jump if less or equal (extension)
    JGE:   0x2A,    // Jump if greater or equal (extension)
    
    // Register operations
    MOV:   0x30,    // Move register to register
    MOVI:  0x31,    // Move immediate to register
    CMP:   0x32,    // Compare two registers
    
    // System operations
    SYSCALL: 0x40,  // System call
    HALT:    0x41,  // Halt execution
    NOP:     0x42,  // No operation
    
    // ISA Addendum instructions
    LIMM:   0x43,   // Load 32-bit immediate (two-word instruction)
    ENTER:  0x46,   // Begin function frame
    LEAVE:  0x47,   // End function frame
    CALLI:  0x48,   // Indirect call (call to address in register)
    JMPR:   0x49,   // Indirect jump (jump to address in register)
    ROL:    0x4A,   // Rotate left
    ROR:    0x4B,   // Rotate right
    SAR:    0x4C,   // Shift arithmetic right (sign-preserving)
    ADDI:   0x4D,   // Add immediate
    CMPI:   0x4E,   // Compare with immediate
    TRAP:   0x4F,   // Software trap
    
    // Conditional move family (ISA Addendum)
    MOVC:   0x60,   // Unconditional move (same as MOV)
    MOVZ:   0x61,   // Move if zero
    MOVNZ:  0x62,   // Move if not zero
    MOVLT:  0x63,   // Move if less than
    MOVGE:  0x64,   // Move if greater or equal
    MOVLE:  0x65,   // Move if less or equal
    MOVGT:  0x66,   // Move if greater than
    MOVNE:  0x67,   // Move if not equal (alias of MOVNZ)
};

// System call numbers
const SYSCALLS = {
    // Memory management
    SYS_ALLOC:    1,
    SYS_FREE:     2,
    SYS_REALLOC:  3,
    SYS_MMAP:     4,
    SYS_PROTECT:  5,
    
    // I/O operations
    SYS_READ:     10,
    SYS_WRITE:    11,
    SYS_OPEN:     12,
    SYS_CLOSE:    13,
    SYS_SEEK:     14,
    
    // Process management
    SYS_EXIT:     20,
    SYS_FORK:     21,
    SYS_EXEC:     22,
    SYS_WAIT:     23,
    SYS_GETPID:   24,
    
    // Console I/O
    SYS_PRINT:    30,
    SYS_INPUT:    31,
    SYS_PUTCHAR:  32,
    SYS_GETCHAR:  33,
    
    // Time operations
    SYS_TIME:     40,
    SYS_SLEEP:    41,
    
    // Host bridge operations
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

class BurstVM {
    constructor(memorySize = 1024 * 1024) { // 1MB default
        this.memory = new Uint8Array(memorySize);
        this.registers = new Uint32Array(16); // R0-R15
        this.pc = 0; // Program counter
        this.sp = memorySize - 8; // Stack pointer (grows down, leave room for first push)
        this.flags = 0;
        this.halted = false;
        this.trapHandlers = new Map(); // For TRAP instruction
        
        // Use refactored memory manager
        this.memoryManager = new MemoryManager(memorySize);
        
        // Standard file descriptors
        this.fileDescriptors = new Map();
        this.nextFd = 3; // 0,1,2 are reserved
        
        // Initialize standard I/O
        this.initStandardIO();
    }

    executeSyscall(syscallNum) {
        switch (syscallNum) {
            case SYSCALLS.SYS_ALLOC: {
                const size = this.registers[1];
                this.registers[0] = this.memoryManager.alloc(size);
                break;
            }
            
            case SYSCALLS.SYS_FREE: {
                const addr = this.registers[1];
                this.registers[0] = this.memoryManager.free(addr) ? ERRORS.E_OK : ERRORS.E_INVALID;
                break;
            }
            
            case SYSCALLS.SYS_REALLOC: {
                const addr = this.registers[1];
                const newSize = this.registers[2];
                this.registers[0] = this.memoryManager.realloc(addr, newSize);
                break;
            }
            
            case SYSCALLS.SYS_PRINT: {
                const ptr = this.registers[1];
                const length = this.registers[2];
                let str = '';
                for (let i = 0; i < length; i++) {
                    str += String.fromCharCode(this.readByte(ptr + i));
                }
                this.output += str;
                console.log(str);
                this.registers[0] = length; // Return number of bytes written
                break;
            }
            
            case SYSCALLS.SYS_PUTCHAR: {
                const char = this.registers[1] & 0xFF;
                const ch = String.fromCharCode(char);
                this.output += ch;
                console.log(ch);
                this.registers[0] = 1;
                break;
            }
            
            case SYSCALLS.SYS_EXIT: {
                const exitCode = this.registers[1];
                this.halted = true;
                this.registers[0] = exitCode;
                break;
            }
            
            default:
                this.registers[0] = ERRORS.E_NOSYS;
                break;
        }
    }
    
    initStandardIO() {
        // Standard input/output/error
        this.fileDescriptors.set(0, { type: 'stdin', buffer: '' });
        this.fileDescriptors.set(1, { type: 'stdout', buffer: '' });
        this.fileDescriptors.set(2, { type: 'stderr', buffer: '' });
        
        this.output = '';
        this.inputBuffer = '';
        this.inputIndex = 0;
    }
    
    // Memory access methods
    readByte(address) {
        if (address >= this.memory.length) {
            throw new Error(`Memory access violation: ${address}`);
        }
        return this.memory[address];
    }
    
    writeByte(address, value) {
        if (address >= this.memory.length) {
            throw new Error(`Memory access violation: ${address}`);
        }
        this.memory[address] = value & 0xFF;
    }
    
    readWord(address) {
        if (address + 3 >= this.memory.length) {
            throw new Error(`Memory access violation: ${address}`);
        }
        return (this.memory[address] |
                (this.memory[address + 1] << 8) |
                (this.memory[address + 2] << 16) |
                (this.memory[address + 3] << 24)) >>> 0;
    }
    
    writeWord(address, value) {
        if (address + 3 >= this.memory.length) {
            throw new Error(`Memory access violation: ${address}`);
        }
        this.memory[address] = value & 0xFF;
        this.memory[address + 1] = (value >> 8) & 0xFF;
        this.memory[address + 2] = (value >> 16) & 0xFF;
        this.memory[address + 3] = (value >> 24) & 0xFF;
    }
    
    // Stack operations
    push(value) {
        this.sp -= 4;
        if (this.sp < 0) {
            throw new Error('Stack overflow');
        }
        this.writeWord(this.sp, value);
    }
    
    pop() {
        if (this.sp >= this.memory.length) {
            throw new Error('Stack underflow');
        }
        const value = this.readWord(this.sp);
        this.sp += 4;
        return value;
    }
    
    // Flag operations
    setFlag(flag, value) {
        if (value) {
            this.flags |= flag;
        } else {
            this.flags &= ~flag;
        }
    }
    
    getFlag(flag) {
        return (this.flags & flag) !== 0;
    }
    
    updateFlags(result, carry = false, overflow = false) {
        this.setFlag(FLAGS.ZERO, result === 0);
        this.setFlag(FLAGS.NEGATIVE, (result & 0x80000000) !== 0);
        this.setFlag(FLAGS.CARRY, carry);
        this.setFlag(FLAGS.OVERFLOW, overflow);
    }
    
    // Instruction decoding
    decode(instruction) {
        const opcode = instruction >> 24;
        const operands = instruction & 0xFFFFFF;
        return { opcode, operands };
    }
    
    // Helper function for sign extension
    signExtend16(value) {
        if (value & 0x8000) {
            return value | 0xFFFF0000;
        }
        return value;
    }
    
    signExtend8(value) {
        if (value & 0x80) {
            return value | 0xFFFFFF00;
        }
        return value;
    }
    
    // Execute one instruction using the refactored instruction module
    step() {
        if (this.halted) return;
        
        const instruction = this.readWord(this.pc);
        const { opcode, operands } = this.decode(instruction);
        
        // Create the context for instruction execution, including constants
        const context = {
            vm: this,
            instruction,
            opcode,
            operands,
            pc: this.pc,
            // Add the constants that executeInstruction is expecting
            constants: {
                OPCODES,
                SYSCALLS,
                FLAGS,
                ERRORS
            }
        };
        
        // Update PC for standard case (will be modified by executeInstruction if needed)
        this.pc += 4;
        
        // Execute the instruction using the refactored module
        const continueExecution = executeInstruction(context);
        
        // Update if we should halt
        this.halted = !continueExecution;
    }
    
    // Run until halted
    run() {
        while (!this.halted) {
            this.step();
        }
    }
    
    // Load program into memory
    loadProgram(program, address = 0) {
        for (let i = 0; i < program.length; i++) {
            this.memory[address + i] = program[i];
        }
        this.pc = address;
    }
    
    // Debug functions
    dumpRegisters() {
        console.log("=== Register Dump ===");
        for (let i = 0; i < 16; i++) {
            console.log(`R${i}: 0x${this.registers[i].toString(16).padStart(8, '0')} (${this.registers[i]})`);
        }
        console.log(`PC: 0x${this.pc.toString(16).padStart(8, '0')}`);
        console.log(`SP: 0x${this.sp.toString(16).padStart(8, '0')}`);
        console.log(`Flags: ${this.flags.toString(2).padStart(8, '0')}`);
        console.log(`  Zero: ${this.getFlag(FLAGS.ZERO)}`);
        console.log(`  Negative: ${this.getFlag(FLAGS.NEGATIVE)}`);
        console.log(`  Carry: ${this.getFlag(FLAGS.CARRY)}`);
        console.log(`  Overflow: ${this.getFlag(FLAGS.OVERFLOW)}`);
    }
    
    dumpMemory(address, length) {
        console.log(`=== Memory Dump @ 0x${address.toString(16)} ===`);
        for (let i = 0; i < length; i += 16) {
            let line = `${(address + i).toString(16).padStart(8, '0')}: `;
            for (let j = 0; j < 16 && i + j < length; j++) {
                line += this.readByte(address + i + j).toString(16).padStart(2, '0') + ' ';
            }
            console.log(line);
        }
    }
}

// Enhanced Assembler helper class
class BurstAssembler {
    constructor() {
        this.output = [];
        this.labels = new Map();
        this.pendingLabels = [];
        this.address = 0;
    }
    
    // Emit a word (32-bit value)
    emit(word) {
        this.output.push(word & 0xFF);
        this.output.push((word >> 8) & 0xFF);
        this.output.push((word >> 16) & 0xFF);
        this.output.push((word >> 24) & 0xFF);
        this.address += 4;
    }
    
    // Build instruction from opcode and operands
    buildInstruction(opcode, operands = 0) {
        return (opcode << 24) | (operands & 0xFFFFFF);
    }
    
    // Add label
    label(name) {
        this.labels.set(name, this.address);
    }
    
    // Assembly methods for each instruction
    movi(reg, value) {
        const operands = (reg << 16) | (value & 0xFFFF);
        this.emit(this.buildInstruction(OPCODES.MOVI, operands));
    }
    
    // Memory operations
    load(dest, addrReg, offset = 0) {
        const operands = (dest << 16) | (addrReg << 12) | (offset & 0xFFF);
        this.emit(this.buildInstruction(OPCODES.LOAD, operands));
    }
    
    store(src, addrReg, offset = 0) {
        const operands = (src << 16) | (addrReg << 12) | (offset & 0xFFF);
        this.emit(this.buildInstruction(OPCODES.STORE, operands));
    }
    
    loadb(dest, addrReg, offset = 0) {
        const operands = (dest << 16) | (addrReg << 12) | (offset & 0xFFF);
        this.emit(this.buildInstruction(OPCODES.LOADB, operands));
    }
    
    storeb(src, addrReg, offset = 0) {
        const operands = (src << 16) | (addrReg << 12) | (offset & 0xFFF);
        this.emit(this.buildInstruction(OPCODES.STOREB, operands));
    }
    
    push(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.PUSH, operands));
    }
    
    pop(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.POP, operands));
    }
    
    // Register operations
    mov(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOV, operands));
    }
    
    // Comparison
    cmp(reg1, reg2) {
        const operands = (reg1 << 16) | (reg2 << 12);
        this.emit(this.buildInstruction(OPCODES.CMP, operands));
    }
    
    // Arithmetic operations
    add(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.ADD, operands));
    }
    
    sub(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.SUB, operands));
    }
    
    mul(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.MUL, operands));
    }
    
    div(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.DIV, operands));
    }
    
    mod(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.MOD, operands));
    }
    
    inc(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.INC, operands));
    }
    
    dec(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.DEC, operands));
    }
    
    neg(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.NEG, operands));
    }
    
    // Logical operations
    and(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.AND, operands));
    }
    
    or(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.OR, operands));
    }
    
    xor(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.XOR, operands));
    }
    
    not(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.NOT, operands));
    }
    
    shl(dest, src, shiftReg) {
        const operands = (dest << 16) | (src << 12) | (shiftReg << 8);
        this.emit(this.buildInstruction(OPCODES.SHL, operands));
    }
    
    shr(dest, src, shiftReg) {
        const operands = (dest << 16) | (src << 12) | (shiftReg << 8);
        this.emit(this.buildInstruction(OPCODES.SHR, operands));
    }
    
    // Control flow
    jmp(address) {
        this.emit(this.buildInstruction(OPCODES.JMP, address & 0xFFFFFF));
    }
    
    jz(address) {
        this.emit(this.buildInstruction(OPCODES.JZ, address & 0xFFFFFF));
    }
    
    jnz(address) {
        this.emit(this.buildInstruction(OPCODES.JNZ, address & 0xFFFFFF));
    }
    
    jeq(address) {
        this.emit(this.buildInstruction(OPCODES.JEQ, address & 0xFFFFFF));
    }
    
    jne(address) {
        this.emit(this.buildInstruction(OPCODES.JNE, address & 0xFFFFFF));
    }
    
    jlt(address) {
        this.emit(this.buildInstruction(OPCODES.JLT, address & 0xFFFFFF));
    }
    
    jgt(address) {
        this.emit(this.buildInstruction(OPCODES.JGT, address & 0xFFFFFF));
    }
    
    jle(address) {
        this.emit(this.buildInstruction(OPCODES.JLE, address & 0xFFFFFF));
    }
    
    jge(address) {
        this.emit(this.buildInstruction(OPCODES.JGE, address & 0xFFFFFF));
    }
    
    call(address) {
        this.emit(this.buildInstruction(OPCODES.CALL, address & 0xFFFFFF));
    }
    
    ret() {
        this.emit(this.buildInstruction(OPCODES.RET));
    }
    
    // System operations
    syscall() {
        this.emit(this.buildInstruction(OPCODES.SYSCALL));
    }
    
    halt() {
        this.emit(this.buildInstruction(OPCODES.HALT));
    }
    
    nop() {
        this.emit(this.buildInstruction(OPCODES.NOP));
    }
    
    // String data
    string(str, addNull = false) {
        for (let i = 0; i < str.length; i++) {
            this.output.push(str.charCodeAt(i));
        }
        if (addNull) {
            this.output.push(0); // Null terminator
        }
        this.address += str.length + (addNull ? 1 : 0);
    }
    
    // Raw data
    data(bytes) {
        for (const byte of bytes) {
            this.output.push(byte & 0xFF);
        }
        this.address += bytes.length;
    }
    
    // New ISA Addendum instructions
    limm(reg, value) {
        // Load 32-bit immediate (two-word instruction)
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.LIMM, operands));
        this.emit(value); // Emit the 32-bit immediate as a second word
    }
    
    enter(localsSize) {
        const operands = localsSize & 0xFFFF;
        this.emit(this.buildInstruction(OPCODES.ENTER, operands));
    }
    
    leave() {
        this.emit(this.buildInstruction(OPCODES.LEAVE));
    }
    
    calli(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.CALLI, operands));
    }
    
    jmpr(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.JMPR, operands));
    }
    
    rol(dest, src, shiftReg) {
        const operands = (dest << 16) | (src << 12) | (shiftReg << 8);
        this.emit(this.buildInstruction(OPCODES.ROL, operands));
    }
    
    ror(dest, src, shiftReg) {
        const operands = (dest << 16) | (src << 12) | (shiftReg << 8);
        this.emit(this.buildInstruction(OPCODES.ROR, operands));
    }
    
    sar(dest, src, shiftReg) {
        const operands = (dest << 16) | (src << 12) | (shiftReg << 8);
        this.emit(this.buildInstruction(OPCODES.SAR, operands));
    }
    
    addi(dest, src, imm) {
        const operands = (dest << 16) | (src << 12) | (imm & 0xFF);
        this.emit(this.buildInstruction(OPCODES.ADDI, operands));
    }
    
    cmpi(reg, imm) {
        const operands = (reg << 16) | (imm & 0xFF);
        this.emit(this.buildInstruction(OPCODES.CMPI, operands));
    }
    
    trap(trapNum) {
        const operands = trapNum & 0xFF;
        this.emit(this.buildInstruction(OPCODES.TRAP, operands));
    }
    
    // Conditional move instructions
    movc(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVC, operands));
    }
    
    movz(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVZ, operands));
    }
    
    movnz(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVNZ, operands));
    }
    
    movlt(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVLT, operands));
    }
    
    movge(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVGE, operands));
    }
    
    movle(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVLE, operands));
    }
    
    movgt(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVGT, operands));
    }
    
    movne(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOVNE, operands));
    }
    
    // Get final program
    getProgram() {
        return new Uint8Array(this.output);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        BurstVM, 
        BurstAssembler, 
        OPCODES, 
        SYSCALLS,
        ERRORS,
        FLAGS
    };
} else {
    // Browser environment
    window.BurstVM = BurstVM;
    window.BurstAssembler = BurstAssembler;
    window.OPCODES = OPCODES;
    window.SYSCALLS = SYSCALLS;
    window.ERRORS = ERRORS;
    window.FLAGS = FLAGS;
}
