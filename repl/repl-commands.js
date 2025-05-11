// Unified command integration for BURST REPL
// Replaces the old command-handlers.js, option-commands.js, and assembly-commands.js

const CommandLoader = require('./command-loader');
const AssemblyParser = require('./assembly-parser');

class ReplCommands {
    constructor(repl) {
        this.repl = repl;
        this.commandLoader = new CommandLoader(repl);
        this.assemblyParser = new AssemblyParser(repl.vm);
        
        // Get all commands from the plugin system
        this.commands = this.commandLoader.getCommands();
        
        // Set command loader reference in repl
        repl.commandLoader = this.commandLoader;
        
        // Initialize methods for accessing options
        this.initializeMethods();
    }
    
    getCommands() {
        return this.commands;
    }
    
    // Handle special cases for direct command line input
    async handleSpecialInput(line) {
        // Handle direct assembly input (e.g., "mov r0, r1")
        if (AssemblyParser.isAssemblyInstruction(line)) {
            await this.assemblyParser.parseAssemblyLine(line);
            return true;
        }
        
        // Handle shell shortcuts (e.g., "!ls" for exec)
        if (line.startsWith('!') && line.length > 1) {
            const execCmd = this.commands['exec'];
            if (execCmd) {
                const args = line.substring(1).trim().split(/\s+/);
                await execCmd(args);
                return true;
            }
        }
        
        // Return false to indicate we didn't handle the input
        return false;
    }
    
    // Initialize methods for accessing options
    initializeMethods() {
        // For option commands compatibility
        this.getOption = (name) => {
            // Get the option command instance
            const optionCmd = this.commandLoader.getCommandsByCategory().BASIC
                .find(cmd => cmd.name === 'option');
            if (optionCmd && optionCmd.instance.getOption) {
                return optionCmd.instance.getOption(name);
            }
            return undefined;
        };
        
        this.getPagerOptions = () => {
            const optionCmd = this.commandLoader.getCommandsByCategory().BASIC
                .find(cmd => cmd.name === 'option');
            if (optionCmd && optionCmd.instance.getPagerOptions) {
                return optionCmd.instance.getPagerOptions();
            }
            return { enabled: true, debug: false };
        };
        
        this.getPromptColor = () => {
            const optionCmd = this.commandLoader.getCommandsByCategory().BASIC
                .find(cmd => cmd.name === 'option');
            if (optionCmd && optionCmd.instance.getPromptColor) {
                return optionCmd.instance.getPromptColor();
            }
            return undefined;
        };
    }
    
    // Get absolute path (delegate to command loader)
    getAbsolutePath(filepath) {
        return this.commandLoader.getAbsolutePath(filepath);
    }
}

module.exports = ReplCommands;
