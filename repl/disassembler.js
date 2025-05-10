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
            return mnemonic.toLowerCase();
            
        case OPCODES.PUSH:
        case OPCODES.POP:
        case OPCODES.INC:
        case OPCODES.DEC:
        case OPCODES.NEG:
        case OPCODES.NOT:
            return `${mnemonic.toLowerCase()} r${(operands >> 16) & 0xF}`;
            
        case OPCODES.MOV:
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
            
        default:
            return `db 0x${instruction.toString(16).padStart(8, '0')}`;
    }
}

module.exports = { disassembleInstruction };
