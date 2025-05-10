// BURST VM - Basic Universal Reference System Toolkit
// This is a JavaScript implementation that can run in Node.js or browser

// Instruction opcodes
const OPCODES = {
    // Memory operations
    LOAD:  0x01,
    STORE: 0x02,
    PUSH:  0x03,
    POP:   0x04,
    
    // Arithmetic/Logic
    ADD:   0x10,
    SUB:   0x11,
    MUL:   0x12,
    DIV:   0x13,
    MOD:   0x14,
    AND:   0x15,
    OR:    0x16,
    XOR:   0x17,
    NOT:   0x18,
    SHL:   0x19,
    SHR:   0x1A,
    
    // Control flow
    JMP:   0x20,
    JZ:    0x21,
    JNZ:   0x22,
    JEQ:   0x23,
    JNE:   0x24,
    JLT:   0x25,
    JGT:   0x26,
    CALL:  0x27,
    RET:   0x28,
    
    // Register operations
    MOV:   0x30,
    MOVI:  0x31,
    CMP:   0x32,
    
    // System operations
    SYSCALL: 0x40,
    HALT:    0x41,
    NOP:     0x42,
};

// System call numbers
const SYSCALLS = {
    // Memory management
    SYS_ALLOC:    1,
    SYS_FREE:     2,
    SYS_REALLOC:  3,
    
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
        this.sp = memorySize - 4; // Stack pointer (grows down)
        this.flags = 0;
        this.halted = false;
        
        // Standard file descriptors
        this.fileDescriptors = new Map();
        this.nextFd = 3; // 0,1,2 are reserved
        
        // Initialize standard I/O
        this.initStandardIO();
    }
    
    initStandardIO() {
        // Placeholder for standard I/O
        this.output = '';
        this.inputBuffer = '';
        this.inputIndex = 0;
    }
    
    // Memory access methods
    readByte(address) {
        return this.memory[address];
    }
    
    writeByte(address, value) {
        this.memory[address] = value & 0xFF;
    }
    
    readWord(address) {
        return (this.memory[address] |
                (this.memory[address + 1] << 8) |
                (this.memory[address + 2] << 16) |
                (this.memory[address + 3] << 24)) >>> 0;
    }
    
    writeWord(address, value) {
        this.memory[address] = value & 0xFF;
        this.memory[address + 1] = (value >> 8) & 0xFF;
        this.memory[address + 2] = (value >> 16) & 0xFF;
        this.memory[address + 3] = (value >> 24) & 0xFF;
    }
    
    // Stack operations
    push(value) {
        this.sp -= 4;
        this.writeWord(this.sp, value);
    }
    
    pop() {
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
    
    updateFlags(result) {
        this.setFlag(FLAGS.ZERO, result === 0);
        this.setFlag(FLAGS.NEGATIVE, (result & 0x80000000) !== 0);
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
            
            case SYSCALLS.SYS_ALLOC: {
                const size = this.registers[1];
                // Simple allocation (just return a fake pointer for now)
                // In a real implementation, we'd need a proper memory allocator
                this.registers[0] = 0x10000; // Fake pointer
                break;
            }
            
            default:
                this.registers[0] = ERRORS.E_NOSYS;
                break;
        }
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
                
            case OPCODES.MOVI: {
                const reg = (operands >> 16) & 0xF;
                const imm = operands & 0xFFFF;
                this.registers[reg] = imm;
                break;
            }
            
            case OPCODES.MOV: {
                const dest = (operands >> 16) & 0xF;
                const src = (operands >> 12) & 0xF;
                this.registers[dest] = this.registers[src];
                break;
            }
            
            case OPCODES.ADD: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const result = this.registers[src1] + this.registers[src2];
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.SUB: {
                const dest = (operands >> 16) & 0xF;
                const src1 = (operands >> 12) & 0xF;
                const src2 = (operands >> 8) & 0xF;
                const result = this.registers[src1] - this.registers[src2];
                this.registers[dest] = result;
                this.updateFlags(result);
                break;
            }
            
            case OPCODES.CMP: {
                const reg1 = (operands >> 16) & 0xF;
                const reg2 = (operands >> 12) & 0xF;
                const result = this.registers[reg1] - this.registers[reg2];
                this.updateFlags(result);
                break;
            }
            
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
}

// Assembler helper class
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
    
    // Resolve labels after assembly
    resolveLabels() {
        for (const pending of this.pendingLabels) {
            const labelAddress = this.labels.get(pending.label);
            if (labelAddress === undefined) {
                throw new Error(`Undefined label: ${pending.label}`);
            }
            
            // Update the instruction with the resolved address
            const offset = pending.offset;
            const instruction = (this.output[offset] |
                               (this.output[offset + 1] << 8) |
                               (this.output[offset + 2] << 16) |
                               (this.output[offset + 3] << 24));
            
            const opcode = instruction >> 24;
            const newInstruction = (opcode << 24) | (labelAddress & 0xFFFFFF);
            
            this.output[offset] = newInstruction & 0xFF;
            this.output[offset + 1] = (newInstruction >> 8) & 0xFF;
            this.output[offset + 2] = (newInstruction >> 16) & 0xFF;
            this.output[offset + 3] = (newInstruction >> 24) & 0xFF;
        }
    }
    
    // Assembly methods for each instruction
    movi(reg, imm) {
        const operands = (reg << 16) | (imm & 0xFFFF);
        this.emit(this.buildInstruction(OPCODES.MOVI, operands));
    }
    
    mov(dest, src) {
        const operands = (dest << 16) | (src << 12);
        this.emit(this.buildInstruction(OPCODES.MOV, operands));
    }
    
    add(dest, src1, src2) {
        const operands = (dest << 16) | (src1 << 12) | (src2 << 8);
        this.emit(this.buildInstruction(OPCODES.ADD, operands));
    }
    
    syscall() {
        this.emit(this.buildInstruction(OPCODES.SYSCALL));
    }
    
    halt() {
        this.emit(this.buildInstruction(OPCODES.HALT));
    }
    
    jmp(label) {
        this.pendingLabels.push({ label, offset: this.address });
        this.emit(this.buildInstruction(OPCODES.JMP, 0));
    }
    
    push(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.PUSH, operands));
    }
    
    pop(reg) {
        const operands = (reg << 16);
        this.emit(this.buildInstruction(OPCODES.POP, operands));
    }
    
    call(label) {
        this.pendingLabels.push({ label, offset: this.address });
        this.emit(this.buildInstruction(OPCODES.CALL, 0));
    }
    
    ret() {
        this.emit(this.buildInstruction(OPCODES.RET));
    }
    
    // String data
    string(str) {
        for (let i = 0; i < str.length; i++) {
            this.output.push(str.charCodeAt(i));
        }
        this.address += str.length;
    }
    
    // Get final program
    getProgram() {
        this.resolveLabels();
        return new Uint8Array(this.output);
    }
}

// Example: Hello World program
function createHelloWorldProgram() {
    const asm = new BurstAssembler();
    
    // Jump to main
    asm.jmp('main');
    
    // String data
    asm.label('hello_str');
    asm.string('Hello, World!');
    
    // Main program
    asm.label('main');
    asm.movi(1, 4); // R1 = address of hello_str (4)
    asm.movi(2, 13); // R2 = length of string
    asm.movi(0, SYSCALLS.SYS_PRINT); // R0 = SYS_PRINT
    asm.syscall();
    
    asm.movi(0, SYSCALLS.SYS_EXIT); // R0 = SYS_EXIT
    asm.movi(1, 0); // R1 = exit code 0
    asm.syscall();
    
    asm.halt();
    
    return asm.getProgram();
}

// Example usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BurstVM, BurstAssembler, OPCODES, SYSCALLS };
} else {
    // Browser environment
    window.BurstVM = BurstVM;
    window.BurstAssembler = BurstAssembler;
    window.OPCODES = OPCODES;
    window.SYSCALLS = SYSCALLS;
}

// Demo
const vm = new BurstVM();
const program = createHelloWorldProgram();
vm.loadProgram(program);
console.log('Starting BURST VM...');
vm.run();
console.log('VM halted. Output:', vm.output);
