// Disassembler for BURST VM instructions

const { OPCODES } = require('../burst-vm.js');

function disassembleInstruction(vm, addr, instruction) {
    const { opcode, operands } = vm.decode(instruction);
    const mnemonic = Object.keys(OPCODES).find(key => OPCODES[key] === opcode) || 'UNKNOWN';
    
    // Format based on instruction type
    switch (opcode) {
        case OPCODES.NOP:
        case OPCODES.HALT:
        case OPCODES.RET:
        case OPCODES.SYSCALL:
        case OPCODES.LEAVE:  // ISA Addendum
            return mnemonic.toLowerCase();
            
        case OPCODES.PUSH:
        case OPCODES.POP:
        case OPCODES.INC:
        case OPCODES.DEC:
        case OPCODES.NEG:
        case OPCODES.NOT:
        case OPCODES.CALLI:  // ISA Addendum
        case OPCODES.JMPR:   // ISA Addendum
            return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}`;
            
        case OPCODES.MOV:
        case OPCODES.MOVC:   // ISA Addendum
        case OPCODES.MOVZ:   // ISA Addendum
        case OPCODES.MOVNZ:  // ISA Addendum
        case OPCODES.MOVLT:  // ISA Addendum
        case OPCODES.MOVGE:  // ISA Addendum
        case OPCODES.MOVLE:  // ISA Addendum
        case OPCODES.MOVGT:  // ISA Addendum
        case OPCODES.MOVNE:  // ISA Addendum
            return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}, r${(operands >> 12) & 0xF}`;
            
        case OPCODES.MOVI:
            return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}, #${operands & 0xFFFF}`;
            
        case OPCODES.ADD:
        case OPCODES.SUB:
        case OPCODES.MUL:
        case OPCODES.DIV:
        case OPCODES.MOD:
        case OPCODES.AND:
        case OPCODES.OR:
        case OPCODES.XOR:
        case OPCODES.SHL:
        case OPCODES.SHR:
        case OPCODES.ROL:    // ISA Addendum
        case OPCODES.ROR:    // ISA Addendum
        case OPCODES.SAR:    // ISA Addendum
            return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}, r${(operands >> 12) & 0xF}, r${(operands >> 8) & 0xF}`;
            
        case OPCODES.CMP:
            return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}, r${(operands >> 12) & 0xF}`;
            
        case OPCODES.JMP:
        case OPCODES.JZ:
        case OPCODES.JNZ:
        case OPCODES.JEQ:
        case OPCODES.JNE:
        case OPCODES.JLT:
        case OPCODES.JGT:
        case OPCODES.JLE:
        case OPCODES.JGE:
        case OPCODES.CALL:
            return `${mnemonic.toLowerCase()} 0x${(operands & 0xFFFFFF).toString(16)}`;
            
        case OPCODES.LOAD:
        case OPCODES.STORE:
        case OPCODES.LOADB:
        case OPCODES.STOREB:
            const offset = operands & 0xFFF;
            if (offset === 0) {
                return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}, [r${(operands >> 12) & 0xF}]`;
            } else {
                return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}, [r${(operands >> 12) & 0xF}+${offset}]`;
            }
            
        // ISA Addendum instructions
        case OPCODES.LIMM: {
            // Load 32-bit immediate (two-word instruction)
            const reg = (operands >> 16) & 0xF;
            // Note: The next word is the immediate value, but we don't have access to it here
            // This should be handled by the disassembly function that calls this
            return `${mnemonic.toLowerCase()} r${reg}, #[32-bit value]`;
        }
        
        case OPCODES.ENTER: {
            // Enter stack frame
            const localsSize = operands & 0xFFFF;
            return `${mnemonic.toLowerCase()} #${localsSize}`;
        }
        
        case OPCODES.ADDI: {
            // Add immediate
            const dest = (operands >> 16) & 0xF;
            const src = (operands >> 12) & 0xF;
            const imm = operands & 0xFF;
            // Sign extend the immediate
            const signedImm = (imm & 0x80) ? (imm | 0xFFFFFF00) : imm;
            return `${mnemonic.toLowerCase()} r${dest}, r${src}, #${signedImm}`;
        }
        
        case OPCODES.CMPI: {
            // Compare immediate
            const reg = (operands >> 16) & 0xF;
            const imm = operands & 0xFF;
            // Sign extend the immediate
            const signedImm = (imm & 0x80) ? (imm | 0xFFFFFF00) : imm;
            return `${mnemonic.toLowerCase()} r${reg}, #${signedImm}`;
        }
        
        case OPCODES.TRAP: {
            // Software trap
            const trapNum = operands & 0xFF;
            return `${mnemonic.toLowerCase()} #${trapNum}`;
        }
            
        default:
            return `db 0x${instruction.toString(16).padStart(8, '0')}`;
    }
}

// Enhanced disassembly function that handles multi-word instructions
function disassembleMemory(vm, addr, length) {
    const instructions = [];
    let currentAddr = addr;
    
    while (currentAddr < addr + length) {
        const instruction = vm.readWord(currentAddr);
        const { opcode } = vm.decode(instruction);
        
        if (opcode === OPCODES.LIMM) {
            // Handle two-word LIMM instruction
            if (currentAddr + 4 < addr + length) {
                const nextWord = vm.readWord(currentAddr + 4);
                const reg = (instruction >> 16) & 0xFF;
                instructions.push({
                    address: currentAddr,
                    hex: `${instruction.toString(16).padStart(8, '0')} ${nextWord.toString(16).padStart(8, '0')}`,
                    mnemonic: `limm r${reg}, #0x${nextWord.toString(16).padStart(8, '0')}`
                });
                currentAddr += 8; // Skip both words
            } else {
                // Incomplete LIMM instruction
                instructions.push({
                    address: currentAddr,
                    hex: instruction.toString(16).padStart(8, '0'),
                    mnemonic: disassembleInstruction(vm, currentAddr, instruction)
                });
                currentAddr += 4;
            }
        } else {
            // Handle regular single-word instructions
            instructions.push({
                address: currentAddr,
                hex: instruction.toString(16).padStart(8, '0'),
                mnemonic: disassembleInstruction(vm, currentAddr, instruction)
            });
            currentAddr += 4;
        }
    }
    
    return instructions;
}

module.exports = { disassembleInstruction, disassembleMemory };
