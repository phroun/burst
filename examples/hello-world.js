// Hello World example for BURST VM
const { BurstVM, BurstAssembler, SYSCALLS } = require('../burst-vm.js');

function createHelloWorldProgram() {
    const asm = new BurstAssembler();
    
    // Jump to main
    asm.jmp('main');
    
    // String data
    asm.label('hello_str');
    asm.string('Hello, World!');
    
    // Main program
    asm.label('main');
    asm.movi(1, 4); // R1 = address of hello_str (4)
    asm.movi(2, 13); // R2 = length of string
    asm.movi(0, SYSCALLS.SYS_PRINT); // R0 = SYS_PRINT
    asm.syscall();
    
    asm.movi(0, SYSCALLS.SYS_EXIT); // R0 = SYS_EXIT
    asm.movi(1, 0); // R1 = exit code 0
    asm.syscall();
    
    asm.halt();
    
    return asm.getProgram();
}

// Create and run the VM
const vm = new BurstVM();
const program = createHelloWorldProgram();

console.log('Loading program...');
vm.loadProgram(program);

console.log('Starting BURST VM...');
vm.run();

console.log('VM halted. Output:', vm.output);
