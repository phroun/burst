// Basic usage example for BURST VM
const { BurstVM, BurstAssembler } = require('../burst-vm.js');

// Create a simple program
function createProgram() {
    const asm = new BurstAssembler();
    
    // Simple program that adds two numbers
    asm.movi(1, 5);    // R1 = 5
    asm.movi(2, 7);    // R2 = 7
    asm.add(3, 1, 2);  // R3 = R1 + R2
    asm.halt();
    
    return asm.getProgram();
}

// Create a new VM instance
const vm = new BurstVM();

// Load and run a program
const program = createProgram();
vm.loadProgram(program);
vm.run();

// Check the result
console.log('Result in R3:', vm.registers[3]); // Should print 12
