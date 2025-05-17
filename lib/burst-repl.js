// BURST VM REPL and Command Interpreter
// Interactive environment for BURST VM - Fully decoupled version

const readline = require('readline');
const PlatformUtils = require('./repl/utils/platform-utils');
const { Pager } = require('./repl/utils/pager');
const helpSystem = require('./repl/utils/help-system');
const { createCompleter } = require('./repl/utils/completer');
const { formatPrompt } = require('./repl/utils/prompt-formatter');
const path = require('path');
const os = require('os');

// Command system import
const ReplCommands = require('./repl/repl-commands');

// Interfaces
const AssemblerInterface = require('./repl/interfaces/assembler-interface');
const VMInterface = require('./repl/interfaces/vm-interface');
const DisassemblerInterface = require('./repl/interfaces/disassembler-interface');
const { Debugger } = require('./repl/utils/debugger');

// Optional legacy VM for backward compatibility
let BurstVM = null;
try {
    BurstVM = require('./burst-vm.js');
} catch (error) {
    // No legacy VM available, that's fine
}

// BURST REPL class
class BurstREPL {
    constructor() {
        // Initialize interfaces
        this.vmInterface = new VMInterface();
        this.assemblerInterface = new AssemblerInterface();
        this.disassemblerInterface = new DisassemblerInterface();
        
        // Try to connect legacy VM if available
        if (BurstVM) {
            this.connectLegacyVM();
        }
        
        // Command history
        this.history = [];
        this.historyIndex = 0;
        
        // Load config early to get aliases
        this.config = PlatformUtils.loadConfig();
        
        // Save the original working directory
        this.originalCwd = process.cwd();
        
        // Create debugger instance that uses the VM interface
        this.debugger = new Debugger(this.vmInterface);
        
        // Initialize command system
        this.replCommands = new ReplCommands(this);
        this.commands = this.replCommands.getCommands();
        
        // Get the command loader reference
        this.commandLoader = this.replCommands.commandLoader;
        
        // Initialize pager
        this.pager = new Pager(this.replCommands.getPagerOptions());
        
        // Set pager in help system
        helpSystem.setPager(this.pager);
        helpSystem.setRepl(this);
        
        // Create the completer function
        this.completerFn = createCompleter(this);
        
        // Initialize readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: formatPrompt(this.originalCwd, this.originalCwd, this.replCommands),
            completer: this.completerFn,
            terminal: true
        });
        
        // Make shell commands current working directory available
        this.cwd = this.commandLoader.cwd;
        this.getAbsolutePath = this.commandLoader.getAbsolutePath.bind(this.commandLoader);
    }
    
    // Connect legacy VM for backward compatibility
    connectLegacyVM() {
        try {
            const vm = new BurstVM();
            this.vmInterface.connectVM(vm);
            console.log('Legacy VM connected');
        } catch (error) {
            console.error('Failed to connect legacy VM:', error.message);
        }
    }
    
    // Compatibility method for existing code that might expect disassembleInstruction directly
    disassembleInstruction(address) {
        return this.disassemblerInterface.disassembleInstruction(this.vmInterface, address);
    }
    
    // Start the REPL
    start() {
        console.log('BURST Virtual Machine REPL v1.0');
        console.log('Type "help" for commands');
        console.log('');
        
        // Handle CTRL+C - cancel current input instead of exiting
        this.rl.on('SIGINT', () => {
            // Clear current line input
            this.rl.line = '';
            this.rl.cursor = 0;
            
            // Show ^C and new prompt on new line
            console.log('^C');
            this.rl.prompt(true);
        });
        
        this.rl.on('line', async (line) => {
            await this.handleCommand(line.trim());
        });
        
        this.rl.on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });
        
        this.rl.prompt();
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
        
        // Handle shell shortcuts
        if (line.startsWith('!')) {
            // Execute shell command
            const shellCmd = line.substring(1).trim();
            if (shellCmd) {
                await this.commands['!']([shellCmd]);
            }
            // Update prompt and return
            this.cwd = this.commandLoader.cwd;
            this.rl.setPrompt(formatPrompt(this.cwd, this.originalCwd, this.replCommands));
            this.rl.prompt();
            return;
        }
        
        // Parse command and arguments
        const parts = line.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const firstWord = parts[0]; // Keep original case for error messages
        const args = parts.slice(1);
        
        // Execute command if it exists in the command table
        if (this.commands[cmd]) {
            try {
                // Commands should not return values that get printed
                await this.commands[cmd](args);
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
        } else {
            // Not a known command, check if it's an assembly instruction
            try {
                const handled = await this.replCommands.handleSpecialInput(line);
                if (!handled) {
                    console.error(`Unknown command: ${cmd}`);
                    console.error(`Type 'help' for a list of commands`);
                    
                    // Suggest similar commands or instructions
                    const suggestions = this.assemblerInterface.findSuggestions(cmd);
                    if (suggestions.length > 0) {
                        console.error(`Did you mean: ${suggestions.join(', ')}?`);
                    }
                }
            } catch (error) {
                // Show assembly error if it's assembly-related
                console.error(`Error: ${error.message}`);
            }
        }
        
        // Always update prompt based on current directory
        this.cwd = this.commandLoader.cwd;
        this.rl.setPrompt(formatPrompt(this.cwd, this.originalCwd, this.replCommands));
        this.rl.prompt();
    }
    
    // Connect a VM implementation
    connectVM(vmInstance) {
        return this.vmInterface.connectVM(vmInstance);
    }
    
    // Connect an assembler implementation
    connectAssembler(assemblerInstance) {
        const result = this.assemblerInterface.connectAssembler(assemblerInstance);
        if (result) {
            // Update command completion entries if needed
            if (this.replCommands) {
                this.replCommands.updateCompletionEntries();
            }
        }
        return result;
    }
    
    // Connect a disassembler implementation
    connectDisassembler(disassemblerInstance) {
        return this.disassemblerInterface.connectDisassembler(disassemblerInstance);
    }
    
    // Get VM interface for external access
    getVMInterface() {
        return this.vmInterface;
    }
    
    // Get assembler interface for external access
    getAssemblerInterface() {
        return this.assemblerInterface;
    }
    
    // Get disassembler interface for external access
    getDisassemblerInterface() {
        return this.disassemblerInterface;
    }
}

// Start REPL if running directly
if (require.main === module) {
    const repl = new BurstREPL();
    repl.start();
}

// Export for use
module.exports = BurstREPL;
