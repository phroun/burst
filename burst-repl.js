// BURST VM REPL and Command Interpreter - Fixed version
// Interactive environment for BURST VM

const readline = require('readline');
const { BurstVM, BurstAssembler, OPCODES } = require('./burst-vm.js');
const CommandHandlers = require('./repl/command-handlers');
const ShellCommands = require('./repl/shell-commands');
const AssemblyCommands = require('./repl/assembly-commands');
const OptionCommands = require('./repl/option-commands');
const { Debugger } = require('./repl/debugger');
const PlatformUtils = require('./repl/platform-utils');
const { Pager } = require('./repl/pager');
const helpSystem = require('./repl/help-system');
const { createCompleter } = require('./repl/completer');

// BURST REPL class
class BurstREPL {
    constructor() {
        this.vm = new BurstVM();
        this.assembler = new BurstAssembler();
        this.debugger = new Debugger(this.vm);
        
        // Command history
        this.history = [];
        this.historyIndex = 0;
        
        // Load config early to get aliases
        this.config = PlatformUtils.loadConfig();
        
        // Save the original working directory
        this.originalCwd = process.cwd();
        
        // Initialize options early to set up pager
        this.optionCommands = new OptionCommands(this);
        
        // Initialize pager with options
        this.pager = new Pager(this.optionCommands.getPagerOptions());
        
        // Set pager in help system
        helpSystem.setPager(this.pager);
        helpSystem.setRepl(this);
        
        // Create the completer function
        this.completerFn = createCompleter(this);
        
        // Initialize readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'burst> ',
            completer: this.completerFn,
            terminal: true
        });
        
        // Initialize command handlers
        this.commandHandlers = new CommandHandlers(this);
        this.shellCommands = new ShellCommands(this);
        this.assemblyCommands = new AssemblyCommands(this);
        
        // Combine commands from all handlers
        this.commands = {
            ...this.commandHandlers.getCommands(),
            ...this.shellCommands.getCommands(),
            ...this.assemblyCommands.getCommands(),
            ...this.optionCommands.getCommands()
        };
        
        // Make shell commands available to other handlers
        this.cwd = this.shellCommands.cwd;
        this.getAbsolutePath = this.shellCommands.getAbsolutePath.bind(this.shellCommands);
        
        // Get list of valid mnemonics (lowercase)
        this.validMnemonics = Object.keys(OPCODES).map(op => op.toLowerCase());
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
            this.rl.prompt();
            return;
        }
        
        // Parse command and arguments
        const parts = line.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const firstWord = parts[0]; // Keep original case for error messages
        const args = parts.slice(1);
        
        // Check if it's a known mnemonic first
        const isValidMnemonic = this.validMnemonics.includes(cmd);
        
        // Execute command if it exists in the command table AND it's not a mnemonic
        if (this.commands[cmd] && !isValidMnemonic) {
            try {
                await this.commands[cmd](args);
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
        } else if (isValidMnemonic || !this.commands[cmd]) {
            // It's either a valid mnemonic or not a known command
            // In either case, try to parse as assembly instruction
            try {
                await this.assemblyCommands.parseAssemblyLine(line);
            } catch (error) {
                // Intercept and improve specific error messages
                if (error.message.includes('Unknown mnemonic')) {
                    // Provide better error message for unknown mnemonic
                    if (this.commands[cmd]) {
                        console.error(`Error: '${firstWord}' is a command, not an assembly instruction`);
                    } else {
                        console.error(`Error: '${firstWord}' is not a valid assembly instruction or command`);
                        
                        // Suggest similar mnemonics if any
                        const suggestions = this.findSimilarMnemonics(cmd);
                        if (suggestions.length > 0) {
                            console.error(`Did you mean: ${suggestions.join(', ')}?`);
                        } else {
                            console.error(`Valid instructions include: mov, movi, add, sub, jmp, etc.`);
                            console.error(`Type 'help' for a list of commands`);
                        }
                    }
                } else {
                    // Show specific assembly error
                    console.error(`Assembly error: ${error.message}`);
                }
            }
        }
        
        // Update prompt with current directory if changed
        if (this.shellCommands.cwd !== this.cwd) {
            this.cwd = this.shellCommands.cwd;
            const shortPath = this.cwd.replace(process.env.HOME, '~');
            this.rl.setPrompt(`burst:${shortPath}> `);
        }
        
        this.rl.prompt();
    }
    
    // Find similar mnemonics (for suggestions)
    findSimilarMnemonics(input) {
        const similar = [];
        const inputLower = input.toLowerCase();
        
        for (const mnemonic of this.validMnemonics) {
            // Check if mnemonic starts with same letter or is similar length
            if (mnemonic.startsWith(inputLower[0]) || 
                Math.abs(mnemonic.length - inputLower.length) <= 1) {
                // Simple similarity check
                let matches = 0;
                for (let i = 0; i < Math.min(mnemonic.length, inputLower.length); i++) {
                    if (mnemonic[i] === inputLower[i]) matches++;
                }
                if (matches >= inputLower.length / 2) {
                    similar.push(mnemonic);
                }
            }
        }
        
        return similar.slice(0, 3); // Return up to 3 suggestions
    }
}

// Start REPL if running directly
if (require.main === module) {
    const repl = new BurstREPL();
    repl.start();
}

// Export for use
module.exports = BurstREPL;
