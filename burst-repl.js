// BURST VM REPL and Command Interpreter
// Interactive environment for BURST VM

const readline = require('readline');
const { BurstVM, BurstAssembler, OPCODES } = require('./burst-vm.js');
const { disassembleInstruction } = require('./repl/disassembler');
const { Debugger } = require('./repl/debugger');
const PlatformUtils = require('./repl/platform-utils');
const { Pager } = require('./repl/pager');
const helpSystem = require('./repl/help-system');
const { createCompleter } = require('./repl/completer');
const { formatPrompt } = require('./repl/prompt-formatter');
const { getMnemonicList, findSimilarMnemonics } = require('./repl/mnemonic-utils');
const path = require('path');
const os = require('os');

// Single command system import
const ReplCommands = require('./repl/repl-commands');

// BURST REPL class
class BurstREPL {
    constructor() {
        this.vm = new BurstVM();
        this.assembler = new BurstAssembler();
        this.debugger = new Debugger(this.vm);
        this.disassembler = { disassembleInstruction };
        
        // Command history
        this.history = [];
        this.historyIndex = 0;
        
        // Load config early to get aliases
        this.config = PlatformUtils.loadConfig();
        
        // Save the original working directory
        this.originalCwd = process.cwd();
        
        // Initialize unified command system
        this.replCommands = new ReplCommands(this);
        this.commands = this.replCommands.getCommands();
        
        // Now the shellCommands reference will be available
        this.commandLoader = this.replCommands.commandLoader;
        
        // Initialize pager with options from the command system
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
        
        // Get list of valid mnemonics (lowercase)
        this.validMnemonics = getMnemonicList(OPCODES);

         // Create a direct assemble method for compatibility with tests
        this.assemble = (args) => {
            if (this.commands['assemble']) {
                return this.commands['assemble'](args);
            } else {
                throw new Error('Assemble command not loaded');
            }
        };
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
        
        // Check if it's a known mnemonic first
        const isValidMnemonic = this.validMnemonics.includes(cmd);
        
        // Execute command if it exists in the command table AND it's not a mnemonic
        if (this.commands[cmd] && !isValidMnemonic) {
            try {
                // Commands should not return values that get printed
                await this.commands[cmd](args);
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
        } else if (isValidMnemonic || !this.commands[cmd]) {
            // It's either a valid mnemonic or not a known command
            // In either case, try to parse as assembly instruction
            try {
                const handled = await this.replCommands.handleSpecialInput(line);
                if (!handled) {
                    // If handleSpecialInput didn't handle it and it's not a valid command
                    if (!this.commands[cmd]) {
                        console.error(`Unknown command: ${cmd}`);
                        console.error(`Type 'help' for a list of commands`);
                    }
                }
            } catch (error) {
                // Intercept and improve specific error messages
                if (error.message.includes('Unknown mnemonic')) {
                    // Provide better error message for unknown mnemonic
                    if (this.commands[cmd]) {
                        console.error(`Error: '${firstWord}' is a command, not an assembly instruction`);
                    } else {
                        console.error(`Error: '${firstWord}' is not a valid assembly instruction or command`);
                        
                        // Suggest similar mnemonics if any
                        const suggestions = findSimilarMnemonics(cmd, this.validMnemonics);
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
        
        // Always update prompt based on current directory
        this.cwd = this.commandLoader.cwd;
        this.rl.setPrompt(formatPrompt(this.cwd, this.originalCwd, this.replCommands));
        this.rl.prompt();
    }
}

// Start REPL if running directly
if (require.main === module) {
    const repl = new BurstREPL();
    repl.start();
}

// Export for use
module.exports = BurstREPL;
