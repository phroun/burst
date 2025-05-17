// Unified command integration for BURST REPL
// Replaces the old command-handlers.js, option-commands.js, and assembly-commands.js

const CommandLoader = require('./utils/command-loader');
const AssemblyParser = require('./assembly-parser');

class ReplCommands {
    constructor(repl) {
        this.repl = repl;
        this.commandLoader = new CommandLoader(repl);
        
        // Access the interfaces from the REPL
        this.vmInterface = repl.vmInterface;
        this.assemblerInterface = repl.assemblerInterface;
        this.disassemblerInterface = repl.disassemblerInterface;
        
        // Create the assembly parser with our interfaces
        this.assemblyParser = new AssemblyParser(this.vmInterface, this.assemblerInterface);
        
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
        // Handle direct assembly input
        if (this.assemblyParser.isAssemblyInstruction(line)) {
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
    
    // Update completion entries when a new assembler is connected
    updateCompletionEntries() {
        if (this.assemblerInterface) {
            const entries = this.assemblerInterface.getCompletionEntries();
            if (this.completer) {
                this.completer.updateCompletionEntries(entries);
            }
        }
    }
    
    // Disassemble instruction at address (for commands)
    disassembleInstruction(address) {
        return this.disassemblerInterface.disassembleInstruction(this.vmInterface, address);
    }
    
    // Disassemble a range of instructions (for commands)
    disassembleRange(startAddress, endAddress) {
        return this.disassemblerInterface.disassembleRange(this.vmInterface, startAddress, endAddress);
    }
    
    // Disassemble a specific number of instructions (for commands)
    disassembleCount(address, count) {
        return this.disassemblerInterface.disassembleCount(this.vmInterface, address, count);
    }
    
    // Format a disassembled instruction (for commands)
    formatDisassembledInstruction(instruction, options = {}) {
        return this.disassemblerInterface.formatInstruction(instruction, options);
    }
    
    // Helper for command implementations to check if an address is valid
    isValidInstructionAddress(address) {
        return this.disassemblerInterface.isValidInstructionAddress(this.vmInterface, address);
    }
    
    // Helper to estimate instruction size at an address
    estimateInstructionSize(address) {
        return this.disassemblerInterface.estimateInstructionSize(this.vmInterface, address);
    }
}

module.exports = ReplCommands;
