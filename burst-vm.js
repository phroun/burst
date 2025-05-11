// BURST VM - Basic Universal Reference System Toolkit
// This is a JavaScript implementation that can run in Node.js or browser
// Updated to align with ISA and fix missing functionality

// Instruction opcodes (aligned with documented ISA)
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

// Memory management
class MemoryManager {
    constructor(totalSize = 1024 * 1024) {
        this.totalSize = totalSize;
        this.freeList = [{ start: 0x10000, size: totalSize - 0x10000 }]; // Reserve first 64KB
        this.allocations = new Map();
    }
    
    alloc(size) {
        // Align size to 8 bytes
        size = (size + 7) & ~7;
        
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            if (block.size >= size) {
                const addr = block.start;
                
                // Update or remove free block
                if (block.size === size) {
                    this.freeList.splice(i, 1);
                } else {
                    block.start += size;
                    block.size -= size;
                }
                
                this.allocations.set(addr, size);
                return addr;
            }
        }
        
        return 0; // Out of memory
    }
    
    free(addr) {
        const size = this.allocations.get(addr);
        if (!size) return false;
        
        this.allocations.delete(addr);
        
        // Add back to free list and try to merge
        let inserted = false;
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            
            // Check if we can merge with this block
            if (block.start === addr + size) {
                // Merge with block after
                block.start = addr;
                block.size += size;
                inserted = true;
                
                // Check if we can also merge with block before
                if (i > 0) {
                    const prevBlock = this.freeList[i - 1];
                    if (prevBlock.start + prevBlock.size === addr) {
                        prevBlock.size += block.size;
                        this.freeList.splice(i, 1);
                    }
                }
                break;
            } else if (block.start + block.size === addr) {
                // Merge with block before
                block.size += size;
                inserted = true;
                
                // Check if we can also merge with block after
                if (i < this.freeList.length - 1) {
                    const nextBlock = this.freeList[i + 1];
                    if (addr + size === nextBlock.start) {
                        block.size += nextBlock.size;
                        this.freeList.splice(i + 1, 1);
                    }
                }
                break;
            } else if (block.start > addr) {
                // Insert before this block
                this.freeList.splice(i, 0, { start: addr, size: size });
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            this.freeList.push({ start: addr, size: size });
        }
        
        return true;
    }
    
    realloc(addr, newSize) {
        const oldSize = this.allocations.get(addr);
        if (!oldSize) return 0;
        
        if (newSize <= oldSize) {
            // Shrink - we can just update the size
            this.allocations.set(addr, newSize);
            if (newSize < oldSize) {
                // Return excess to free list
                this.free(addr + newSize);
                this.allocations.set(addr, newSize);
            }
            return addr;
        }
        
        // Try to expand in place
        const excess = newSize - oldSize;
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            if (block.start === addr + oldSize && block.size >= excess) {
                // Can expand in place
                if (block.size === excess) {
                    this.freeList.splice(i, 1);
                } else {
                    block.start += excess;
                    block.size -= excess;
                }
                this.allocations.set(addr, newSize);
                return addr;
            }
        }
        
        // Need to relocate
        const newAddr = this.alloc(newSize);
        if (newAddr === 0) return 0;
        
        this.free(addr);
        return newAddr;
    }
}

class BurstVM {
    constructor(memorySize = 1024 * 1024) { // 1MB default
        this.memory = new Uint8Array(memorySize);
        this.registers = new Uint32Array(16); // R0-R15
        this.pc = 0; // Program counter
        this.sp = memorySize - 8; // Stack pointer (grows down, leave room for first push)
        this.flags = 0;
        this.halted = false;
        
        // Memory manager
        this.memoryManager = new MemoryManager(memorySize);
        
        // Standard file descriptors
        this.fileDescriptors = new Map();
        this.nextFd = 3; // 0,1,2 are reserved
        
        // Initialize standard I/O
        this.initStandardIO();
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
    
    // Execute system call
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
    
    // Helper function for sign extension
    signExtend16(value) {
        if (value & 0x8000) {
            return value | 0xFFFF0000;
        }
        return value;
    }
    
    // Execute one instruction
    step() {
        if (this.halted) return;
        
        const instruction = this.readWord(this.pc);
        const { opcode, operands } = this.decode(instruction);
        this.pc += 4;
        
        switch (opcode) {
            case OPCODES.NOP:
                break;
                
            case OPCODES.HALT:
                this.halted = true;
                break;
                
            // Memory operations
            case OPCODES.LOAD: {
                const dest = (operands >> 16) & 0xF;
                const addrReg = (operands >> 12) & 0xF;
                const offset = operands & 0xFFF;
                const address = this.registers[addrReg] + offset;
                this.registers[dest] = this.readWord(address);
                break;
            }
            
            case OPCODES.STORE: {
                const src = (operands >> 16) & 0xF;
                const addrReg = (operands >> 12) & 0xF;
                const offset = operands & 0xFFF;
                const address = this.registers[addrReg] + offset;
                this.writeWord(address, this.registers[src]);
                break;
            }
            
            case OPCODES.LOADB: {
                const dest = (operands >> 16) & 0xF;
                const addrReg = (operands >> 12) & 0xF;
                const offset = operands & 0xFFF;
                const address = this.registers[addrReg] + offset;
                this.registers[dest] = this.readByte(address);
                break;
            }
            
            case OPCODES.STOREB: {
                const src = (operands >> 16) & 0xF;
                const addrReg = (operands >> 12) & 0xF;
                const offset = operands & 0xFFF;
                const address = this.registers[addrReg] + offset;
                this.writeByte(address, this.registers[src] & 0xFF);
                break;
            }
            
            case OPCODES.PUSH: {
                const reg = (operands >> 16) & 0xF;
                this.push(this.registers[reg]);
                break;
            }
            
            case OPCODES.POP: {
                const reg = (operands >> 16) & 0xF;
                this.registers[reg] = this.pop();
                break;
            }
            
            // Register operations
            case OPCODES.MOVI: {
                const reg = (operands >> 16) & 0xF;
                const imm = operands & 0xFFFF;
                // Sign extend the immediate value
                this.registers[reg] = this.signExtend16(imm);
                break;
            }
            
            case OPCODES.MOV: {
                const dest = (operands >> 16) & 0xF;
                const src = (operands >> 12) & 0xF;
                this.registers[dest] = this.registers[src];
                break;
            }
            
            // Comparison operation (was missing)
            case OPCODES.CMP: {
                const reg1 = (operands >> 16) & 0xF;
                const reg2 = (operands >> 12) & 0xF;
                const a = this.registers[reg1];
                const b = this.registers[reg2];
                const result = a - b;
                
                // Update flags based on comparison
                this.setFlag(FLAGS.ZERO, result === 0);
                this.setFlag(FLAGS.NEGATIVE, (result & 0x80000000) !== 0);
                this.setFlag(FLAGS.CARRY, a < b);
                this.setFlag(FLAGS.OVERFLOW, ((a ^ b) & (a ^ result) & 0x80000000) !== 0);
                break;
            }
            
            // Arithmetic operations
            case OPCODES.ADD: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const a = this.registers[src1];
                const b = this.registers[src2];
                const result = a + b;
                this.registers[dest] = result;
                const carry = result > 0xFFFFFFFF;
                const overflow = ((a ^ result) & (b ^ result) & 0x80000000) !== 0;
                this.updateFlags(result, carry, overflow);
                break;
            }
            
            case OPCODES.SUB: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const a = this.registers[src1];
                const b = this.registers[src2];
                const result = a - b;
                this.registers[dest] = result;
                const carry = a < b;
                const overflow = ((a ^ b) & (a ^ result) & 0x80000000) !== 0;
                this.updateFlags(result, carry, overflow);
                break;
            }
            
            case OPCODES.MUL: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const result = Math.imul(this.registers[src1], this.registers[src2]);
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.DIV: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const divisor = this.registers[src2];
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                const result = Math.floor(this.registers[src1] / divisor);
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.MOD: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const divisor = this.registers[src2];
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                const result = this.registers[src1] % divisor;
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.INC: {
                const reg = (operands >> 16) & 0xF;
                const result = this.registers[reg] + 1;
                this.registers[reg] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.DEC: {
                const reg = (operands >> 16) & 0xF;
                const result = this.registers[reg] - 1;
                this.registers[reg] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.NEG: {
                const reg = (operands >> 16) & 0xF;
                const result = -this.registers[reg];
                this.registers[reg] = result;
                this.updateFlags(result);
                break;
            }
            
            // Logical operations
            case OPCODES.AND: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const result = this.registers[src1] & this.registers[src2];
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.OR: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const result = this.registers[src1] | this.registers[src2];
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.XOR: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const result = this.registers[src1] ^ this.registers[src2];
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.NOT: {
                const reg = (operands >> 16) & 0xF;
                const result = ~this.registers[reg];
                this.registers[reg] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.SHL: {
                const dest = (operands >> 16) & 0xF;
                const src = (operands >> 12) & 0xF;
                const shiftAmount = (operands >> 8) & 0xF;
                const amount = this.registers[shiftAmount] & 0x1F;
                const result = this.registers[src] << amount;
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.SHR: {
                const dest = (operands >> 16) & 0xF;
                const src = (operands >> 12) & 0xF;
                const shiftAmount = (operands >> 8) & 0xF;
                const amount = this.registers[shiftAmount] & 0x1F;
                const result = this.registers[src] >>> amount;
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            // Control flow
            case OPCODES.JMP: {
                const addr = operands & 0xFFFFFF;
                this.pc = addr;
                break;
            }
            
            case OPCODES.JZ: {
                const addr = operands & 0xFFFFFF;
                if (this.getFlag(FLAGS.ZERO)) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JNZ: {
                const addr = operands & 0xFFFFFF;
                if (!this.getFlag(FLAGS.ZERO)) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JEQ: {
                const addr = operands & 0xFFFFFF;
                if (this.getFlag(FLAGS.ZERO)) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JNE: {
                const addr = operands & 0xFFFFFF;
                if (!this.getFlag(FLAGS.ZERO)) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JLT: {
                const addr = operands & 0xFFFFFF;
                if (this.getFlag(FLAGS.NEGATIVE) !== this.getFlag(FLAGS.OVERFLOW)) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JGT: {
                const addr = operands & 0xFFFFFF;
                if (!this.getFlag(FLAGS.ZERO) && 
                    (this.getFlag(FLAGS.NEGATIVE) === this.getFlag(FLAGS.OVERFLOW))) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JLE: {
                const addr = operands & 0xFFFFFF;
                if (this.getFlag(FLAGS.ZERO) || 
                    (this.getFlag(FLAGS.NEGATIVE) !== this.getFlag(FLAGS.OVERFLOW))) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.JGE: {
                const addr = operands & 0xFFFFFF;
                if (this.getFlag(FLAGS.NEGATIVE) === this.getFlag(FLAGS.OVERFLOW)) {
                    this.pc = addr;
                }
                break;
            }
            
            case OPCODES.CALL: {
                const addr = operands & 0xFFFFFF;
                this.push(this.pc);
                this.pc = addr;
                break;
            }
            
            case OPCODES.RET: {
                this.pc = this.pop();
                break;
            }
            
            case OPCODES.SYSCALL: {
                const syscallNum = this.registers[0];
                this.executeSyscall(syscallNum);
                break;
            }
            
            default:
                console.error(`Unknown opcode: 0x${opcode.toString(16)}`);
                this.halted = true;
        }
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
    
    // Get final program
    getProgram() {
        return new Uint8Array(this.output);
    }
}

// Example programs
function createHelloWorldProgram() {
    const asm = new BurstAssembler();
    
    // Jump to main
    asm.jmp('main');
    
    // String data
    asm.label('hello_str');
    asm.string('Hello, BURST World!');
    
    // Main program
    asm.label('main');
    asm.movi(1, 4); // R1 = address of hello_str (4)
    asm.movi(2, 19); // R2 = length of string
    asm.movi(0, SYSCALLS.SYS_PRINT); // R0 = SYS_PRINT
    asm.syscall();
    
    asm.movi(0, SYSCALLS.SYS_EXIT); // R0 = SYS_EXIT
    asm.movi(1, 0); // R1 = exit code 0
    asm.syscall();
    
    asm.halt();
    
    return asm.getProgram();
}

function createMemoryTestProgram() {
    const asm = new BurstAssembler();
    
    // Allocate memory
    asm.movi(0, SYSCALLS.SYS_ALLOC);
    asm.movi(1, 100); // Request 100 bytes
    asm.syscall();
    
    // Save allocated address
    asm.mov(5, 0); // R5 = allocated address
    
    // Store some data
    asm.movi(4, 0x1234);
    asm.store(4, 5, 0); // Store to allocated memory
    
    // Load it back
    asm.load(6, 5, 0);
    
    // Free the memory
    asm.movi(0, SYSCALLS.SYS_FREE);
    asm.mov(1, 5);
    asm.syscall();
    
    asm.halt();
    
    return asm.getProgram();
}

function createLoopProgram() {
    const asm = new BurstAssembler();
    
    // Initialize counter
    asm.movi(1, 0); // R1 = counter
    asm.movi(2, 10); // R2 = limit
    
    asm.label('loop');
    asm.inc(1); // Increment counter
    
    // Print counter value
    asm.movi(0, SYSCALLS.SYS_PUTCHAR);
    asm.movi(3, '0'.charCodeAt(0));
    asm.add(3, 3, 1); // Convert to ASCII
    asm.mov(1, 3);
    asm.syscall();
    
    // Print newline
    asm.movi(1, '\n'.charCodeAt(0));
    asm.syscall();
    
    // Check loop condition
    asm.mov(1, 3); // Restore counter
    asm.cmp(1, 2);
    asm.jlt('loop');
    
    asm.halt();
    
    return asm.getProgram();
}

// Example usage
if (typeof require !== 'undefined' && require.main === module) {
    // Running directly
    console.log('BURST VM - Enhanced Version');
    console.log('===========================\n');
    
    // Test Hello World
    console.log('Running Hello World:');
    let vm = new BurstVM();
    let program = createHelloWorldProgram();
    vm.loadProgram(program);
    vm.run();
    
    // Test Memory Management
    console.log('\nRunning Memory Test:');
    vm = new BurstVM();
    program = createMemoryTestProgram();
    vm.loadProgram(program);
    vm.run();
    vm.dumpRegisters();
    
    // Test Loop
    console.log('\nRunning Loop Test:');
    vm = new BurstVM();
    program = createLoopProgram();
    vm.loadProgram(program);
    vm.run();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        BurstVM, 
        BurstAssembler, 
        OPCODES, 
        SYSCALLS,
        ERRORS,
        FLAGS,
        MemoryManager
    };
} else {
    // Browser environment
    window.BurstVM = BurstVM;
    window.BurstAssembler = BurstAssembler;
    window.OPCODES = OPCODES;
    window.SYSCALLS = SYSCALLS;
    window.ERRORS = ERRORS;
    window.FLAGS = FLAGS;
    window.MemoryManager = MemoryManager;
}
