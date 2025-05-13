// BURST VM - Updated for new 16-bit ISA
// This is a JavaScript implementation that can run in Node.js or browser

// Import refactored modules
const executeInstruction = require('./burst-instructions.js');
const MemoryManager = require('./burst-memory-manager.js');
const { FLAGS, CONDITIONS, OPCODES, SYSCALLS, ERRORS } = require('./burst-isa.js');

class BurstVM {
    constructor(memorySize = 1024 * 1024) { // 1MB default
        this.memory = new Uint8Array(memorySize);
        this.registers = new Uint32Array(16); // R0-R15
        this.pc = 0; // Program counter
        this.sp = memorySize - 8; // Stack pointer (grows down)
        this.flags = 0;
        this.halted = false;
        this.trapHandlers = new Map(); // For TRAP instruction
        
        // Use refactored memory manager
        this.memoryManager = new MemoryManager(memorySize);
        
        // Initialize standard file descriptors
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
    
    readWord16(address) {
        if (address + 1 >= this.memory.length) {
            throw new Error(`Memory access violation: ${address}`);
        }
        return (this.memory[address] |
                (this.memory[address + 1] << 8)) >>> 0;
    }
    
    writeWord16(address, value) {
        if (address + 1 >= this.memory.length) {
            throw new Error(`Memory access violation: ${address}`);
        }
        this.memory[address] = value & 0xFF;
        this.memory[address + 1] = (value >> 8) & 0xFF;
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
    
    // Check if a condition is met based on flag states
    checkCondition(conditionCode) {
        const zTest = (conditionCode & 0b100) !== 0;
        const signed = (conditionCode & 0b010) !== 0;
        const invert = (conditionCode & 0b001) !== 0;
        
        let result = true;
        
        if (zTest && signed) {
            // GT: Z=0 AND N=V
            result = !this.getFlag(FLAGS.ZERO) && 
                     (this.getFlag(FLAGS.NEGATIVE) === this.getFlag(FLAGS.OVERFLOW));
        } else if (zTest) {
            // NE/NZ: Z == 0
            result = !this.getFlag(FLAGS.ZERO);
        } else if (signed) {
            // GE: N == V
            result = this.getFlag(FLAGS.NEGATIVE) === this.getFlag(FLAGS.OVERFLOW);
        } else {
            // Always/Never depends only on invert
            result = true;
        }
        
        // Apply inversion
        if (invert) {
            result = !result;
        }
        
        return result;
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
    
    // Execute one instruction using the new ISA format
    step() {
        if (this.halted) return;
        
        // Read the 16-bit instruction
        const instruction = this.readWord16(this.pc);
        const condition = (instruction >> 13) & 0b111;
        const flags = (instruction >> 8) & 0b11111;
        const opcode = instruction & 0xFF;
        
        // Check condition
        if (!this.checkCondition(condition)) {
            // Skip this instruction based on its size
            const instructionSize = this.getInstructionSize(opcode);
            this.pc += instructionSize;
            return;
        }
        
        // Create context for instruction execution
        const context = {
            vm: this,
            instruction,
            opcode,
            condition,
            flags,
            pc: this.pc,
            constants: {
                OPCODES,
                SYSCALLS,
                FLAGS,
                ERRORS,
                CONDITIONS
            }
        };
        
        // Update PC before execution (will be modified by executeInstruction if needed)
        const instructionSize = this.getInstructionSize(opcode);
        this.pc += instructionSize;
        
        // Execute the instruction using the refactored module
        const continueExecution = executeInstruction(context);
        
        // Update if we should halt
        this.halted = !continueExecution;
    }
    
    // Get instruction size based on opcode
    getInstructionSize(opcode) {
        // Most instructions are 2 bytes (16-bit base + optional operands)
        switch (opcode) {
            case OPCODES.NOP:
            case OPCODES.HALT:
            case OPCODES.SYSCALL:
            case OPCODES.RET:
            case OPCODES.RETI:
            case OPCODES.LEAVE:
                return 2;
                
            case OPCODES.LIMM: // 32-bit immediate
            case OPCODES.JMP:  // 24-bit address
            case OPCODES.CALL:
                return 6;
                
            case OPCODES.MOVI: // 16-bit immediate
            case OPCODES.MOVHI:
            case OPCODES.ENTER:
                return 4;
                
            default:
                return 4; // Most instructions with register operands
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

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BurstVM;
} else {
    // Browser environment
    window.BurstVM = BurstVM;
}
