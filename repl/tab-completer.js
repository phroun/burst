// BURST VM REPL and Command Interpreter
// Interactive environment for BURST VM

const readline = require('readline');
const { BurstVM, BurstAssembler, OPCODES } = require('./burst-vm.js');
const CommandHandlers = require('./repl/command-handlers');
const ShellCommands = require('./repl/shell-commands');
const AssemblyCommands = require('./repl/assembly-commands');
const { Debugger } = require('./repl/debugger');
const { disassembleInstruction } = require('./repl/disassembler');
const PlatformUtils = require('./repl/platform-utils');

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
        
        // Initialize readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'burst> ',
            completer: this.completer.bind(this)
        });
        
        // Initialize command handlers
        this.commandHandlers = new CommandHandlers(this);
        this.shellCommands = new ShellCommands(this);
        this.assemblyCommands = new AssemblyCommands(this);
        
        // Combine commands from all handlers
        this.commands = {
            ...this.commandHandlers.getCommands(),
            ...this.shellCommands.getCommands(),
            ...this.assemblyCommands.getCommands()
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
    
    // Tab completion
    completer(line) {
        // First try command completion
        const commands = Object.keys(this.commands);
        let hits = commands.filter(cmd => cmd.startsWith(line));
        
        // Also include mnemonics in completion
        if (hits.length === 0) {
            hits = this.validMnemonics.filter(mnem => mnem.startsWith(line.toLowerCase()));
        }
        
        // If still no hits and no space in line, try file/directory completion for potential paths
        if (hits.length === 0 && !line.includes(' ') && 
            (line.includes('/') || line.startsWith('~') || line.startsWith('./') || line.startsWith('../') || line === '.' || line === '..')) {
            // Treat it as a file path without a command
            const partial = line;
            
            // Special case: if partial is exactly '..' add trailing slash
            if (partial === '..') {
                return [[partial + '/'], line];
            }
            
            const expandedPartial = PlatformUtils.expandTilde(partial);
            
            try {
                const fs = require('fs');
                const path = require('path');
                
                let dir = path.dirname(expandedPartial);
                let basename = path.basename(expandedPartial);
                
                // If ending with /, the basename is empty and we want to list the directory contents
                if (partial.endsWith('/')) {
                    dir = expandedPartial;
                    basename = '';
                }
                
                // Special handling for completing '.'
                if (partial === '.') {
                    dir = this.cwd;
                    basename = '.';
                }
                
                // Handle ./ and ../ resolution
                if (dir === '.') {
                    dir = this.cwd;
                } else if (dir === '..') {
                    dir = path.dirname(this.cwd);
                }
                
                // Make path absolute
                const absDir = this.getAbsolutePath(dir);
                
                let files = fs.readdirSync(absDir);
                
                // If we're looking for files starting with '.', include . and ..
                if (basename === '.') {
                    files = ['.', '..'].concat(files.filter(f => f.startsWith('.')));
                }
                
                const matches = files
                    .filter(f => f.startsWith(basename))
                    .map(f => {
                        const absPath = path.join(absDir, f);
                        let displayPath;
                        
                        // If we're completing after a /, just show the filename
                        if (partial.endsWith('/')) {
                            displayPath = partial + f;
                        } else if (basename === '.' && (f === '.' || f === '..')) {
                            // For . and .. special directories
                            displayPath = f;
                        } else {
                            displayPath = path.join(path.dirname(partial), f);
                        }
                        
                        // Check if it's a directory and add trailing slash
                        try {
                            if (f === '.' || f === '..') {
                                displayPath += '/';
                            } else {
                                const stats = fs.statSync(absPath);
                                if (stats.isDirectory()) {
                                    displayPath += '/';
                                }
                            }
                        } catch (e) {
                            // Ignore stat errors
                        }
                        
                        return displayPath;
                    });
                
                if (matches.length > 0) {
                    return [matches, line];
                }
            } catch (e) {
                // Fall through
            }
        }
        
        // If still no hits and line includes a space, try file completion
        if (hits.length === 0 && line.includes(' ')) {
            const parts = line.split(' ');
            const cmd = parts[0];
            const partial = parts[parts.length - 1];
            
            // Handle tilde completion
            if (partial.startsWith('~') && !partial.includes('/')) {
                // Complete usernames after ~
                const prefix = partial.substring(1);
                const usernames = PlatformUtils.getUsernames();
                hits = usernames
                    .filter(user => user.startsWith(prefix))
                    .map(user => parts.slice(0, -1).concat(`~${user}/`).join(' '));
                
                if (hits.length > 0) {
                    return [hits, line];
                }
            }
            
            // Expand tilde in the partial path
            const expandedPartial = PlatformUtils.expandTilde(partial);
            
            // Commands that take file arguments
            const fileCommands = ['load', 'save', 'assemble', 'cat', 'edit', 'cd', 'ls'];
            if (fileCommands.includes(cmd)) {
                // Special case: if partial is exactly '..' add trailing slash
                if (partial === '..') {
                    const completion = parts.slice(0, -1).concat(partial + '/').join(' ');
                    return [[completion], line];
                }
                
                try {
                    const fs = require('fs');
                    const path = require('path');
                    
                    let dir = path.dirname(expandedPartial);
                    let basename = path.basename(expandedPartial);
                    
                    // If ending with /, the basename is empty and we want to list the directory contents
                    if (partial.endsWith('/')) {
                        dir = expandedPartial;
                        basename = '';
                    }
                    
                    // Special handling for completing '.'
                    if (partial === '.') {
                        dir = this.cwd;
                        basename = '.';
                    }
                    
                    // Handle ./ and ../ resolution
                    if (dir === '.') {
                        dir = this.cwd;
                    } else if (dir === '..') {
                        dir = path.dirname(this.cwd);
                    }
                    
                    // Make path absolute
                    const absDir = this.getAbsolutePath(dir);
                    
                    let files = fs.readdirSync(absDir);
                    
                    // If we're looking for files starting with '.', include . and ..
                    if (basename === '.') {
                        files = ['.', '..'].concat(files.filter(f => f.startsWith('.')));
                    }
                    
                    const matches = files
                        .filter(f => f.startsWith(basename))
                        .map(f => {
                            const absPath = path.join(absDir, f);
                            let displayPath;
                            
                            // If we're completing after a /, just show the filename
                            if (partial.endsWith('/')) {
                                displayPath = partial + f;
                            } else if (basename === '.' && (f === '.' || f === '..')) {
                                // For . and .. special directories
                                displayPath = f;
                            } else {
                                displayPath = path.join(path.dirname(partial), f);
                            }
                            
                            // Check if it's a directory and add trailing slash
                            try {
                                if (f === '.' || f === '..') {
                                    displayPath += '/';
                                } else {
                                    const stats = fs.statSync(absPath);
                                    if (stats.isDirectory()) {
                                        displayPath += '/';
                                    }
                                }
                            } catch (e) {
                                // Ignore stat errors
                            }
                            
                            // If we started with a tilde, preserve it in the display
                            if (partial.startsWith('~') && !partial.endsWith('/')) {
                                const tildeDir = path.dirname(partial);
                                displayPath = path.join(tildeDir, f);
                                const absPath = path.join(absDir, f);
                                try {
                                    const stats = fs.statSync(absPath);
                                    if (stats.isDirectory()) {
                                        displayPath += '/';
                                    }
                                } catch (e) {
                                    // Ignore stat errors
                                }
                            }
                            
                            return parts.slice(0, -1).concat(displayPath).join(' ');
                        });
                    
                    if (matches.length > 0) {
                        return [matches, line];
                    }
                } catch (e) {
                    // Fall through to default completion
                }
            }
        }
        
        // If we have no hits, show all commands and mnemonics
        if (hits.length === 0) {
            hits = [...commands, ...this.validMnemonics];
        }
        
        return [hits, line];
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
