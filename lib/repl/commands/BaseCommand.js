// Base class for command plugins - Updated for interface architecture and new directory structure

class BaseCommand {
    constructor(commandLoader) {
        this.commandLoader = commandLoader;
        this.repl = commandLoader.repl;
        this.config = commandLoader.config;
    }
    
    // Main execute method - must be implemented by subclasses
    async execute(args) {
        throw new Error('execute() method must be implemented by subclass');
    }
    
    // Optional: Get help information for this command
    getHelp() {
        // Return null by default - subclasses should override this
        return null;
    }
    
    // Optional: Get aliases for this command
    getAliases() {
        return [];
    }
    
    // Get the high-level category (BASIC, DEBUGGER, SHELL)
    getCategory() {
        // Default to SHELL if not overridden
        return 'SHELL';
    }
    
    // Should this command show in basic help?
    showInBasicHelp() {
        // Default to false if not overridden
        return false;
    }
    
    // Helper: Get current working directory
    getCwd() {
        return this.commandLoader.cwd;
    }
    
    // Helper: Set current working directory
    setCwd(newCwd) {
        this.commandLoader.cwd = newCwd;
    }
    
    // Helper: Get absolute path
    getAbsolutePath(filepath) {
        return this.commandLoader.getAbsolutePath(filepath);
    }
    
    // Helper: Get original working directory
    getOriginalCwd() {
        return this.repl.originalCwd;
    }
    
    // Helper: Access PlatformUtils
    get PlatformUtils() {
        return require('../utils/platform-utils');
    }
    
    // Helper: Access glob utilities
    get glob() {
        return require('../utils/glob-matcher');
    }
    
    // Helper: Access VM interface
    get vmInterface() {
        return this.repl.vmInterface;
    }
    
    // Helper: Access assembler interface
    get assemblerInterface() {
        return this.repl.assemblerInterface;
    }
    
    // Helper: Access disassembler interface
    get disassemblerInterface() {
        return this.repl.disassemblerInterface;
    }
    
    // Helper: Access debugger
    get debugger() {
        return this.repl.debugger;
    }
}

module.exports = BaseCommand;
