// BURST VM REPL and Command Interpreter
// Interactive environment for BURST VM

const readline = require('readline');
const { BurstVM, BurstAssembler } = require('./burst-vm.js');
const CommandHandlers = require('./repl/command-handlers');
const { Debugger } = require('./repl/debugger');
const { disassembleInstruction } = require('./repl/disassembler');

// BURST REPL class
class BurstREPL {
    constructor() {
        this.vm = new BurstVM();
        this.assembler = new BurstAssembler();
        this.debugger = new Debugger(this.vm);
        
        // Command history
        this.history = [];
        this.historyIndex = 0;
        
        // Initialize readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'burst> ',
            completer: this.completer.bind(this)
        });
        
        // Initialize command handlers
        this.commandHandlers = new CommandHandlers(this);
        this.commands = this.commandHandlers.getCommands();
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
                await this.commandHandlers.parseAssemblyLine(line);
            } catch (error) {
                console.error(`Unknown command: ${cmd}`);
            }
        }
        
        this.rl.prompt();
    }
    
    // Tab completion
    completer(line) {
        const commands = Object.keys(this.commands);
        const hits = commands.filter(cmd => cmd.startsWith(line));
        return [hits.length ? hits : commands, line];
    }
    
    // Utility method for disassembly (used by command handlers)
    disassembleInstruction(addr, instruction) {
        return disassembleInstruction(this.vm, addr, instruction);
    }
}

// Start REPL if running directly
if (require.main === module) {
    const repl = new BurstREPL();
    repl.start();
}

// Export for use
module.exports = BurstREPL;
