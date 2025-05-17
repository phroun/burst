// Example Assembler Adapter for the new BURST ISA
// This is a placeholder showing how a new assembler would connect to the REPL

class NewBurstAssemblerAdapter {
    constructor() {
        // In a real implementation, this would initialize your new assembler
        this.assembler = null;
        
        // Initialize completion entries for autocomplete
        this.completionEntries = {
            opcodes: [
                'mov', 'movi', 'add', 'sub', 'mul', 'div', 'jmp', 'call',
                'push', 'pop', 'load', 'store', 'cmp', 'ret', 'halt'
            ],
            directives: [
                '.byte', '.db', '.word', '.dw', '.space', '.string', '.ascii',
                '.skip', '.include', '.org'
            ],
            registers: [
                'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7',
                'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15'
            ]
        };
        
        // Try to load the actual assembler if it exists
        this.tryLoadAssembler();
    }
    
    // Try to load the actual assembler module
    tryLoadAssembler() {
        try {
            // This would be replaced with the path to your new assembler
            const NewBurstAssembler = require('../new-burst-assembler.js');
            this.assembler = new NewBurstAssembler();
            
            // Load data from the assembler
            this.loadAssemblerData();
            
            console.log('New BURST Assembler loaded successfully.');
            return true;
        } catch (error) {
            console.log('New BURST Assembler not yet available. Using placeholder mode.');
            return false;
        }
    }
    
    // Load data from the assembler
    loadAssemblerData() {
        if (!this.assembler) return false;
        
        // These method names would match your actual assembler's API
        if (this.assembler.getCompletionEntries) {
            this.completionEntries = this.assembler.getCompletionEntries();
        }
        
        return true;
    }
    
    // -- Interface methods required by AssemblerInterface --
    
    // Get completion entries for autocomplete
    getCompletionEntries() {
        return this.completionEntries;
    }
    
    // Check if a line should be handled by the assembler
    isAssemblyCommand(line) {
        if (!line || line.trim() === '') return false;
        
        // Forward to assembler if it exists
        if (this.assembler && this.assembler.isAssemblyCommand) {
            return this.assembler.isAssemblyCommand(line);
        }
        
        // Basic fallback implementation
        const firstWord = line.trim().split(/\s+/)[0].toLowerCase();
        
        // Check if it's an opcode
        if (this.completionEntries.opcodes.includes(firstWord)) {
            return true;
        }
        
        // Check if it's a directive
        if (firstWord.startsWith('.') && 
            this.completionEntries.directives.includes(firstWord)) {
            return true;
        }
        
        // Check if it's a label definition (ends with :)
        if (firstWord.endsWith(':')) {
            return true;
        }
        
        return false;
    }
    
    // Process an assembly command
    async processAssemblyCommand(line, vmInterface) {
        // Forward to assembler if it exists
        if (this.assembler && this.assembler.processAssemblyCommand) {
            return await this.assembler.processAssemblyCommand(line, vmInterface);
        }
        
        // Fallback implementation - simulates assembly
        try {
            // Parse the instruction
            const parts = line.trim().split(/\s+/);
            const mnemonic = parts[0].toLowerCase();
            
            // Get operands
            const operands = parts.slice(1).join(' ').split(',').map(op => op.trim());
            
            // Estimate instruction size
            const instructionSize = this.estimateInstructionSize(line);
            
            // If this is just a standalone label, don't advance PC
            if (mnemonic.endsWith(':') && parts.length === 1) {
                return {
                    success: true,
                    message: `Label defined at 0x${vmInterface.getPC().toString(16)}`,
                    pcAdvanced: false
                };
            }
            
            // Simulate writing to memory by advancing PC
            const startPC = vmInterface.getPC();
            vmInterface.setPC(startPC + instructionSize);
            
            return {
                success: true,
                message: `Instruction assembled at 0x${startPC.toString(16)} (${instructionSize} bytes)`,
                pcAdvanced: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to assemble instruction'
            };
        }
    }
    
    // Assemble a file
    async assembleFile(filename, options = {}) {
        // Forward to assembler if it exists
        if (this.assembler && this.assembler.assembleFile) {
            return await this.assembler.assembleFile(filename, options);
        }
        
        throw new Error('Assembler not fully implemented - cannot assemble files yet');
    }
    
    // Find suggestions for a partial command
    findSuggestions(partial) {
        // Forward to assembler if it exists
        if (this.assembler && this.assembler.findSuggestions) {
            return this.assembler.findSuggestions(partial);
        }
        
        // Basic fallback implementation
        const suggestions = [];
        
        // Convert to lowercase for case-insensitive matching
        const partialLower = partial.toLowerCase();
        
        // Search through all completion types
        for (const type in this.completionEntries) {
            const entries = this.completionEntries[type];
            const matches = entries.filter(entry => entry.startsWith(partialLower));
            suggestions.push(...matches);
        }
        
        return suggestions;
    }
    
    // Estimate the size of an instruction
    estimateInstructionSize(line) {
        // Forward to assembler if it exists
        if (this.assembler && this.assembler.estimateInstructionSize) {
            return this.assembler.estimateInstructionSize(line);
        }
        
        // Basic fallback implementation
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
        
        // If it's a label definition, size is 0
        if (firstWord.endsWith(':') && !firstWord.includes(' ')) {
            return 0;
        }
        
        // Default sizes for common instruction types
        const largeInstructions = ['limm', 'jmp', 'call'];
        const mediumInstructions = ['movi', 'movhi', 'enter', 'load', 'store'];
        const smallInstructions = ['halt', 'syscall', 'ret', 'leave', 'nop'];
        
        if (largeInstructions.includes(firstWord)) return 6;
        if (mediumInstructions.includes(firstWord)) return 4;
        if (smallInstructions.includes(firstWord)) return 2;
        
        // Default size for other instructions
        return 4;
    }
}

module.exports = NewBurstAssemblerAdapter;// Example Assembler Adapter for the new BURST ISA
// This is a placeholder that shows how your new assembler would connect to the REPL

class NewBurstAssemblerAdapter {
    constructor() {
        // In a real implementation, this would initialize your new assembler
        this.assembler = null;
        
        // These would be populated by the actual assembler's data
        this.opcodes = {};
        this.conditions = {};
        this.operandTypes = {};
        this.legacyAliases = {};
        this.conditionPrefixes = {};
        
        // Try to load the actual assembler if it exists
        this.tryLoadAssembler();
    }
    
    // Try to load the actual assembler module
    tryLoadAssembler() {
        try {
            // This would be replaced with the path to your new assembler
            const NewBurstAssembler = require('../new-burst-assembler.js');
            this.assembler = new NewBurstAssembler();
            
            // Load the ISA data from the assembler
            this.loadISAData();
            
            console.log('New BURST Assembler loaded successfully.');
            return true;
        } catch (error) {
            console.log('New BURST Assembler not yet available. Using placeholder mode.');
            return false;
        }
    }
    
    // Load ISA data from the assembler
    loadISAData() {
        if (!this.assembler) return false;
        
        // These method names would match your actual assembler's API
        if (this.assembler.getOpcodes) {
            this.opcodes = this.assembler.getOpcodes();
        }
        
        if (this.assembler.getConditions) {
            this.conditions = this.assembler.getConditions();
        }
        
        if (this.assembler.getOperandTypes) {
            this.operandTypes = this.assembler.getOperandTypes();
        }
        
        if (this.assembler.getLegacyAliases) {
            this.legacyAliases = this.assembler.getLegacyAliases();
        }
        
        if (this.assembler.getConditionPrefixes) {
            this.conditionPrefixes = this.assembler.getConditionPrefixes();
        }
        
        return true;
    }
    
    // -- Interface methods required by AssemblerInterface --
    
    // Get the valid mnemonics for the assembler
    getValidMnemonics() {
        if (this.assembler && this.assembler.getValidMnemonics) {
            return this.assembler.getValidMnemonics();
        }
        
        // Fallback to generating from opcodes
        const basicMnemonics = Object.keys(this.opcodes).map(key => key.toLowerCase());
        const legacyMnemonics = Object.keys(this.legacyAliases || {});
        
        // Simple placeholder - in reality, you'd generate the full mnemonic list with all variants
        return [...basicMnemonics, ...legacyMnemonics];
    }
    
    // Get the opcodes
    getOpcodes() {
        return this.opcodes;
    }
    
    // Get the conditions
    getConditions() {
        return this.conditions;
    }
    
    // Get the operand types
    getOperandTypes() {
        return this.operandTypes;
    }
    
    // Get the legacy aliases
    getLegacyAliases() {
        return this.legacyAliases;
    }
    
    // Get the condition prefixes
    getConditionPrefixes() {
        return this.conditionPrefixes;
    }
    
    // Parse condition prefix
    parseConditionPrefix(mnemonic) {
        if (this.assembler && this.assembler.parseConditionPrefix) {
            return this.assembler.parseConditionPrefix(mnemonic);
        }
        
        // Fallback implementation similar to the original assembler-utils
        // First check legacy aliases
        if (this.legacyAliases && this.legacyAliases.hasOwnProperty(mnemonic)) {
            const alias = this.legacyAliases[mnemonic];
            return { condition: alias.condition, mnemonic: alias.mnemonic };
        }
        
        // Check for ifXX prefix
        if (mnemonic.startsWith('if') && this.conditionPrefixes) {
            const condPart = mnemonic.substring(2);
            for (const [prefix, condition] of Object.entries(this.conditionPrefixes)) {
                if (condPart.startsWith(prefix)) {
                    const baseMnemonic = condPart.substring(prefix.length);
                    if (baseMnemonic && this.operandTypes && this.operandTypes.hasOwnProperty(baseMnemonic)) {
                        return { condition, mnemonic: baseMnemonic };
                    }
                }
            }
        }
        
        // Check if it's a direct mnemonic
        if (this.operandTypes && this.operandTypes.hasOwnProperty(mnemonic)) {
            return { condition: this.conditions.ALWAYS || 0, mnemonic };
        }
        
        return null;
    }
    
    // Assemble instruction
    async assembleInstruction(mnemonic, operands) {
        if (this.assembler && this.assembler.assembleInstruction) {
            return await this.assembler.assembleInstruction(mnemonic, operands);
        }
        
        throw new Error('Assembler not loaded - cannot assemble instruction');
    }
    
    // Assemble file
    async assembleFile(filename) {
        if (this.assembler && this.assembler.assembleFile) {
            return await this.assembler.assembleFile(filename);
        }
        
        throw new Error('Assembler not loaded - cannot assemble file');
    }
    
    // Calculate instruction size
    calculateInstructionSize(mnemonic, operands) {
        if (this.assembler && this.assembler.calculateInstructionSize) {
            return this.assembler.calculateInstructionSize(mnemonic, operands);
        }
        
        // Default fallback similar to the original code
        if (mnemonic.toLowerCase() === 'limm') {
            return 6; // LIMM is a large instruction
        } else if (['jmp', 'call'].includes(mnemonic.toLowerCase())) {
            return 6; // Jump instructions with addresses
        } else if (['movi', 'movhi', 'enter'].includes(mnemonic.toLowerCase())) {
            return 4; // Medium instructions
        } else if (['halt', 'syscall', 'ret', 'leave'].includes(mnemonic.toLowerCase())) {
            return 2; // Smallest instructions
        } else {
            return 4; // Default size for normal instructions
        }
    }
}

module.exports = NewBurstAssemblerAdapter;
