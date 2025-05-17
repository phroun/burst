// Disassembler Interface for BURST REPL
// Provides an abstraction layer between the REPL and disassembler implementations

class DisassemblerInterface {
    constructor() {
        this.disassemblerInstance = null;
        this.disassemblerConnected = false;
    }
    
    // Connect a disassembler implementation
    connectDisassembler(disassemblerInstance) {
        this.disassemblerInstance = disassemblerInstance;
        this.disassemblerConnected = true;
        console.log('Disassembler connected successfully');
        return true;
    }
    
    // Disconnect the disassembler
    disconnectDisassembler() {
        this.disassemblerInstance = null;
        this.disassemblerConnected = false;
        console.log('Disassembler disconnected');
    }
    
    // DISASSEMBLY FUNCTIONS
    
    // Disassemble a single instruction at the given address
    disassembleInstruction(vmInterface, address) {
        if (this.disassemblerConnected && this.disassemblerInstance && 
            this.disassemblerInstance.disassembleInstruction) {
            return this.disassemblerInstance.disassembleInstruction(vmInterface, address);
        }
        
        // Fallback implementation if no disassembler is connected
        return {
            address: address,
            bytes: this.getInstructionBytes(vmInterface, address, 4),
            instruction: `??? (No disassembler connected)`,
            size: 4,  // Default size estimate
            nextAddress: address + 4
        };
    }
    
    // Disassemble multiple instructions starting at the given address
    disassembleRange(vmInterface, startAddress, endAddress) {
        if (this.disassemblerConnected && this.disassemblerInstance && 
            this.disassemblerInstance.disassembleRange) {
            return this.disassemblerInstance.disassembleRange(vmInterface, startAddress, endAddress);
        }
        
        // Fallback implementation using disassembleInstruction
        const instructions = [];
        let address = startAddress;
        
        while (address < endAddress) {
            const result = this.disassembleInstruction(vmInterface, address);
            instructions.push(result);
            address = result.nextAddress;
            
            // Safety check to prevent infinite loops
            if (address <= result.address) {
                break;
            }
        }
        
        return instructions;
    }
    
    // Disassemble a specific number of instructions
    disassembleCount(vmInterface, address, count) {
        if (this.disassemblerConnected && this.disassemblerInstance && 
            this.disassemblerInstance.disassembleCount) {
            return this.disassemblerInstance.disassembleCount(vmInterface, address, count);
        }
        
        // Fallback implementation using disassembleInstruction
        const instructions = [];
        let currentAddress = address;
        
        for (let i = 0; i < count; i++) {
            const result = this.disassembleInstruction(vmInterface, currentAddress);
            instructions.push(result);
            currentAddress = result.nextAddress;
            
            // Safety check
            if (currentAddress <= result.address) {
                break;
            }
        }
        
        return instructions;
    }
    
    // Format disassembled instruction for display
    formatInstruction(disassembledInstruction, options = {}) {
        if (this.disassemblerConnected && this.disassemblerInstance && 
            this.disassemblerInstance.formatInstruction) {
            return this.disassemblerInstance.formatInstruction(disassembledInstruction, options);
        }
        
        // Basic fallback formatting
        const address = disassembledInstruction.address.toString(16).padStart(8, '0');
        const bytesStr = this.formatBytes(disassembledInstruction.bytes);
        const instruction = disassembledInstruction.instruction;
        
        return `0x${address}:  ${bytesStr.padEnd(20)}  ${instruction}`;
    }
    
    // UTILITY FUNCTIONS
    
    // Helper to get instruction bytes
    getInstructionBytes(vmInterface, address, size) {
        const bytes = [];
        try {
            for (let i = 0; i < size; i++) {
                bytes.push(vmInterface.readByte(address + i));
            }
        } catch (e) {
            // Handle read errors gracefully
        }
        return bytes;
    }
    
    // Format bytes as hex
    formatBytes(bytes) {
        return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
    }
    
    // Determine if an address contains a valid instruction
    isValidInstructionAddress(vmInterface, address) {
        if (this.disassemblerConnected && this.disassemblerInstance && 
            this.disassemblerInstance.isValidInstructionAddress) {
            return this.disassemblerInstance.isValidInstructionAddress(vmInterface, address);
        }
        
        // Basic fallback - check if address is in valid memory range
        return address >= 0 && address < vmInterface.getMemorySize();
    }
    
    // Estimate instruction size at an address
    estimateInstructionSize(vmInterface, address) {
        if (this.disassemblerConnected && this.disassemblerInstance && 
            this.disassemblerInstance.estimateInstructionSize) {
            return this.disassemblerInstance.estimateInstructionSize(vmInterface, address);
        }
        
        // Basic fallback - try to determine size based on first byte
        if (address >= 0 && address < vmInterface.getMemorySize()) {
            const firstByte = vmInterface.readByte(address);
            
            // This is just a placeholder - real implementation would depend on ISA
            const opcode = firstByte & 0xF0; // Assume upper 4 bits are opcode
            
            // Simple heuristic based on opcode patterns
            if (opcode < 0x10) return 2;  // Small instructions
            if (opcode < 0x80) return 4;  // Medium instructions
            return 6;  // Large instructions
        }
        
        return 4; // Default instruction size
    }
}

module.exports = DisassemblerInterface;
