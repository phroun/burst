// BURST VM REPL and Command Interpreter
// Interactive environment for BURST VM

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { BurstVM, BurstAssembler, OPCODES, SYSCALLS } = require('./burst-vm.js');

// BURST REPL class
class BurstREPL {
    constructor() {
        this.vm = new BurstVM();
        this.assembler = new BurstAssembler();
        this.breakpoints = new Set();
        this.watchpoints = new Map();
        this.running = false;
        this.stepping = false;
        
        // Command history
        this.history = [];
        this.historyIndex = 0;
        
        // Symbol table for debugging
        this.symbols = new Map();
        
        // Initialize readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'burst> ',
            completer: this.completer.bind(this)
        });
        
        // Command handlers
        this.commands = {
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
    
    // Start the REPL
    start() {
        console.log('BURST Virtual Machine REPL v1.0');
        console.log('Type "help" for commands');
        console.log('');
        
        this.rl.prompt();
        
        this.rl.on('line', (line) => {
            this.handleCommand(line.trim());
        });
        
        this.rl.on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });
    }
    
    // Handle command input
    async handleCommand(line) {
        if (!line) {
            this.rl.prompt();
            return;
        }
        
        // Add to history
        this.history.push(line);
        this.historyIndex = this.history.length;
        
        // Parse command and arguments
        const parts = line.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Execute command
        if (this.commands[cmd]) {
            try {
                await this.commands[cmd](args);
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
        } else {
            // Try to parse as assembly instruction
            try {
                this.parseAssemblyLine(line);
            } catch (error) {
                console.error(`Unknown command: ${cmd}`);
            }
        }
        
        this.rl.prompt();
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
        
        this.running = true;
        console.log('Running...');
        
        while (this.running && !this.vm.halted) {
            const pc = this.vm.pc;
            
            // Check breakpoints
            if (this.breakpoints.has(pc)) {
                console.log(`Breakpoint at 0x${pc.toString(16)}`);
                this.running = false;
                break;
            }
            
            // Check watchpoints
            for (const [addr, oldValue] of this.watchpoints) {
                const newValue = this.vm.readWord(addr);
                if (newValue !== oldValue) {
                    console.log(`Watchpoint: [0x${addr.toString(16)}] changed from 0x${oldValue.toString(16)} to 0x${newValue.toString(16)}`);
                    this.watchpoints.set(addr, newValue);
                    this.running = false;
                    break;
                }
            }
            
            this.vm.step();
        }
        
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
            const disasm = this.disassembleInstruction(pc, instruction);
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
        
        this.running = true;
        this.cmdRun([]);
    }
    
    // Command: break
    cmdBreak(args) {
        if (args.length === 0) {
            // List breakpoints
            if (this.breakpoints.size === 0) {
                console.log('No breakpoints set');
            } else {
                console.log('Breakpoints:');
                for (const addr of this.breakpoints) {
                    console.log(`  0x${addr.toString(16)}`);
                }
            }
        } else {
            // Set/clear breakpoint
            const addr = this.parseAddress(args[0]);
            if (this.breakpoints.has(addr)) {
                this.breakpoints.delete(addr);
                console.log(`Breakpoint cleared at 0x${addr.toString(16)}`);
            } else {
                this.breakpoints.add(addr);
                console.log(`Breakpoint set at 0x${addr.toString(16)}`);
            }
        }
    }
    
    // Command: watch
    cmdWatch(args) {
        if (args.length === 0) {
            // List watchpoints
            if (this.watchpoints.size === 0) {
                console.log('No watchpoints set');
            } else {
                console.log('Watchpoints:');
                for (const [addr, value] of this.watchpoints) {
                    console.log(`  0x${addr.toString(16)}: 0x${value.toString(16)}`);
                }
            }
        } else {
            // Set/clear watchpoint
            const addr = this.parseAddress(args[0]);
            if (this.watchpoints.has(addr)) {
                this.watchpoints.delete(addr);
                console.log(`Watchpoint cleared at 0x${addr.toString(16)}`);
            } else {
                const value = this.vm.readWord(addr);
                this.watchpoints.set(addr, value);
                console.log(`Watchpoint set at 0x${addr.toString(16)}`);
            }
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
                const addr = args.length > 1 ? this.parseAddress(args[1]) : this.vm.pc;
                const length = args.length > 2 ? parseInt(args[2]) : 64;
                this.vm.dumpMemory(addr, length);
                break;
                
            case 'breaks':
            case 'breakpoints':
                this.cmdBreak([]);
                this.cmdWatch([]);
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
        const value = this.evaluateExpression(expr);
        console.log(`${expr} = 0x${value.toString(16)} (${value})`);
    }
    
    // Command: set
    cmdSet(args) {
        if (args.length < 2) {
            console.log('Usage: set <register> <value>');
            return;
        }
        
        const reg = this.parseRegister(args[0]);
        const value = this.parseValue(args[1]);
        
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
        const addr = args.length > 0 ? this.parseAddress(args[0]) : this.vm.pc;
        const count = args.length > 1 ? parseInt(args[1]) : 10;
        
        let currentAddr = addr;
        for (let i = 0; i < count; i++) {
            const instruction = this.vm.readWord(currentAddr);
            const disasm = this.disassembleInstruction(currentAddr, instruction);
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
        this.vm = new BurstVM();
        this.breakpoints.clear();
        this.watchpoints.clear();
        this.running = false;
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
                        asm.labels.set(labelName, currentAddress);
                    }
                    // Continue processing the rest of the line after the label
                    trimmed = trimmed.substring(colonIndex + 1).trim();
                    if (!trimmed) continue; // Nothing after the label
                }
                
                // Parse instruction or directive to calculate size
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
                                currentAddress += match[1].length;
                            }
                            break;
                        case '.byte':
                        case '.db':
                            const byteArgs = args.split(',').map(s => s.trim());
                            currentAddress += byteArgs.length;
                            break;
                        case '.word':
                        case '.dw':
                            const wordArgs = args.split(',').map(s => s.trim());
                            currentAddress += wordArgs.length * 4;
                            break;
                        case '.space':
                        case '.skip':
                            currentAddress += parseInt(args);
                            break;
                    }
                } else {
                    // Regular instruction - all instructions are 4 bytes
                    currentAddress += 4;
                }
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
                
                // Parse instruction or directive
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
                                asm.string(match[1]);
                            } else {
                                throw new Error(`Invalid string literal at line ${i + 1}: ${args}`);
                            }
                            break;
                            
                        case '.byte':
                        case '.db':
                            // Parse byte values
                            const bytes = args.split(',').map(s => {
                                const val = s.trim();
                                if (val.startsWith('0x')) {
                                    return parseInt(val, 16);
                                } else {
                                    return parseInt(val);
                                }
                            });
                            asm.data(bytes);
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
                            const size = parseInt(args);
                            asm.data(new Array(size).fill(0));
                            break;
                            
                        default:
                            throw new Error(`Unknown directive: ${directive} at line ${i + 1}`);
                    }
                } else {
                    // Regular instruction
                    const mnemonic = firstWord;
                    let instructionLine = parts.join(' ');
                    // Remove comments
                    const commentIndex = instructionLine.indexOf(';');
                    if (commentIndex !== -1) {
                        instructionLine = instructionLine.substring(0, commentIndex).trim();
                    }
                    
                    // Re-parse without comments
                    const instructionParts = instructionLine.split(/\s+/);
                    const operands = instructionParts.slice(1).join(' ').split(',').map(s => s.trim());
                    
                    await this.assembleInstruction(asm, mnemonic, operands);
                }
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
        this.rl.close();
    }
    
    // Parse assembly line directly
    parseAssemblyLine(line) {
        const parts = line.trim().split(/\s+/);
        const mnemonic = parts[0].toLowerCase();
        const operands = parts.slice(1).join(' ').split(',').map(s => s.trim());
        
        // Create temporary assembler
        const asm = new BurstAssembler();
        
        // Assemble at current PC
        asm.address = this.vm.pc;
        
        // Assemble instruction
        this.assembleInstruction(asm, mnemonic, operands);
        
        // Get instruction bytes
        const program = asm.getProgram();
        
        // Write to current PC
        for (let i = 0; i < program.length; i++) {
            this.vm.writeByte(this.vm.pc + i, program[i]);
        }
        
        console.log(`Assembled at 0x${this.vm.pc.toString(16)}`);
        this.vm.pc += program.length;
    }
    
    // Assemble a single instruction
    assembleInstruction(asm, mnemonic, operands) {
        // Parse operands
        const parsedOps = operands.map(op => {
            if (!op) return 0;
            
            // Remove whitespace and comments
            op = op.trim();
            const commentIndex = op.indexOf(';');
            if (commentIndex !== -1) {
                op = op.substring(0, commentIndex).trim();
            }
            
            if (op.match(/^r\d+$/i)) {
                // Register
                return parseInt(op.substr(1));
            } else if (op.startsWith('#')) {
                // Immediate value
                const val = op.substr(1);
                
                // Check if it's a label reference
                if (asm.labels.has(val)) {
                    return asm.labels.get(val);
                }
                
                // Try to parse as a number
                if (val.startsWith('0x')) {
                    return parseInt(val, 16);
                } else if (val.match(/^-?\d+$/)) {
                    return parseInt(val);
                } else {
                    // Label that should have been resolved
                    throw new Error(`Undefined label: ${val}`);
                }
            } else if (op.match(/^\[.*\]$/)) {
                // Memory addressing [reg] or [reg+offset]
                const inner = op.slice(1, -1);
                const parts = inner.split('+').map(p => p.trim());
                
                if (parts.length === 1) {
                    // [reg]
                    if (parts[0].match(/^r\d+$/i)) {
                        return { type: 'mem', reg: parseInt(parts[0].substr(1)), offset: 0 };
                    }
                } else if (parts.length === 2) {
                    // [reg+offset]
                    if (parts[0].match(/^r\d+$/i)) {
                        const reg = parseInt(parts[0].substr(1));
                        const offset = parseInt(parts[1]);
                        return { type: 'mem', reg, offset };
                    }
                }
                throw new Error(`Invalid memory addressing: ${op}`);
            } else if (op.match(/^\d+$/)) {
                // Decimal number
                return parseInt(op);
            } else if (op.match(/^0x[0-9a-f]+$/i)) {
                // Hex number
                return parseInt(op, 16);
            } else if (op.match(/^-\d+$/)) {
                // Negative decimal
                return parseInt(op);
            } else {
                // Direct label reference (used in jumps)
                if (asm.labels.has(op)) {
                    return asm.labels.get(op);
                } else {
                    // Label that should have been resolved
                    throw new Error(`Undefined label: ${op}`);
                }
            }
        });
        
        // Handle memory addressing for load/store
        const handleMemoryInstruction = (inst, parsedOps) => {
            if (parsedOps[1] && typeof parsedOps[1] === 'object' && parsedOps[1].type === 'mem') {
                // Memory addressing with offset
                inst(parsedOps[0], parsedOps[1].reg, parsedOps[1].offset);
            } else {
                // Regular addressing
                inst(parsedOps[0], parsedOps[1], parsedOps[2] || 0);
            }
        };
        
        // Call appropriate assembler method
        switch (mnemonic) {
            case 'nop': asm.nop(); break;
            case 'halt': asm.halt(); break;
            case 'push': asm.push(parsedOps[0]); break;
            case 'pop': asm.pop(parsedOps[0]); break;
            case 'mov': asm.mov(parsedOps[0], parsedOps[1]); break;
            case 'movi': asm.movi(parsedOps[0], parsedOps[1]); break;
            case 'add': asm.add(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'sub': asm.sub(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'mul': asm.mul(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'div': asm.div(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'mod': asm.mod(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'and': asm.and(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'or': asm.or(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'xor': asm.xor(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'not': asm.not(parsedOps[0]); break;
            case 'shl': asm.shl(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'shr': asm.shr(parsedOps[0], parsedOps[1], parsedOps[2]); break;
            case 'inc': asm.inc(parsedOps[0]); break;
            case 'dec': asm.dec(parsedOps[0]); break;
            case 'neg': asm.neg(parsedOps[0]); break;
            case 'cmp': asm.cmp(parsedOps[0], parsedOps[1]); break;
            case 'jmp': asm.jmp(parsedOps[0]); break;
            case 'jz': asm.jz(parsedOps[0]); break;
            case 'jnz': asm.jnz(parsedOps[0]); break;
            case 'jeq': asm.jeq(parsedOps[0]); break;
            case 'jne': asm.jne(parsedOps[0]); break;
            case 'jlt': asm.jlt(parsedOps[0]); break;
            case 'jgt': asm.jgt(parsedOps[0]); break;
            case 'jle': asm.jle(parsedOps[0]); break;
            case 'jge': asm.jge(parsedOps[0]); break;
            case 'call': asm.call(parsedOps[0]); break;
            case 'ret': asm.ret(); break;
            case 'syscall': asm.syscall(); break;
            case 'load': handleMemoryInstruction(asm.load.bind(asm), parsedOps); break;
            case 'store': handleMemoryInstruction(asm.store.bind(asm), parsedOps); break;
            case 'loadb': handleMemoryInstruction(asm.loadb.bind(asm), parsedOps); break;
            case 'storeb': handleMemoryInstruction(asm.storeb.bind(asm), parsedOps); break;
            default:
                throw new Error(`Unknown mnemonic: ${mnemonic}`);
        }
    }
    
    // Disassemble instruction
    disassembleInstruction(addr, instruction) {
        const { opcode, operands } = this.vm.decode(instruction);
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
    
    // Helper functions
    parseAddress(str) {
        if (str.startsWith('0x')) {
            return parseInt(str, 16);
        } else {
            return parseInt(str);
        }
    }
    
    parseValue(str) {
        if (str.startsWith('0x')) {
            return parseInt(str, 16);
        } else if (str.startsWith("'") && str.endsWith("'")) {
            return str.charCodeAt(1);
        } else {
            return parseInt(str);
        }
    }
    
    parseRegister(str) {
        return str.toLowerCase();
    }
    
    evaluateExpression(expr) {
        // Simple expression evaluator
        // Supports: registers, memory access, constants
        
        if (expr.match(/^r\d+$/i)) {
            // Register
            const regNum = parseInt(expr.substr(1));
            return this.vm.registers[regNum];
        } else if (expr === 'pc') {
            return this.vm.pc;
        } else if (expr === 'sp') {
            return this.vm.sp;
        } else if (expr.match(/^\[.+\]$/)) {
            // Memory access
            const inner = expr.slice(1, -1);
            const addr = this.evaluateExpression(inner);
            return this.vm.readWord(addr);
        } else if (expr.startsWith('0x')) {
            // Hex constant
            return parseInt(expr, 16);
        } else {
            // Decimal constant or symbol
            const value = parseInt(expr);
            if (!isNaN(value)) {
                return value;
            }
            
            // Check symbols
            if (this.symbols.has(expr)) {
                return this.symbols.get(expr);
            }
            
            throw new Error(`Unknown expression: ${expr}`);
        }
    }
    
    // Tab completion
    completer(line) {
        const commands = Object.keys(this.commands);
        const hits = commands.filter(cmd => cmd.startsWith(line));
        return [hits.length ? hits : commands, line];
    }
}

// Start REPL if running directly
if (require.main === module) {
    const repl = new BurstREPL();
    repl.start();
}

// Export for use
module.exports = BurstREPL;
