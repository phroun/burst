// Assembly line parser utility
// Extracted from assembly-commands.js to support direct assembly instruction input

const { BurstAssembler } = require('../burst-vm.js');
const { assembleInstruction } = require('./assembler-utils');

class AssemblyParser {
    constructor(vm) {
        this.vm = vm;
    }
    
    // Parse assembly line directly
    async parseAssemblyLine(line) {
        // Create temporary assembler
        const asm = new BurstAssembler();
        
        // Assemble at current PC
        asm.address = this.vm.pc;
        
        // Parse and assemble instruction
        const parts = line.trim().split(/\s+/);
        const mnemonic = parts[0];
        
        // Parse operands
        const operandString = parts.slice(1).join(' ');
        let operands = [];
        
        if (operandString) {
            // Split by comma, preserving empty operands
            operands = operandString.split(',');
            
            // Handle the case where someone forgot commas
            if (operands.length === 1 && operands[0].includes(' ') && !operands[0].includes('#')) {
                // Likely missing commas between operands
                const spaceParts = operands[0].split(/\s+/);
                if (spaceParts.length > 1) {
                    // Re-parse as separate words
                    operands = spaceParts;
                }
            }
            
            operands = operands.map(s => s.trim());
        }
        
        // Assemble instruction
        await assembleInstruction(asm, mnemonic, operands);
        
        // Get instruction bytes
        const program = asm.getProgram();
        
        // Write to current PC
        for (let i = 0; i < program.length; i++) {
            this.vm.writeByte(this.vm.pc + i, program[i]);
        }
        
        console.log(`Assembled at 0x${this.vm.pc.toString(16)}`);
        this.vm.pc += program.length;
    }
    
    // Check if a line looks like an assembly instruction
    static isAssemblyInstruction(line) {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0) return false;
        
        const firstWord = parts[0].toLowerCase();
        
        // List of known assembly mnemonics
        const mnemonics = [
            'mov', 'add', 'sub', 'mul', 'div', 'and', 'or', 'xor', 'not',
            'shl', 'shr', 'cmp', 'jmp', 'je', 'jne', 'jl', 'jle', 'jg', 'jge',
            'call', 'ret', 'push', 'pop', 'nop', 'hlt', 'ldr', 'str', 'in', 'out'
        ];
        
        return mnemonics.includes(firstWord);
    }
}

module.exports = AssemblyParser;
