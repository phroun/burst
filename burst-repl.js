// BURST VM REPL and Command Interpreter
// Interactive environment for BURST VM

const readline = require('readline');
const { BurstVM, BurstAssembler, OPCODES } = require('./burst-vm.js');
const CommandHandlers = require('./repl/command-handlers');
const { disassembleInstruction } = require('./repl/disassembler');
const ShellCommands = require('./repl/shell-commands');
const AssemblyCommands = require('./repl/assembly-commands');
const OptionCommands = require('./repl/option-commands');
const { Debugger } = require('./repl/debugger');
const PlatformUtils = require('./repl/platform-utils');
const { Pager } = require('./repl/pager');
const helpSystem = require('./repl/help-system');
const { createCompleter } = require('./repl/completer');
const path = require('path');
const os = require('os');

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
            prompt: this.formatPrompt(this.originalCwd),
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
    
    // Format the prompt based on current directory
    formatPrompt(currentPath) {
        const termWidth = PlatformUtils.getTerminalWidth();
        const maxPathLength = Math.floor(termWidth / 2);
        
        let formattedPath = '';
        
        // Normalize the path for comparison and remove trailing slashes
        let normalizedCurrent = path.normalize(currentPath);
        // Remove trailing slashes except for root directory
        if (normalizedCurrent.length > 1 && normalizedCurrent.endsWith(path.sep)) {
            normalizedCurrent = normalizedCurrent.slice(0, -1);
        }
        
        const normalizedOriginal = path.normalize(this.originalCwd);
        const homeDir = os.homedir();
        
        // Check if we're in the original launch directory
        if (normalizedCurrent === normalizedOriginal) {
            formattedPath = '';
        }
        // Check if we're in a subdirectory of the launch directory
        else if (normalizedCurrent.startsWith(normalizedOriginal + path.sep)) {
            const relativePath = path.relative(normalizedOriginal, normalizedCurrent);
            formattedPath = ' ' + relativePath;
        }
        // Check if we're in the user's home directory
        else if (normalizedCurrent === homeDir) {
            formattedPath = ' ~';
        }
        // Check if we're in a subdirectory of the user's home
        else if (normalizedCurrent.startsWith(homeDir + path.sep)) {
            const relativePath = path.relative(homeDir, normalizedCurrent);
            formattedPath = ' ~/' + relativePath;
        }
        // Check for other users' home directories
        else {
            let matched = false;
            
            // Windows-specific home directory detection
            if (process.platform === 'win32') {
                const userProfileBase = process.env.USERPROFILE ? 
                    path.dirname(process.env.USERPROFILE) : 'C:\\Users';
                
                if (normalizedCurrent.startsWith(userProfileBase + path.sep)) {
                    const relativePath = path.relative(userProfileBase, normalizedCurrent);
                    const pathParts = relativePath.split(path.sep);
                    
                    if (pathParts.length > 0) {
                        const username = pathParts[0];
                        if (username === path.basename(homeDir)) {
                            // It's the current user's home, already handled above
                            formattedPath = ' ' + normalizedCurrent;
                        } else if (pathParts.length === 1) {
                            formattedPath = ' ~' + username;
                        } else {
                            const rest = pathParts.slice(1).join('/');
                            formattedPath = ' ~' + username + '/' + rest;
                        }
                        matched = true;
                    }
                }
            }
            // Unix-like systems
            else {
                const match = normalizedCurrent.match(/^(\/home|\/Users)\/([^\/]+)(.*)$/);
                if (match) {
                    const username = match[2];
                    const rest = match[3];
                    if (rest === '') {
                        formattedPath = ' ~' + username;
                    } else {
                        // Remove leading slash and normalize separators
                        const restPath = rest.substring(1);
                        formattedPath = ' ~' + username + '/' + restPath;
                    }
                    matched = true;
                }
            }
            
            if (!matched) {
                formattedPath = ' ' + normalizedCurrent;
            }
        }
        
        // Remove trailing slashes in formatted path (except for root)
        if (formattedPath.endsWith('/') && formattedPath !== ' /') {
            formattedPath = formattedPath.slice(0, -1);
        }
        
        // Handle path abbreviation if it's too long
        const fullPrompt = 'burst' + formattedPath + '>';
        if (fullPrompt.length > maxPathLength && formattedPath.length > 0) {
            // Start removing components from the beginning until it fits
            let parts = formattedPath.trim().split('/');
            let prefix = '';
            
            // Determine the prefix to preserve
            if (formattedPath.startsWith(' ~/')) {
                prefix = '~';
                parts = parts[0].substring(1).split('/').concat(parts.slice(1));
            } else if (formattedPath.match(/^ ~[^\/]+/)) {
                const match = formattedPath.match(/^ (~[^\/]+)/);
                prefix = match[1];
                const afterPrefix = formattedPath.substring(match[1].length + 1);
                parts = afterPrefix.split('/').filter(p => p);
            } else if (formattedPath.startsWith(' /')) {
                prefix = '';
                parts = parts.filter(p => p);
            }
            
            // Remove components from the beginning until it fits
            while (parts.length > 1) {
                const testPath = prefix + ':' + parts.join('/');
                const testPrompt = 'burst ' + testPath + '>';
                if (testPrompt.length <= maxPathLength) {
                    break;
                }
                parts.shift();
            }
            
            // Construct the abbreviated path
            const shortenedPath = parts.join('/');
            if (prefix) {
                formattedPath = ' ' + prefix + ':' + shortenedPath + '>';
            } else {
                formattedPath = ' /:' + shortenedPath + '>';
            }
            return 'burst' + formattedPath.slice(0, -1) + '>';
        }
        
        return fullPrompt;
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
        
        // Always update prompt based on current directory
        this.cwd = this.shellCommands.cwd;
        this.rl.setPrompt(this.formatPrompt(this.cwd));
        
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
