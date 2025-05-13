// instructions.js - Updated for new 16-bit ISA with conditional execution

/**
 * Execute a single instruction
 * @param {Object} context - Execution context with vm, instruction, operands, etc.
 * @returns {boolean} - true if execution should continue, false if halted
 */
function executeInstruction(context) {
    const { vm, opcode, condition, flags: instrFlags, pc } = context;
    const { OPCODES, FLAGS } = context.constants;
    
    // All instructions are already checked for condition in the VM step()
    // So we can focus on execution here
    
    switch (opcode) {
        case OPCODES.NOP:
            break;
            
        case OPCODES.HALT:
            vm.halted = true;
            return false;
            
        case OPCODES.SYSCALL:
            const syscallNum = vm.registers[0];
            vm.executeSyscall(syscallNum);
            break;
            
        case OPCODES.RET: {
            vm.pc = vm.pop();
            break;
        }
        
        case OPCODES.LEAVE: {
            // Function epilogue: SP = FP, pop old FP
            vm.sp = vm.registers[15];
            vm.registers[15] = vm.pop();
            break;
        }
        
        // Memory operations
        case OPCODES.LOAD: {
            const [destBase, offset] = readMemoryOperands(vm, pc);
            const dest = destBase & 0xF;
            const base = destBase >> 4;
            const address = vm.registers[base] + vm.signExtend8(offset);
            vm.registers[dest] = vm.readWord(address);
            break;
        }
        
        case OPCODES.STORE: {
            const [srcBase, offset] = readMemoryOperands(vm, pc);
            const src = srcBase & 0xF;
            const base = srcBase >> 4;
            const address = vm.registers[base] + vm.signExtend8(offset);
            vm.writeWord(address, vm.registers[src]);
            break;
        }
        
        case OPCODES.LOADB: {
            const [destBase, offset] = readMemoryOperands(vm, pc);
            const dest = destBase & 0xF;
            const base = destBase >> 4;
            const address = vm.registers[base] + vm.signExtend8(offset);
            vm.registers[dest] = vm.readByte(address);
            break;
        }
        
        case OPCODES.STOREB: {
            const [srcBase, offset] = readMemoryOperands(vm, pc);
            const src = srcBase & 0xF;
            const base = srcBase >> 4;
            const address = vm.registers[base] + vm.signExtend8(offset);
            vm.writeByte(address, vm.registers[src] & 0xFF);
            break;
        }
        
        case OPCODES.PUSH: {
            const reg = readSingleRegister(vm, pc);
            vm.push(vm.registers[reg]);
            break;
        }
        
        case OPCODES.POP: {
            const reg = readSingleRegister(vm, pc);
            vm.registers[reg] = vm.pop();
            break;
        }
        
        // Register operations
        case OPCODES.MOV: {
            const [regPair] = readRegisterPair(vm, pc);
            const dest = regPair & 0xF;
            const src = regPair >> 4;
            vm.registers[dest] = vm.registers[src];
            break;
        }
        
        case OPCODES.MOVI: {
            const reg = readSingleRegister(vm, pc);
            const imm = vm.readWord16(pc + 4);
            vm.registers[reg] = vm.signExtend16(imm);
            break;
        }
        
        case OPCODES.LIMM: {
            const reg = readSingleRegister(vm, pc);
            const imm32 = vm.readWord(pc + 4);
            vm.registers[reg] = imm32;
            break;
        }
        
        // Arithmetic operations
        case OPCODES.ADD: {
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
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
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
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
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
            const result = Math.imul(vm.registers[src1], vm.registers[src2]);
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.DIV: {
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
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
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
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
            const reg = readSingleRegister(vm, pc);
            const result = vm.registers[reg] + 1;
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.DEC: {
            const reg = readSingleRegister(vm, pc);
            const result = vm.registers[reg] - 1;
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.NEG: {
            const reg = readSingleRegister(vm, pc);
            const result = -vm.registers[reg];
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.ADDI: {
            const [destSrc, imm8] = readRegisterImm8(vm, pc);
            const dest = destSrc & 0xF;
            const src = destSrc >> 4;
            const immValue = vm.signExtend8(imm8);
            const result = vm.registers[src] + immValue;
            vm.registers[dest] = result;
            const overflow = ((vm.registers[src] ^ result) & (immValue ^ result) & 0x80000000) !== 0;
            vm.updateFlags(result, false, overflow);
            break;
        }
        
        // Logical operations
        case OPCODES.AND: {
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
            const result = vm.registers[src1] & vm.registers[src2];
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.OR: {
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
            const result = vm.registers[src1] | vm.registers[src2];
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.XOR: {
            const [dest, src1, src2] = readThreeRegisters(vm, pc);
            const result = vm.registers[src1] ^ vm.registers[src2];
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.NOT: {
            const reg = readSingleRegister(vm, pc);
            const result = ~vm.registers[reg];
            vm.registers[reg] = result;
            vm.updateFlags(result);
            break;
        }
        
        // Shift operations
        case OPCODES.SHL: {
            const [dest, src, shift] = readThreeRegisters(vm, pc);
            const amount = vm.registers[shift] & 0x1F;
            const result = vm.registers[src] << amount;
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.SHR: {
            const [dest, src, shift] = readThreeRegisters(vm, pc);
            const amount = vm.registers[shift] & 0x1F;
            const result = vm.registers[src] >>> amount;
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.SAR: {
            const [dest, src, shift] = readThreeRegisters(vm, pc);
            const amount = vm.registers[shift] & 0x1F;
            const result = vm.registers[src] >> amount;
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.ROL: {
            const [dest, src, shift] = readThreeRegisters(vm, pc);
            const amount = vm.registers[shift] & 0x1F;
            const value = vm.registers[src];
            const result = (value << amount) | (value >>> (32 - amount));
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        case OPCODES.ROR: {
            const [dest, src, shift] = readThreeRegisters(vm, pc);
            const amount = vm.registers[shift] & 0x1F;
            const value = vm.registers[src];
            const result = (value >>> amount) | (value << (32 - amount));
            vm.registers[dest] = result;
            vm.updateFlags(result);
            break;
        }
        
        // Control flow
        case OPCODES.JMP: {
            const addr = read24BitAddress(vm, pc);
            vm.pc = addr;
            break;
        }
        
        case OPCODES.JMPR: {
            const reg = readSingleRegister(vm, pc);
            vm.pc = vm.registers[reg];
            break;
        }
        
        case OPCODES.CALL: {
            const addr = read24BitAddress(vm, pc);
            vm.push(vm.pc);
            vm.pc = addr;
            break;
        }
        
        case OPCODES.CALLI: {
            const reg = readSingleRegister(vm, pc);
            const addr = vm.registers[reg];
            vm.push(vm.pc);
            vm.pc = addr;
            break;
        }
        
        // Comparison
        case OPCODES.CMP: {
            const [regPair] = readRegisterPair(vm, pc);
            const reg1 = regPair & 0xF;
            const reg2 = regPair >> 4;
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
        
        case OPCODES.CMPI: {
            const reg = readSingleRegister(vm, pc);
            const imm8 = vm.readByte(pc + 3);
            const imm = vm.signExtend8(imm8);
            const result = vm.registers[reg] - imm;
            
            // Update flags based on comparison
            vm.setFlag(FLAGS.ZERO, result === 0);
            vm.setFlag(FLAGS.NEGATIVE, (result & 0x80000000) !== 0);
            vm.setFlag(FLAGS.CARRY, vm.registers[reg] < imm);
            vm.setFlag(FLAGS.OVERFLOW, ((vm.registers[reg] ^ imm) & (vm.registers[reg] ^ result) & 0x80000000) !== 0);
            break;
        }
        
        // Stack frame operations
        case OPCODES.ENTER: {
            const localsSize = vm.readWord16(pc + 2);
            
            // Push current FP (R15) onto stack
            vm.push(vm.registers[15]);
            
            // Set FP to SP (after push)
            vm.registers[15] = vm.sp;
            
            // Allocate space for locals
            vm.sp -= localsSize * 4; // Each local is 4 bytes
            break;
        }
        
        // Other instructions
        case OPCODES.TRAP: {
            const trapNum = vm.readByte(pc + 2);
            if (vm.trapHandlers.has(trapNum)) {
                vm.trapHandlers.get(trapNum).call(vm);
            } else {
                console.error(`Unhandled trap: ${trapNum}`);
                vm.halted = true;
                return false;
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

// Helper functions to read operands
function readSingleRegister(vm, pc) {
    return vm.readByte(pc + 2) & 0xF;
}

function readRegisterPair(vm, pc) {
    return [vm.readByte(pc + 2)];
}

function readThreeRegisters(vm, pc) {
    const destReg = vm.readByte(pc + 2);
    const srcRegs = vm.readByte(pc + 3);
    const dest = destReg & 0xF;
    const src1 = srcRegs & 0xF;
    const src2 = srcRegs >> 4;
    return [dest, src1, src2];
}

function readMemoryOperands(vm, pc) {
    const regByte = vm.readByte(pc + 2);
    const offset = vm.readByte(pc + 3);
    return [regByte, offset];
}

function readRegisterImm8(vm, pc) {
    const regByte = vm.readByte(pc + 2);
    const imm8 = vm.readByte(pc + 3);
    return [regByte, imm8];
}

function read24BitAddress(vm, pc) {
    const byte1 = vm.readByte(pc + 2);
    const byte2 = vm.readByte(pc + 3);
    const byte3 = vm.readByte(pc + 4);
    return byte1 | (byte2 << 8) | (byte3 << 16);
}

module.exports = executeInstruction;
