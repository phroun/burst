// Disassembler for BURST VM instructions with new 16-bit ISA

const { OPCODES, CONDITIONS } = require('../burst-isa.js');

// Reverse mapping of condition codes to names
const CONDITION_NAMES = {
    [CONDITIONS.ALWAYS]: '',  // No prefix for always
    [CONDITIONS.NE]: 'ne',
    [CONDITIONS.GE]: 'ge',
    [CONDITIONS.GT]: 'gt',
    [CONDITIONS.NEVER]: 'never',
    [CONDITIONS.EQ]: 'eq',
    [CONDITIONS.LT]: 'lt',
    [CONDITIONS.LE]: 'le',
};

function disassembleInstruction(vm, addr, instruction16) {
    // Extract fields from 16-bit instruction
    const condition = (instruction16 >> 13) & 0b111;
    const flags = (instruction16 >> 8) & 0b11111;
    const opcode = instruction16 & 0xFF;
    
    // Get mnemonic
    const baseMnemonic = Object.keys(OPCODES).find(key => OPCODES[key] === opcode) || 'UNKNOWN';
    
    // Get condition prefix
    const conditionName = CONDITION_NAMES[condition];
    const prefix = conditionName ? `if${conditionName} ` : '';
    
    // Get instruction size for reading operands
    const instructionSize = getInstructionSize(opcode);
    
    // Format based on instruction type
    switch (opcode) {
        case OPCODES.HALT:
        case OPCODES.RET:
        case OPCODES.SYSCALL:
        case OPCODES.LEAVE:
            return prefix + baseMnemonic.toLowerCase();
            
        case OPCODES.PUSH:
        case OPCODES.POP:
        case OPCODES.INC:
        case OPCODES.DEC:
        case OPCODES.NEG:
        case OPCODES.NOT:
        case OPCODES.JMPR:
        case OPCODES.CALLI: {
            const reg = vm.readByte(addr + 2) & 0xF;
            return `${prefix}${baseMnemonic.toLowerCase()} r${reg}`;
        }
            
        case OPCODES.MOV:
        case OPCODES.CMP: {
            const regByte = vm.readByte(addr + 2);
            const dest = regByte & 0xF;
            const src = regByte >> 4;
            return `${prefix}${baseMnemonic.toLowerCase()} r${dest}, r${src}`;
        }
        
        case OPCODES.MOVI: {
            const reg = vm.readByte(addr + 2) & 0xF;
            const imm = vm.readWord16(addr + 4);
            return `${prefix}${baseMnemonic.toLowerCase()} r${reg}, #${imm}`;
        }
        
        case OPCODES.LIMM: {
            const reg = vm.readByte(addr + 2) & 0xF;
            const imm32 = vm.readWord(addr + 4);
            return `${prefix}${baseMnemonic.toLowerCase()} r${reg}, #0x${imm32.toString(16).padStart(8, '0')}`;
        }
        
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
        case OPCODES.SAR:
        case OPCODES.ROL:
        case OPCODES.ROR: {
            const destReg = vm.readByte(addr + 2);
            const srcRegs = vm.readByte(addr + 3);
            const dest = destReg & 0xF;
            const src1 = srcRegs & 0xF;
            const src2 = srcRegs >> 4;
            return `${prefix}${baseMnemonic.toLowerCase()} r${dest}, r${src1}, r${src2}`;
        }
        
        case OPCODES.ADDI: {
            const regByte = vm.readByte(addr + 2);
            const imm8 = vm.readByte(addr + 3);
            const dest = regByte & 0xF;
            const src = regByte >> 4;
            // Sign extend the immediate
            const signedImm = (imm8 & 0x80) ? (imm8 | 0xFFFFFF00) : imm8;
            return `${prefix}${baseMnemonic.toLowerCase()} r${dest}, r${src}, #${signedImm}`;
        }
        
        case OPCODES.CMPI: {
            const reg = vm.readByte(addr + 2) & 0xF;
            const imm8 = vm.readByte(addr + 3);
            // Sign extend the immediate
            const signedImm = (imm8 & 0x80) ? (imm8 | 0xFFFFFF00) : imm8;
            return `${prefix}${baseMnemonic.toLowerCase()} r${reg}, #${signedImm}`;
        }
        
        case OPCODES.JMP:
        case OPCODES.CALL: {
            const byte1 = vm.readByte(addr + 2);
            const byte2 = vm.readByte(addr + 3);
            const byte3 = vm.readByte(addr + 4);
            const targetAddr = byte1 | (byte2 << 8) | (byte3 << 16);
            return `${prefix}${baseMnemonic.toLowerCase()} 0x${targetAddr.toString(16)}`;
        }
        
        case OPCODES.LOAD:
        case OPCODES.STORE:
        case OPCODES.LOADB:
        case OPCODES.STOREB: {
            const regByte = vm.readByte(addr + 2);
            const offset = vm.readByte(addr + 3);
            const destSrc = regByte & 0xF;
            const base = regByte >> 4;
            
            if (offset === 0) {
                return `${prefix}${baseMnemonic.toLowerCase()} r${destSrc}, [r${base}]`;
            } else {
                // Sign extend offset
                const signedOffset = (offset & 0x80) ? (offset | 0xFFFFFF00) : offset;
                return `${prefix}${baseMnemonic.toLowerCase()} r${destSrc}, [r${base}+${signedOffset}]`;
            }
        }
        
        case OPCODES.ENTER: {
            const localsSize = vm.readWord16(addr + 2);
            return `${prefix}${baseMnemonic.toLowerCase()} #${localsSize}`;
        }
        
        case OPCODES.TRAP: {
            const trapNum = vm.readByte(addr + 2);
            return `${prefix}${baseMnemonic.toLowerCase()} #${trapNum}`;
        }
            
        default:
            return `db 0x${instruction16.toString(16).padStart(4, '0')}`;
    }
}

// Get instruction size based on opcode
function getInstructionSize(opcode) {
    switch (opcode) {
        case OPCODES.HALT:
        case OPCODES.SYSCALL:
        case OPCODES.RET:
        case OPCODES.RETI:
        case OPCODES.LEAVE:
            return 2;
            
        case OPCODES.LIMM:  // 32-bit immediate
        case OPCODES.JMP:   // 24-bit address
        case OPCODES.CALL:
            return 6;
            
        case OPCODES.MOVI:  // 16-bit immediate
        case OPCODES.MOVHI:
        case OPCODES.ENTER:
            return 4;
            
        default:
            return 4; // Most instructions with register operands
    }
}

// Enhanced disassembly function that handles variable-length instructions
function disassembleMemory(vm, addr, length) {
    const instructions = [];
    let currentAddr = addr;
    
    while (currentAddr < addr + length) {
        const instruction16 = vm.readWord16(currentAddr);
        const opcode = instruction16 & 0xFF;
        const instructionSize = getInstructionSize(opcode);
        
        instructions.push({
            address: currentAddr,
            hex: formatHex(vm, currentAddr, instructionSize),
            mnemonic: disassembleInstruction(vm, currentAddr, instruction16)
        });
        
        currentAddr += instructionSize;
    }
    
    return instructions;
}

// Format hex bytes for display
function formatHex(vm, addr, size) {
    let hex = '';
    for (let i = 0; i < size; i++) {
        if (i > 0) hex += ' ';
        hex += vm.readByte(addr + i).toString(16).padStart(2, '0');
    }
    return hex;
}

module.exports = { disassembleInstruction, disassembleMemory };
