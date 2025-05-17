// VM Interface for BURST REPL
// Provides an abstraction layer between the REPL and VM implementations

class VMInterface {
    constructor() {
        this.vmInstance = null;
        this.vmConnected = false;
        
        // Default state properties accessible by the REPL
        this.state = {
            pc: 0,             // Program counter
            registers: [],     // Register values
            memory: null,      // Memory array (may be null if not accessible)
            flags: {},         // CPU flags
            halted: false      // Whether execution is halted
        };
    }
    
    // Connect a VM implementation
    connectVM(vmInstance) {
        this.vmInstance = vmInstance;
        this.vmConnected = true;
        
        // Initialize state from the connected VM
        this.updateState();
        
        console.log('VM connected successfully');
        return true;
    }
    
    // Disconnect the VM
    disconnectVM() {
        this.vmInstance = null;
        this.vmConnected = false;
        console.log('VM disconnected');
    }
    
    // Update local state from the VM
    updateState() {
        if (!this.vmConnected || !this.vmInstance) {
            return;
        }
        
        // Update PC
        if (this.vmInstance.pc !== undefined) {
            this.state.pc = this.vmInstance.pc;
        }
        
        // Update registers
        if (this.vmInstance.registers) {
            this.state.registers = [...this.vmInstance.registers];
        }
        
        // Update halt status
        if (this.vmInstance.halted !== undefined) {
            this.state.halted = this.vmInstance.halted;
        }
        
        // Update flags if available
        if (this.vmInstance.flags) {
            this.state.flags = {...this.vmInstance.flags};
        }
        
        // We don't copy the memory array due to its potentially large size
        // Just store a reference if it's accessible
        if (this.vmInstance.memory) {
            this.state.memory = this.vmInstance.memory;
        }
    }
    
    // BASIC VM OPERATIONS
    
    // Reset the VM
    reset() {
        if (this.vmConnected && this.vmInstance && this.vmInstance.reset) {
            this.vmInstance.reset();
            this.updateState();
            return true;
        }
        
        // Basic fallback if no VM is connected
        this.state.pc = 0;
        this.state.registers = new Array(16).fill(0);
        this.state.halted = false;
        this.state.flags = {};
        return true;
    }
    
    // Load a program into VM memory
    loadProgram(program) {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.loadProgram) {
            throw new Error('Connected VM does not implement loadProgram');
        }
        
        const result = this.vmInstance.loadProgram(program);
        this.updateState();
        return result;
    }
    
    // Run the program until halted or breakpoint
    run() {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.run) {
            throw new Error('Connected VM does not implement run');
        }
        
        const result = this.vmInstance.run();
        this.updateState();
        return result;
    }
    
    // Execute a single instruction
    step() {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.step) {
            throw new Error('Connected VM does not implement step');
        }
        
        const result = this.vmInstance.step();
        this.updateState();
        return result;
    }
    
    // MEMORY ACCESS
    
    // Read a byte from memory
    readByte(address) {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.readByte) {
            throw new Error('Connected VM does not implement readByte');
        }
        
        return this.vmInstance.readByte(address);
    }
    
    // Write a byte to memory
    writeByte(address, value) {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.writeByte) {
            throw new Error('Connected VM does not implement writeByte');
        }
        
        const result = this.vmInstance.writeByte(address, value);
        return result;
    }
    
    // Read a word (implementation-defined size) from memory
    readWord(address) {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.readWord) {
            throw new Error('Connected VM does not implement readWord');
        }
        
        return this.vmInstance.readWord(address);
    }
    
    // Write a word to memory
    writeWord(address, value) {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance.writeWord) {
            throw new Error('Connected VM does not implement writeWord');
        }
        
        const result = this.vmInstance.writeWord(address, value);
        return result;
    }
    
    // REGISTER ACCESS
    
    // Get the value of a register
    getRegister(regNumber) {
        if (!this.vmConnected || !this.vmInstance) {
            return 0; // Return default value if no VM connected
        }
        
        if (this.vmInstance.getRegister) {
            return this.vmInstance.getRegister(regNumber);
        }
        
        // Fallback to accessing registers array if available
        if (this.vmInstance.registers && regNumber < this.vmInstance.registers.length) {
            return this.vmInstance.registers[regNumber];
        }
        
        return 0;
    }
    
    // Set the value of a register
    setRegister(regNumber, value) {
        if (!this.vmConnected || !this.vmInstance) {
            return false;
        }
        
        if (this.vmInstance.setRegister) {
            const result = this.vmInstance.setRegister(regNumber, value);
            this.updateState();
            return result;
        }
        
        // Fallback to modifying registers array if available
        if (this.vmInstance.registers && regNumber < this.vmInstance.registers.length) {
            this.vmInstance.registers[regNumber] = value;
            this.updateState();
            return true;
        }
        
        return false;
    }
    
    // Get the current program counter
    getPC() {
        if (!this.vmConnected || !this.vmInstance) {
            return this.state.pc; // Return cached value
        }
        
        if (this.vmInstance.pc !== undefined) {
            return this.vmInstance.pc;
        }
        
        return this.state.pc;
    }
    
    // Set the program counter
    setPC(value) {
        if (!this.vmConnected || !this.vmInstance) {
            this.state.pc = value; // Update cached value
            return true;
        }
        
        if (this.vmInstance.pc !== undefined) {
            this.vmInstance.pc = value;
            this.state.pc = value;
            return true;
        }
        
        return false;
    }
    
    // Check if the VM is halted
    isHalted() {
        if (!this.vmConnected || !this.vmInstance) {
            return this.state.halted; // Return cached value
        }
        
        if (this.vmInstance.halted !== undefined) {
            return this.vmInstance.halted;
        }
        
        return this.state.halted;
    }
    
    // Get a flag value
    getFlag(flagName) {
        if (!this.vmConnected || !this.vmInstance) {
            return this.state.flags[flagName]; // Return cached value
        }
        
        if (this.vmInstance.getFlag) {
            return this.vmInstance.getFlag(flagName);
        }
        
        if (this.vmInstance.flags && this.vmInstance.flags[flagName] !== undefined) {
            return this.vmInstance.flags[flagName];
        }
        
        return this.state.flags[flagName];
    }
    
    // Set a flag value
    setFlag(flagName, value) {
        if (!this.vmConnected || !this.vmInstance) {
            this.state.flags[flagName] = value; // Update cached value
            return true;
        }
        
        if (this.vmInstance.setFlag) {
            const result = this.vmInstance.setFlag(flagName, value);
            this.updateState();
            return result;
        }
        
        if (this.vmInstance.flags) {
            this.vmInstance.flags[flagName] = value;
            this.state.flags[flagName] = value;
            return true;
        }
        
        return false;
    }
    
    // Get the entire memory array (may be large)
    getMemory() {
        if (!this.vmConnected || !this.vmInstance) {
            return this.state.memory; // Return cached reference
        }
        
        if (this.vmInstance.memory) {
            return this.vmInstance.memory;
        }
        
        return this.state.memory;
    }
    
    // Get memory size
    getMemorySize() {
        if (!this.vmConnected || !this.vmInstance) {
            return this.state.memory ? this.state.memory.length : 0;
        }
        
        if (this.vmInstance.getMemorySize) {
            return this.vmInstance.getMemorySize();
        }
        
        if (this.vmInstance.memory) {
            return this.vmInstance.memory.length;
        }
        
        return 0;
    }
    
    // Custom VM-specific method call
    // Allows calling any method on the VM without interface changes
    callVMMethod(methodName, ...args) {
        if (!this.vmConnected || !this.vmInstance) {
            throw new Error('No VM connected');
        }
        
        if (!this.vmInstance[methodName] || typeof this.vmInstance[methodName] !== 'function') {
            throw new Error(`Method ${methodName} not found on connected VM`);
        }
        
        const result = this.vmInstance[methodName](...args);
        this.updateState();
        return result;
    }
}

module.exports = VMInterface;
