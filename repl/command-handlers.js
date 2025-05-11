// Command handlers for BURST REPL - Updated with pagination for info

const fs = require('fs');
const path = require('path');
const { parseAddress, parseValue, parseRegister } = require('./expression-evaluator');
const helpSystem = require('./help-system');

class CommandHandlers {
    constructor(repl) {
        this.repl = repl;
        this.vm = repl.vm;
        this.debugger = repl.debugger;
        this.registerHelp();
    }
    
    registerHelp() {
        helpSystem.registerCommand('help', {
            description: 'Show help information',
            usage: 'help [command]',
            examples: [
                'help',
                'help run',
                'help load'
            ],
            category: 'General',
            aliases: ['h']
        });
        
        helpSystem.registerCommand('run', {
            description: 'Run program from beginning or load and run file',
            usage: 'run [file]',
            examples: [
                'run',
                'run program.bin'
            ],
            category: 'Execution',
            aliases: ['r']
        });
        
        helpSystem.registerCommand('step', {
            description: 'Execute n instructions',
            usage: 'step [n]',
            examples: [
                'step',
                'step 5'
            ],
            category: 'Execution',
            aliases: ['s']
        });
        
        helpSystem.registerCommand('continue', {
            description: 'Continue execution until breakpoint or halt',
            usage: 'continue',
            category: 'Execution',
            aliases: ['c']
        });
        
        helpSystem.registerCommand('break', {
            description: 'Set or list breakpoints',
            usage: 'break [address]',
            examples: [
                'break',
                'break 0x1000',
                'break 4096'
            ],
            category: 'Debugging',
            aliases: ['b']
        });
        
        helpSystem.registerCommand('watch', {
            description: 'Set or list watchpoints',
            usage: 'watch [address]',
            examples: [
                'watch',
                'watch 0x2000'
            ],
            category: 'Debugging',
            aliases: ['w']
        });
        
        helpSystem.registerCommand('info', {
            description: 'Show information about registers, memory, or breakpoints',
            usage: 'info <what>',
            examples: [
                'info regs',
                'info mem 0x1000',
                'info breaks'
            ],
            category: 'Inspection',
            aliases: ['i']
        });
        
        helpSystem.registerCommand('print', {
            description: 'Print value of expression',
            usage: 'print <expression>',
            examples: [
                'print r0',
                'print [0x1000]',
                'print pc'
            ],
            category: 'Inspection',
            aliases: ['p']
        });
        
        helpSystem.registerCommand('set', {
            description: 'Set register value',
            usage: 'set <register> <value>',
            examples: [
                'set r0 0x1234',
                'set pc 0x1000',
                'set sp 0x8000'
            ],
            category: 'Modification'
        });
        
        helpSystem.registerCommand('disasm', {
            description: 'Disassemble instructions',
            usage: 'disasm [address] [count]',
            examples: [
                'disasm',
                'disasm 0x1000',
                'disasm 0x1000 20'
            ],
            category: 'Inspection',
            aliases: ['d']
        });
        
        helpSystem.registerCommand('load', {
            description: 'Load program from file',
            usage: 'load <file>',
            examples: [
                'load program.bin',
                'load ../tests/test1.bin'
            ],
            category: 'File Operations'
        });
        
        helpSystem.registerCommand('save', {
            description: 'Save memory to file',
            usage: 'save <file>',
            examples: [
                'save memory.bin',
                'save dump.bin'
            ],
            category: 'File Operations'
        });
        
        helpSystem.registerCommand('reset', {
            description: 'Reset the virtual machine state',
            usage: 'reset',
            category: 'General'
        });
        
        helpSystem.registerCommand('quit', {
            description: 'Exit the REPL',
            usage: 'quit',
            category: 'General',
            aliases: ['q', 'exit']
        });
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
            exit: this.cmdQuit.bind(this),
        };
    }
    
    // Command: help
    async cmdHelp(args) {
        await helpSystem.showHelp(args);
    }
    
    // Command: run  
    async cmdRun(args) {
        if (args.length > 0) {
            // Load and run file
            await this.cmdLoad(args);
        }
        
        console.log('Running...');
        this.debugger.run();
        
        if (this.vm.halted) {
            console.log('Program halted');
        }
    }
    
    // Command: step
    async cmdStep(args) {
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
    async cmdContinue(args) {
        if (this.vm.halted) {
            console.log('Program already halted');
            return;
        }
        
        this.debugger.run();
    }
    
    // Command: break
    async cmdBreak(args) {
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
    async cmdWatch(args) {
        if (args.length === 0) {
            // List watchpoints
            this.debugger.listWatchpoints();
        } else {
            // Set/clear watchpoint
            const addr = parseAddress(args[0]);
            this.debugger.toggleWatchpoint(addr);
        }
    }
    
    // Command: info - Updated with pagination
    async cmdInfo(args) {
        if (args.length === 0) {
            console.log('Usage: info <regs|mem|breaks>');
            return;
        }
        
        switch (args[0].toLowerCase()) {
            case 'regs':
            case 'registers':
                // For registers, use direct output (usually short)
                this.vm.dumpRegisters();
                break;
                
            case 'mem':
            case 'memory':
                // For memory, collect lines and paginate if needed
                const addr = args.length > 1 ? parseAddress(args[1]) : this.vm.pc;
                const length = args.length > 2 ? parseInt(args[2]) : 64;
                
                // Capture memory dump output
                const originalConsoleLog = console.log;
                const lines = [];
                console.log = (line) => lines.push(line);
                
                try {
                    this.vm.dumpMemory(addr, length);
                } finally {
                    console.log = originalConsoleLog;
                }
                
                // Use pagination if needed
                if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                    await this.repl.pager.paginate(lines, this.repl.rl);
                } else {
                    console.log(lines.join('\n'));
                }
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
    async cmdPrint(args) {
        if (args.length === 0) {
            console.log('Usage: print <expression>');
            return;
        }
        
        const expr = args.join(' ');
        const { evaluateExpression } = require('./expression-evaluator');
        try {
            const value = evaluateExpression(this.vm, expr, this.debugger.symbols);
            console.log(`${expr} = 0x${value.toString(16)} (${value})`);
        } catch (error) {
            console.error(`Error evaluating expression: ${error.message}`);
        }
    }
    
    // Command: set
    async cmdSet(args) {
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
            if (regNum >= 0 && regNum < 16) {
                this.vm.registers[regNum] = value;
            } else {
                console.error(`Invalid register number: ${regNum}`);
                return;
            }
        } else {
            console.error(`Unknown register: ${reg}`);
            return;
        }
        
        console.log(`${reg} = 0x${value.toString(16)}`);
    }
    
    // Command: disasm
    async cmdDisasm(args) {
        const addr = args.length > 0 ? parseAddress(args[0]) : this.vm.pc;
        const count = args.length > 1 ? parseInt(args[1]) : 10;
        
        const lines = [];
        let currentAddr = addr;
        for (let i = 0; i < count; i++) {
            const instruction = this.vm.readWord(currentAddr);
            const disasm = this.repl.disassembleInstruction(currentAddr, instruction);
            lines.push(`0x${currentAddr.toString(16).padStart(8, '0')}: ${disasm}`);
            currentAddr += 4;
        }
        
        // Use pagination for disassembly
        if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
            await this.repl.pager.paginate(lines, this.repl.rl);
        } else {
            console.log(lines.join('\n'));
        }
    }
    
    // Command: load
    async cmdLoad(args) {
        if (args.length === 0) {
            console.log('Usage: load <file>');
            return;
        }
        
        const filename = this.repl.getAbsolutePath(args[0]);
        try {
            const data = fs.readFileSync(filename);
            this.vm.loadProgram(new Uint8Array(data));
            console.log(`Loaded ${data.length} bytes from ${args[0]}`);
        } catch (error) {
            console.error(`Failed to load file: ${error.message}`);
        }
    }
    
    // Command: save 
    async cmdSave(args) {
        if (args.length === 0) {
            console.log('Usage: save <file>');
            return;
        }
        
        const filename = this.repl.getAbsolutePath(args[0]);
        try {
            fs.writeFileSync(filename, this.vm.memory);
            console.log(`Saved ${this.vm.memory.length} bytes to ${args[0]}`);
        } catch (error) {
            console.error(`Failed to save file: ${error.message}`);
        }
    }
    
    // Command: reset
    async cmdReset(args) {
        const { BurstVM } = require('../burst-vm');
        const { Debugger } = require('./debugger');
        
        this.repl.vm = this.vm = new BurstVM();
        this.repl.debugger = this.debugger = new Debugger(this.vm);
        console.log('VM reset');
    }
    
    // Command: quit
    async cmdQuit(args) {
        if (this.repl.rl) {
            this.repl.rl.close();
        }
    }
}

module.exports = CommandHandlers;
