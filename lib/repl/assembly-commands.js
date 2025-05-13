// Assembly commands for BURST REPL - Updated for new 16-bit ISA

const fs = require('fs');
const path = require('path');
const BurstAssembler = require('../burst-assembler.js');
const { OPCODES } = require('../burst-isa.js');
const { assembleInstruction, parseConditionPrefix } = require('./assembler-utils');
const helpSystem = require('./help-system');

class AssemblyCommands {
    constructor(repl) {
        this.repl = repl;
        this.vm = repl.vm;
        this.registerHelp();
    }
    
    registerHelp() {
        helpSystem.registerCommand('assemble', {
            description: 'Assemble a BURST assembly file',
            usage: 'assemble <file> [options]',
            examples: [
                'assemble program.asm',
                'assemble program.asm -l    # Load after assembly'
            ],
            category: 'Assembly',
            aliases: ['asm']
        });
    }
    
    getCommands() {
        return {
            assemble: this.cmdAssemble.bind(this),
            asm: this.cmdAssemble.bind(this), // Alias
        };
    }
    
    // Command: assemble
    async cmdAssemble(args) {
        if (args.length === 0) {
            console.log('Usage: assemble <file>');
            return;
        }
        
        const filename = this.repl.getAbsolutePath(args[0]);
        try {
            const source = fs.readFileSync(filename, 'utf8');
            const lines = source.split('\n');
            
            // Create a new assembler for this file
            const asm = new BurstAssembler();
            
            // Reset the address
            asm.address = 0;
            asm.output = [];
            asm.labels.clear();
            asm.pendingLabels = [];

            // First pass: collect all labels
            let currentAddress = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(';')) continue;
                
                // Check for label (could be on same line as instruction/directive)
                if (trimmed.includes(':')) {
                    const colonIndex = trimmed.indexOf(':');
                    const labelName = trimmed.substring(0, colonIndex).trim();
                    if (labelName) {
                        // Check for spaces in label name
                        if (labelName.includes(' ')) {
                            throw new Error(`Invalid syntax`);
                        }
                        asm.labels.set(labelName, currentAddress);
                    }
                    // Continue processing the rest of the line after the label
                    trimmed = trimmed.substring(colonIndex + 1).trim();
                    if (!trimmed) continue; // Nothing after the label
                }
                
                // Calculate size
                currentAddress += this.calculateInstructionSize(trimmed);
            }
            
            // Debug: Show collected labels
            console.log('Labels found:', Object.fromEntries(asm.labels));
            
            // Second pass: generate code
            asm.address = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(';')) continue;
                
                // Skip labels (already processed) but check for same-line content
                if (trimmed.includes(':')) {
                    const colonIndex = trimmed.indexOf(':');
                    const afterLabel = trimmed.substring(colonIndex + 1).trim();
                    if (!afterLabel) {
                        continue; // Just a label, nothing else
                    }
                    trimmed = afterLabel; // Process what comes after the label
                }
                
                // Process instruction or directive
                await this.processInstructionOrDirective(asm, trimmed);
            }
            
            // Get final program
            const program = asm.getProgram();
            
            // Output file
            const outFile = filename.replace(/\.[^.]+$/, '.bin');
            fs.writeFileSync(outFile, program);
            console.log(`Assembled ${path.basename(filename)} to ${path.basename(outFile)} (${program.length} bytes)`);
            
            // Option to load immediately
            if (args.includes('-l') || args.includes('--load')) {
                this.vm.loadProgram(program);
                console.log('Program loaded');
            }
        } catch (error) {
            console.error(`Assembly failed: ${error.message}`);
        }
    }
    
    // Parse assembly line directly (for REPL input)
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
    
    // Helper function for calculating instruction size
    calculateInstructionSize(trimmed) {
        const parts = trimmed.split(/\s+/);
        const firstWord = parts[0].toLowerCase();
        
        if (firstWord.startsWith('.')) {
            // Handle directives
            const directive = firstWord;
            const args = parts.slice(1).join(' ');
            
            switch (directive) {
                case '.string':
                case '.ascii':
                    const match = args.match(/^"([^"]*)"/);
                    if (match) {
                        // Process escape sequences to get actual length
                        let str = match[1];
                        str = str.replace(/\\n/g, '\n')
                                 .replace(/\\r/g, '\r')
                                 .replace(/\\t/g, '\t')
                                 .replace(/\\"/g, '"')
                                 .replace(/\\\\/g, '\\');
                        return str.length;
                    }
                    return 0;
                case '.byte':
                case '.db':
                    const byteArgs = args.split(',').map(s => s.trim());
                    return byteArgs.length;
                case '.word':
                case '.dw':
                    const wordArgs = args.split(',').map(s => s.trim());
                    return wordArgs.length * 4;
                case '.space':
                case '.skip':
                    return parseInt(args) || 0;
                default:
                    return 0;
            }
        } else if (firstWord) {
            // Parse condition prefix to get base mnemonic
            const parsed = parseConditionPrefix(firstWord);
            if (!parsed) return 0;
            
            const { mnemonic } = parsed;
            
            // Get opcode to determine instruction size
            const opcode = OPCODES[mnemonic.toUpperCase()];
            if (opcode === undefined) return 0;
            
            // Use the same size calculation as the VM
            switch (opcode) {
                case OPCODES.NOP:
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
        return 0;
    }
    
    // Helper function for processing instructions and directives
    async processInstructionOrDirective(asm, trimmed) {
        const parts = trimmed.split(/\s+/);
        const firstWord = parts[0].toLowerCase();
        
        // Handle directives
        if (firstWord.startsWith('.')) {
            const directive = firstWord;
            const args = parts.slice(1).join(' ');
            
            switch (directive) {
                case '.string':
                case '.ascii':
                    // Parse string literal
                    const match = args.match(/^"([^"]*)"/);
                    if (match) {
                        let str = match[1];
                        // Process escape sequences
                        str = str.replace(/\\n/g, '\n')
                                 .replace(/\\r/g, '\r')
                                 .replace(/\\t/g, '\t')
                                 .replace(/\\"/g, '"')
                                 .replace(/\\\\/g, '\\');
                        asm.string(str);
                    } else {
                        throw new Error(`Invalid string literal: ${args}`);
                    }
                    break;

                case '.byte':
                case '.db':
                    // Parse byte values
                    const byteArgs = args.split(',').map(s => {
                        const val = s.trim();
                        let parsed;
                        if (val.startsWith('0x')) {
                            parsed = parseInt(val, 16);
                        } else {
                            parsed = parseInt(val);
                        }
                        if (isNaN(parsed)) {
                            throw new Error(`Invalid byte value: ${val}`);
                        }
                        return parsed;
                    });
                    asm.data(byteArgs);
                    break;
                    
                case '.word':
                case '.dw':
                    // Parse word values
                    const words = args.split(',').map(s => {
                        const val = s.trim();
                        if (val.startsWith('0x')) {
                            return parseInt(val, 16);
                        } else {
                            return parseInt(val);
                        }
                    });
                    // Convert words to bytes
                    const wordBytes = [];
                    words.forEach(word => {
                        wordBytes.push(word & 0xFF);
                        wordBytes.push((word >> 8) & 0xFF);
                        wordBytes.push((word >> 16) & 0xFF);
                        wordBytes.push((word >> 24) & 0xFF);
                    });
                    asm.data(wordBytes);
                    break;
                    
                case '.space':
                case '.skip':
                    // Reserve space
                    const sizeStr = args.trim();
                    if (!sizeStr) {
                        throw new Error(`Invalid space size`);
                    }
                    const size = parseInt(sizeStr);
                    if (isNaN(size)) {
                        throw new Error(`Invalid space size: ${sizeStr}`);
                    }
                    asm.data(new Array(size).fill(0));
                    break;
                    
                default:
                    throw new Error(`Unknown directive: ${directive}`);
            }
       } else {
            // Regular instruction
            let instructionLine = parts.join(' ');
            
            // Remove comments BEFORE parsing the instruction
            const commentIndex = instructionLine.indexOf(';');
            if (commentIndex !== -1) {
                instructionLine = instructionLine.substring(0, commentIndex).trim();
            }
            
            // Re-parse without comments
            const instructionParts = instructionLine.split(/\s+/);
            const mnemonic = instructionParts[0];
            
            // Parse operands, splitting by comma and trimming each operand
            const operandString = instructionParts.slice(1).join(' ');
            let operands = [];

            if (operandString.trim()) {
                // Split by comma but be careful with empty operands
                operands = operandString.split(',').map(s => s.trim());
                
                // Check for empty operands after splitting
                for (let i = 0; i < operands.length; i++) {
                    if (operands[i] === '') {
                        operands[i] = ''; // Keep empty strings to trigger validation errors
                    }
                }
            }
            
            await assembleInstruction(asm, mnemonic, operands);
        }
    }
}

module.exports = AssemblyCommands;
