// Command handlers for BURST REPL

const fs = require('fs');
const path = require('path');
const { BurstAssembler } = require('../burst-vm.js');
const { assembleInstruction } = require('./assembler-utils');
const { parseAddress, parseValue, parseRegister } = require('./expression-evaluator');

class CommandHandlers {
    constructor(repl) {
        this.repl = repl;
        this.vm = repl.vm;
        this.debugger = repl.debugger;
        this.assembler = repl.assembler;
    }
    
    getCommands() {
        return {
            help: this.cmdHelp.bind(this),
            run: this.cmdRun.bind(this),
            step: this.cmdStep.bind(this),
            continue: this.cmdContinue.bind(this),
            break: this.cmdBreak.bind(this),
            watch: this.cmdWatch.bind(this),
            info: this.cmdInfo.bind(this),
            print: this.cmdPrint.bind(this),
            set: this.cmdSet.bind(this),
            disasm: this.cmdDisasm.bind(this),
            load: this.cmdLoad.bind(this),
            save: this.cmdSave.bind(this),
            reset: this.cmdReset.bind(this),
            assemble: this.cmdAssemble.bind(this),
            quit: this.cmdQuit.bind(this),
            
            // Aliases
            h: this.cmdHelp.bind(this),
            r: this.cmdRun.bind(this),
            s: this.cmdStep.bind(this),
            c: this.cmdContinue.bind(this),
            b: this.cmdBreak.bind(this),
            w: this.cmdWatch.bind(this),
            i: this.cmdInfo.bind(this),
            p: this.cmdPrint.bind(this),
            d: this.cmdDisasm.bind(this),
            q: this.cmdQuit.bind(this),
        };
    }
    
    // Command: help
    cmdHelp(args) {
        if (args.length === 0) {
            console.log('Available commands:');
            console.log('  help [command]   - Show help');
            console.log('  run [file]       - Run program');
            console.log('  step [n]         - Step n instructions (default: 1)');
            console.log('  continue         - Continue execution');
            console.log('  break <addr>     - Set breakpoint');
            console.log('  watch <addr>     - Set watchpoint');
            console.log('  info <what>      - Show information (regs, mem, breaks)');
            console.log('  print <expr>     - Print expression value');
            console.log('  set <reg> <val>  - Set register value');
            console.log('  disasm [addr] [n]- Disassemble instructions');
            console.log('  load <file>      - Load program from file');
            console.log('  save <file>      - Save memory to file');
            console.log('  reset            - Reset VM state');
            console.log('  assemble <file>  - Assemble file');
            console.log('  quit             - Exit REPL');
            console.log('');
            console.log('You can also enter assembly instructions directly');
        } else {
            // Show detailed help for specific command
            const cmd = args[0].toLowerCase();
            const helpText = {
                run: 'run [file] - Run program from beginning or load and run file',
                step: 'step [n] - Execute n instructions (default: 1)',
                break: 'break <addr> - Set breakpoint at address (hex or decimal)',
                info: 'info <what> - Show information\n  regs - Show registers\n  mem - Show memory\n  breaks - Show breakpoints',
                // Add more detailed help...
            };
            console.log(helpText[cmd] || `No detailed help for: ${cmd}`);
        }
    }
    
    // Command: run
    cmdRun(args) {
        if (args.length > 0) {
            // Load and run file
            this.cmdLoad(args);
        }
        
        console.log('Running...');
        this.debugger.run();
        
        if (this.vm.halted) {
            console.log('Program halted');
        }
    }
    
    // Command: step
    cmdStep(args) {
        const count = args.length > 0 ? parseInt(args[0]) : 1;
        
        for (let i = 0; i < count; i++) {
            if (this.vm.halted) {
                console.log('Program halted');
                break;
            }
            
            const pc = this.vm.pc;
            const instruction = this.vm.readWord(pc);
            const disasm = this.repl.disassembleInstruction(pc, instruction);
            console.log(`0x${pc.toString(16).padStart(8, '0')}: ${disasm}`);
            
            this.vm.step();
        }
    }
    
    // Command: continue
    cmdContinue(args) {
        if (this.vm.halted) {
            console.log('Program already halted');
            return;
        }
        
        this.debugger.run();
    }
    
    // Command: break
    cmdBreak(args) {
        if (args.length === 0) {
            // List breakpoints
            this.debugger.listBreakpoints();
        } else {
            // Set/clear breakpoint
            const addr = parseAddress(args[0]);
            this.debugger.toggleBreakpoint(addr);
        }
    }
    
    // Command: watch
    cmdWatch(args) {
        if (args.length === 0) {
            // List watchpoints
            this.debugger.listWatchpoints();
        } else {
            // Set/clear watchpoint
            const addr = parseAddress(args[0]);
            this.debugger.toggleWatchpoint(addr);
        }
    }
    
    // Command: info
    cmdInfo(args) {
        if (args.length === 0) {
            console.log('Usage: info <regs|mem|breaks>');
            return;
        }
        
        switch (args[0].toLowerCase()) {
            case 'regs':
            case 'registers':
                this.vm.dumpRegisters();
                break;
                
            case 'mem':
            case 'memory':
                const addr = args.length > 1 ? parseAddress(args[1]) : this.vm.pc;
                const length = args.length > 2 ? parseInt(args[2]) : 64;
                this.vm.dumpMemory(addr, length);
                break;
                
            case 'breaks':
            case 'breakpoints':
                this.debugger.listBreakpoints();
                this.debugger.listWatchpoints();
                break;
                
            default:
                console.log(`Unknown info command: ${args[0]}`);
        }
    }
    
    // Command: print
    cmdPrint(args) {
        if (args.length === 0) {
            console.log('Usage: print <expression>');
            return;
        }
        
        const expr = args.join(' ');
        const { evaluateExpression } = require('./expression-evaluator');
        const value = evaluateExpression(this.vm, expr, this.debugger.symbols);
        console.log(`${expr} = 0x${value.toString(16)} (${value})`);
    }
    
    // Command: set
    cmdSet(args) {
        if (args.length < 2) {
            console.log('Usage: set <register> <value>');
            return;
        }
        
        const reg = parseRegister(args[0]);
        const value = parseValue(args[1]);
        
        if (reg === 'pc') {
            this.vm.pc = value;
        } else if (reg === 'sp') {
            this.vm.sp = value;
        } else if (reg.startsWith('r')) {
            const regNum = parseInt(reg.substr(1));
            this.vm.registers[regNum] = value;
        }
        
        console.log(`${reg} = 0x${value.toString(16)}`);
    }
    
    // Command: disasm
    cmdDisasm(args) {
        const addr = args.length > 0 ? parseAddress(args[0]) : this.vm.pc;
        const count = args.length > 1 ? parseInt(args[1]) : 10;
        
        let currentAddr = addr;
        for (let i = 0; i < count; i++) {
            const instruction = this.vm.readWord(currentAddr);
            const disasm = this.repl.disassembleInstruction(currentAddr, instruction);
            console.log(`0x${currentAddr.toString(16).padStart(8, '0')}: ${disasm}`);
            currentAddr += 4;
        }
    }
    
    // Command: load
    cmdLoad(args) {
        if (args.length === 0) {
            console.log('Usage: load <file>');
            return;
        }
        
        const filename = args[0];
        try {
            const data = fs.readFileSync(filename);
            this.vm.loadProgram(new Uint8Array(data));
            console.log(`Loaded ${data.length} bytes from ${filename}`);
        } catch (error) {
            console.error(`Failed to load file: ${error.message}`);
        }
    }
    
    // Command: save
    cmdSave(args) {
        if (args.length === 0) {
            console.log('Usage: save <file>');
            return;
        }
        
        const filename = args[0];
        try {
            fs.writeFileSync(filename, this.vm.memory);
            console.log(`Saved ${this.vm.memory.length} bytes to ${filename}`);
        } catch (error) {
            console.error(`Failed to save file: ${error.message}`);
        }
    }
    
    // Command: reset
    cmdReset(args) {
        this.repl.vm = this.vm = new (require('../burst-vm').BurstVM)();
        this.repl.debugger = this.debugger = new (require('./debugger').Debugger)(this.vm);
        this.debugger.reset();
        console.log('VM reset');
    }
    
    // Command: assemble
    async cmdAssemble(args) {
        if (args.length === 0) {
            console.log('Usage: assemble <file>');
            return;
        }
        
        const filename = args[0];
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
                currentAddress += calculateInstructionSize(trimmed);
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
                await processInstructionOrDirective(asm, trimmed);
            }
            
            // Get final program
            const program = asm.getProgram();
            
            // Output file
            const outFile = filename.replace(/\.[^.]+$/, '.bin');
            fs.writeFileSync(outFile, program);
            console.log(`Assembled ${filename} to ${outFile} (${program.length} bytes)`);
            
            // Option to load immediately
            if (args.includes('-l') || args.includes('--load')) {
                this.vm.loadProgram(program);
                console.log('Program loaded');
            }
        } catch (error) {
            console.error(`Assembly failed: ${error.message}`);
        }
    }
    
    // Command: quit
    cmdQuit(args) {
        this.repl.rl.close();
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
}

// Helper functions (moved from assembler-utils.js)
function calculateInstructionSize(trimmed) {
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
    } else if (firstWord) {  // Only if there's actually an instruction
        // Regular instruction - all instructions are 4 bytes
        return 4;
    }
    return 0;
}

async function processInstructionOrDirective(asm, trimmed) {
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

module.exports = CommandHandlers;
