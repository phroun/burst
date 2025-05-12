// instructions.js - Contains implementations of all BURST VM instructions
// This file can be required by burst-vm.js to reduce its size

// This file expects the following to be passed in when requiring:
// - vm: The BurstVM instance
// - instruction: The current instruction
// - operands: The operands part of the instruction
// - OPCODES: The opcodes constants
// - FLAGS: The flags constants

/**
 * Execute a single instruction
 * @param {Object} context - Execution context with vm, instruction, operands, etc.
 * @returns {boolean} - true if execution should continue, false if halted
 */
function executeInstruction(context) {
    const { vm, opcode, operands } = context;
    const { OPCODES, FLAGS } = context.constants;
    
    switch (opcode) {
        case OPCODES.NOP:
            break;
            
        case OPCODES.HALT:
            vm.halted = true;
            return false;
            
        // Memory operations
        case OPCODES.LOAD: {
            const dest = (operands >> 16) & 0xF;
            const addrReg = (operands >> 12) & 0xF;
            const offset = operands & 0xFFF;
            const address = vm.registers[addrReg] + offset;
            vm.registers[dest] = vm.readWord(address);
            break;
        }
        
        case OPCODES.STORE: {
            const src = (operands >> 16) & 0xF;
            const addrReg = (operands >> 12) & 0xF;
            const offset = operands & 0xFFF;
            const address = vm.registers[addrReg] + offset;
            vm.writeWord(address, vm.registers[src]);
            break;
        }
        
        case OPCODES.LOADB: {
            const dest = (operands >> 16) & 0xF;
            const addrReg = (operands >> 12) & 0xF;
            const offset = operands & 0xFFF;
            const address = vm.registers[addrReg] + offset;
            vm.registers[dest] = vm.readByte(address);
            break;
        }
        
        case OPCODES.STOREB: {
            const src = (operands >> 16) & 0xF;
            const addrReg = (operands >> 12) & 0xF;
            const offset = operands & 0xFFF;
            const address = vm.registers[addrReg] + offset;
            vm.writeByte(address, vm.registers[src] & 0xFF);
            break;
        }
        
        case OPCODES.PUSH: {
            const reg = (operands >> 16) & 0xF;
            vm.push(vm.registers[reg]);
            break;
        }
        
        case OPCODES.POP: {
            const reg = (operands >> 16) & 0xF;
            vm.registers[reg] = vm.pop();
            break;
        }
        
        // Register operations
        case OPCODES.MOVI: {
            const reg = (operands >> 16) & 0xF;
            const imm = operands & 0xFFFF;
            // Sign extend the immediate value
            vm.registers[reg] = vm.signExtend16(imm);
            break;
        }
        
        case OPCODES.MOV: {
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            vm.registers[dest] = vm.registers[src];
            break;
        }
        
        // Comparison operation
        case OPCODES.CMP: {
            const reg1 = (operands >> 16) & 0xF;
            const reg2 = (operands >> 12) & 0xF;
            const a = vm.registers[reg1];
            const b = vm.registers[reg2];
            const result = a - b;
            
            // Update flags based on comparison
            vm.setFlag(FLAGS.ZERO, result === 0);
            vm.setFlag(FLAGS.NEGATIVE, (result & 0x80000000) !== 0);
            vm.setFlag(FLAGS.CARRY, a < b);
            vm.setFlag(FLAGS.OVERFLOW, ((a ^ b) & (a ^ result) & 0x80000000) !== 0);
            break;
        }
        
        // Arithmetic operations
        case OPCODES.ADD: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const a = vm.registers[src1];
            const b = vm.registers[src2];
            const result = a + b;
            vm.registers[dest] = result;
            const carry = result > 0xFFFFFFFF;
            const overflow = ((a ^ result) & (b ^ result) & 0x80000000) !== 0;
            vm.updateFlags(result, carry, overflow);
            break;
        }
        
        case OPCODES.SUB: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const a = vm.registers[src1];
            const b = vm.registers[src2];
            const result = a - b;
            vm.registers[dest] = result;
            const carry = a < b;
            const overflow = ((a ^ b) & (a ^ result) & 0x80000000) !== 0;
            vm.updateFlags(result, carry, overflow);
            break;
        }
        
        case OPCODES.MUL: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const result = Math.imul(vm.registers[src1], vm.registers[src2]);
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.DIV: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const divisor = vm.registers[src2];
            if (divisor === 0) {
                throw new Error('Division by zero');
            }
            const result = Math.floor(vm.registers[src1] / divisor);
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.MOD: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const divisor = vm.registers[src2];
            if (divisor === 0) {
                throw new Error('Division by zero');
            }
            const result = vm.registers[src1] % divisor;
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.INC: {
            const reg = (operands >> 16) & 0xF;
            const result = vm.registers[reg] + 1;
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.DEC: {
            const reg = (operands >> 16) & 0xF;
            const result = vm.registers[reg] - 1;
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.NEG: {
            const reg = (operands >> 16) & 0xF;
            const result = -vm.registers[reg];
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        // Logical operations
        case OPCODES.AND: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const result = vm.registers[src1] & vm.registers[src2];
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.OR: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const result = vm.registers[src1] | vm.registers[src2];
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.XOR: {
            const dest = (operands >> 16) & 0xF;
            const src1 = (operands >> 12) & 0xF;
            const src2 = (operands >> 8) & 0xF;
            const result = vm.registers[src1] ^ vm.registers[src2];
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.NOT: {
            const reg = (operands >> 16) & 0xF;
            const result = ~vm.registers[reg];
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.SHL: {
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const shiftAmount = (operands >> 8) & 0xF;
            const amount = vm.registers[shiftAmount] & 0x1F;
            const result = vm.registers[src] << amount;
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.SHR: {
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const shiftAmount = (operands >> 8) & 0xF;
            const amount = vm.registers[shiftAmount] & 0x1F;
            const result = vm.registers[src] >>> amount;
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        // Control flow
        case OPCODES.JMP: {
            const addr = operands & 0xFFFFFF;
            vm.pc = addr;
            break;
        }
        
        case OPCODES.JZ: {
            const addr = operands & 0xFFFFFF;
            if (vm.getFlag(FLAGS.ZERO)) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JNZ: {
            const addr = operands & 0xFFFFFF;
            if (!vm.getFlag(FLAGS.ZERO)) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JEQ: {
            const addr = operands & 0xFFFFFF;
            if (vm.getFlag(FLAGS.ZERO)) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JNE: {
            const addr = operands & 0xFFFFFF;
            if (!vm.getFlag(FLAGS.ZERO)) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JLT: {
            const addr = operands & 0xFFFFFF;
            if (vm.getFlag(FLAGS.NEGATIVE) !== vm.getFlag(FLAGS.OVERFLOW)) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JGT: {
            const addr = operands & 0xFFFFFF;
            if (!vm.getFlag(FLAGS.ZERO) && 
                (vm.getFlag(FLAGS.NEGATIVE) === vm.getFlag(FLAGS.OVERFLOW))) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JLE: {
            const addr = operands & 0xFFFFFF;
            if (vm.getFlag(FLAGS.ZERO) || 
                (vm.getFlag(FLAGS.NEGATIVE) !== vm.getFlag(FLAGS.OVERFLOW))) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.JGE: {
            const addr = operands & 0xFFFFFF;
            if (vm.getFlag(FLAGS.NEGATIVE) === vm.getFlag(FLAGS.OVERFLOW)) {
                vm.pc = addr;
            }
            break;
        }
        
        case OPCODES.CALL: {
            const addr = operands & 0xFFFFFF;
            vm.push(vm.pc);
            vm.pc = addr;
            break;
        }
        
        case OPCODES.RET: {
            vm.pc = vm.pop();
            break;
        }
        
        case OPCODES.SYSCALL: {
            const syscallNum = vm.registers[0];
            vm.executeSyscall(syscallNum);
            break;
        }
        
        // ISA Addendum instructions
        case OPCODES.LIMM: {
            // Load 32-bit immediate (two-word instruction)
            const reg = (operands >> 16) & 0xF;
            const imm32 = vm.readWord(vm.pc);
            vm.pc += 4; // Skip the immediate word
            vm.registers[reg] = imm32;
            break;
        }

        // ENTER instruction
        case OPCODES.ENTER: {
            // Function prologue: push FP, set FP = SP, allocate locals
            const localsSize = operands & 0xFFFF; // 16-bit immediate
            
            // Push current FP (R15) onto stack
            vm.push(vm.registers[15]);
            
            // Set FP to SP (after push)
            vm.registers[15] = vm.sp;
            
            // Allocate space for locals
            vm.sp -= localsSize * 4; // Each local is 4 bytes
            break;
        }

        case OPCODES.LEAVE: {
            // Function epilogue: SP = FP, pop old FP
            // First restore SP to FP (this deallocates locals and gets SP to where FP is)
            vm.sp = vm.registers[15];
            
            // Then pop old FP from stack
            // Pop will increment SP by 4, which should leave SP at the correct position
            vm.registers[15] = vm.pop();
            break;
        }

        case OPCODES.CALLI: {
            // Indirect call - call function at address in register
            const reg = (operands >> 16) & 0xF;
            const addr = vm.registers[reg];
            vm.push(vm.pc);
            vm.pc = addr;
            break;
        }
        
        case OPCODES.JMPR: {
            // Indirect jump - jump to address in register
            const reg = (operands >> 16) & 0xF;
            vm.pc = vm.registers[reg];
            break;
        }
        
        case OPCODES.ROL: {
            // Rotate left
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const shiftReg = (operands >> 8) & 0xF;
            const amount = vm.registers[shiftReg] & 0x1F;
            const value = vm.registers[src];
            const result = (value << amount) | (value >>> (32 - amount));
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.ROR: {
            // Rotate right
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const shiftReg = (operands >> 8) & 0xF;
            const amount = vm.registers[shiftReg] & 0x1F;
            const value = vm.registers[src];
            const result = (value >>> amount) | (value << (32 - amount));
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.SAR: {
            // Shift arithmetic right (sign-preserving)
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const shiftReg = (operands >> 8) & 0xF;
            const amount = vm.registers[shiftReg] & 0x1F;
            const result = vm.registers[src] >> amount; // Signed shift
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.ADDI: {
            // Add immediate to register
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const imm = vm.signExtend8(operands & 0xFF);
            const result = vm.registers[src] + imm;
            vm.registers[dest] = result;
            const overflow = ((vm.registers[src] ^ result) & (imm ^ result) & 0x80000000) !== 0;
            vm.updateFlags(result, false, overflow);
            break;
        }
        
        case OPCODES.CMPI: {
            // Compare register with immediate
            const reg = (operands >> 16) & 0xF;
            const imm = vm.signExtend8(operands & 0xFF);
            const result = vm.registers[reg] - imm;
            
            // Update flags based on comparison
            vm.setFlag(FLAGS.ZERO, result === 0);
            vm.setFlag(FLAGS.NEGATIVE, (result & 0x80000000) !== 0);
            vm.setFlag(FLAGS.CARRY, vm.registers[reg] < imm);
            vm.setFlag(FLAGS.OVERFLOW, ((vm.registers[reg] ^ imm) & (vm.registers[reg] ^ result) & 0x80000000) !== 0);
            break;
        }
        
        case OPCODES.TRAP: {
            // Software trap/interrupt
            const trapNum = operands & 0xFF;
            if (vm.trapHandlers.has(trapNum)) {
                vm.trapHandlers.get(trapNum).call(vm);
            } else {
                console.error(`Unhandled trap: ${trapNum}`);
                vm.halted = true;
                return false;
            }
            break;
        }
        
        // Conditional move instructions
        case OPCODES.MOVC: {
            // Unconditional move (same as MOV)
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            vm.registers[dest] = vm.registers[src];
            break;
        }
        
        case OPCODES.MOVZ: {
            // Move if zero
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (vm.getFlag(FLAGS.ZERO)) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        case OPCODES.MOVNZ: {
            // Move if not zero
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (!vm.getFlag(FLAGS.ZERO)) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        case OPCODES.MOVLT: {
            // Move if less than
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (vm.getFlag(FLAGS.NEGATIVE) !== vm.getFlag(FLAGS.OVERFLOW)) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        case OPCODES.MOVGE: {
            // Move if greater or equal
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (vm.getFlag(FLAGS.NEGATIVE) === vm.getFlag(FLAGS.OVERFLOW)) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        case OPCODES.MOVLE: {
            // Move if less or equal
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (vm.getFlag(FLAGS.ZERO) || 
                (vm.getFlag(FLAGS.NEGATIVE) !== vm.getFlag(FLAGS.OVERFLOW))) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        case OPCODES.MOVGT: {
            // Move if greater than
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (!vm.getFlag(FLAGS.ZERO) && 
                (vm.getFlag(FLAGS.NEGATIVE) === vm.getFlag(FLAGS.OVERFLOW))) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        case OPCODES.MOVNE: {
            // Move if not equal (alias of MOVNZ)
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            if (!vm.getFlag(FLAGS.ZERO)) {
                vm.registers[dest] = vm.registers[src];
            }
            break;
        }
        
        default:
            console.error(`Unknown opcode: 0x${opcode.toString(16)}`);
            vm.halted = true;
            return false;
    }
    
    return true; // Continue execution
}

module.exports = executeInstruction;
