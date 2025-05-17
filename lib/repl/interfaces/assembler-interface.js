// Assembler Interface for BURST REPL
// Provides a clean interface between the REPL and external assembler implementations

class AssemblerInterface {
    constructor() {
        // Properties for autocomplete and basic functionality
        this.completionEntries = {
            opcodes: [],       // List of opcode names for autocomplete
            directives: [],    // List of directives for autocomplete
            registers: []      // List of register names for autocomplete
        };
        
        // Track whether an assembler is connected
        this.assemblerConnected = false;
        this.assemblerInstance = null;
    }
    
    // Connect with an external assembler implementation
    connectAssembler(assemblerInstance) {
        this.assemblerInstance = assemblerInstance;
        this.assemblerConnected = true;
        
        // Update completion entries from the assembler
        this.updateCompletionEntries();
        
        console.log('Assembler connected successfully');
        return true;
    }
    
    // Update completion entries from the connected assembler
    updateCompletionEntries() {
        if (this.assemblerConnected && this.assemblerInstance) {
            // Get completion entries from the assembler
            if (this.assemblerInstance.getCompletionEntries) {
                const entries = this.assemblerInstance.getCompletionEntries();
                this.completionEntries = { ...this.completionEntries, ...entries };
            }
        }
    }
    
    // Disconnect the assembler
    disconnectAssembler() {
        this.assemblerInstance = null;
        this.assemblerConnected = false;
        console.log('Assembler disconnected');
    }
    
    // COMMAND PROCESSING FUNCTIONS
    
    // Check if a line should be handled by the assembler
    isAssemblyCommand(line) {
        if (!line || line.trim() === '') return false;
        
        if (this.assemblerConnected && this.assemblerInstance && this.assemblerInstance.isAssemblyCommand) {
            // Let the connected assembler decide
            return this.assemblerInstance.isAssemblyCommand(line);
        }
        
        // Basic fallback logic if no assembler is connected
        const firstWord = line.trim().split(/\s+/)[0].toLowerCase();
        
        // Check if it's an opcode
        if (this.completionEntries.opcodes.includes(firstWord)) {
            return true;
        }
        
        // Check if it's a directive
        if (firstWord.startsWith('.') && this.completionEntries.directives.includes(firstWord)) {
            return true;
        }
        
        // Check if it's a label definition (ends with :)
        if (firstWord.endsWith(':')) {
            return true;
        }
        
        // Not an assembly command
        return false;
    }
    
    // Process an assembly command and return the result
    async processAssemblyCommand(line, vm) {
        if (!this.assemblerConnected || !this.assemblerInstance) {
            return {
                success: false,
                error: 'No assembler connected',
                message: 'Assembly command recognized but no assembler is connected to process it'
            };
        }
        
        if (!this.assemblerInstance.processAssemblyCommand) {
            return {
                success: false,
                error: 'Connected assembler does not implement processAssemblyCommand',
                message: 'The connected assembler does not support processing commands'
            };
        }
        
        // Forward the command to the assembler with context
        return await this.assemblerInstance.processAssemblyCommand(line, vm);
    }
    
    // COMPLETION FUNCTIONS
    
    // Get all completion entries for autocomplete
    getCompletionEntries() {
        return this.completionEntries;
    }
    
    // Get available completion types
    getCompletionTypes() {
        return Object.keys(this.completionEntries);
    }
    
    // Get specific completion entries by type
    getCompletionsByType(type) {
        return this.completionEntries[type] || [];
    }
    
    // Set completion entries (used by REPL to provide custom completion data)
    setCompletionEntries(entries) {
        this.completionEntries = { ...this.completionEntries, ...entries };
    }
    
    // Find suggestions for a partial command
    findSuggestions(partial) {
        if (this.assemblerConnected && this.assemblerInstance && this.assemblerInstance.findSuggestions) {
            return this.assemblerInstance.findSuggestions(partial);
        }
        
        // Basic fallback implementation
        const suggestions = [];
        
        // Search through all completion types
        for (const type in this.completionEntries) {
            const entries = this.completionEntries[type];
            const matches = entries.filter(entry => entry.startsWith(partial.toLowerCase()));
            suggestions.push(...matches);
        }
        
        return suggestions;
    }
    
    // ASSEMBLER FILE FUNCTIONS
    
    // Assemble a file and return the binary result
    async assembleFile(filename, options = {}) {
        if (!this.assemblerConnected || !this.assemblerInstance) {
            throw new Error('No assembler connected');
        }
        
        if (!this.assemblerInstance.assembleFile) {
            throw new Error('Connected assembler does not implement assembleFile');
        }
        
        return await this.assemblerInstance.assembleFile(filename, options);
    }
    
    // UTILITY FUNCTIONS
    
    // Estimate the size of an assembly instruction (for PC advancement)
    estimateInstructionSize(line) {
        if (this.assemblerConnected && this.assemblerInstance && this.assemblerInstance.estimateInstructionSize) {
            return this.assemblerInstance.estimateInstructionSize(line);
        }
        
        // Simple fallback implementation
        const firstWord = line.trim().split(/\s+/)[0].toLowerCase();
        
        // Handle directives
        if (firstWord.startsWith('.')) {
            if (['.skip', '.space'].includes(firstWord)) {
                // Try to extract the size from the directive
                const match = line.match(/\.\w+\s+(\d+)/);
                if (match) {
                    return parseInt(match[1]);
                }
            }
            if (['.byte', '.db'].includes(firstWord)) {
                // Count commas to estimate number of bytes
                return (line.match(/,/g) || []).length + 1;
            }
            if (['.word', '.dw'].includes(firstWord)) {
                // Words are typically 4 bytes
                return ((line.match(/,/g) || []).length + 1) * 4;
            }
            if (['.string', '.ascii'].includes(firstWord)) {
                // Try to extract the string length
                const match = line.match(/"([^"]*)"/);
                if (match) {
                    return match[1].length;
                }
            }
            
            // Default for directives
            return 1;
        }
        
        // Default sizes for common instruction types
        const largeInstructions = ['limm', 'jmp', 'call'];
        const mediumInstructions = ['movi', 'movhi', 'enter', 'load', 'store'];
        const smallInstructions = ['halt', 'syscall', 'ret', 'leave'];
        
        if (largeInstructions.includes(firstWord)) return 6;
        if (mediumInstructions.includes(firstWord)) return 4;
        if (smallInstructions.includes(firstWord)) return 2;
        
        // Default size for other instructions
        return 4;
    }
}

module.exports = AssemblerInterface;
