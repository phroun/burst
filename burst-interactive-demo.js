#!/usr/bin/env node

// BURST VM Interactive Demo
// Run this to see the VM in action

const BurstREPL = require('./lib/burst-repl.js');
const fs = require('fs');

console.log('=== BURST VM Interactive Demo ===\n');

// Create examples directory if it doesn't exist
if (!fs.existsSync('examples')) {
    fs.mkdirSync('examples');
}

// Create a demo program
const demoProgram = `
; BURST VM Interactive Demo
; This program demonstrates basic VM operations

main:
    jmp start
    
banner:
    .string "=== BURST VM ==="
newline:
    .byte 10
prompt:
    .string "> "
    
start:
    ; Print banner
    movi r1, #banner
    movi r2, #16
    movi r0, #30    ; SYS_PRINT
    syscall
    
    ; Print newline
    movi r1, #10
    movi r0, #32    ; SYS_PUTCHAR
    syscall
    
    ; Demo counter
    movi r5, #0     ; Counter
    
countdown:
    ; Print prompt
    movi r1, #prompt
    movi r2, #2
    movi r0, #30
    syscall
    
    ; Print counter
    mov r1, r5
    movi r2, #48    ; '0'
    add r1, r1, r2
    movi r0, #32
    syscall
    
    ; Newline
    movi r1, #10
    syscall
    
    ; Increment and check
    inc r5
    movi r6, #5
    cmp r5, r6
    jlt countdown
    
    ; Final message
    movi r1, #prompt
    movi r2, #2
    movi r0, #30
    syscall
    
    halt
`;

// Save the demo program
fs.writeFileSync('examples/demo.asm', demoProgram);

console.log('Created examples/demo.asm');
console.log('Starting BURST REPL...\n');
console.log('Commands to try:');
console.log('1. assemble examples/demo.asm -l');
console.log('2. run');
console.log('3. reset');
console.log('4. step 10');
console.log('5. info regs');
console.log('6. disasm 0 10');
console.log('7. movi r0, #42');
console.log('8. help\n');

// Start the REPL
const repl = new BurstREPL();

// Auto-run some commands to show functionality
console.log('Auto-running demo commands...\n');

setTimeout(async () => {
    try {
        // Use await to handle async operations properly
        await repl.handleCommand('assemble examples/demo.asm -l');
        
        setTimeout(async () => {
            await repl.handleCommand('info regs');
            
            setTimeout(async () => {
                await repl.handleCommand('run');
                
                setTimeout(() => {
                    console.log('\nNow try your own commands!');
                    console.log('Type "help" for a list of available commands.');
                    console.log('Type "quit" or press Ctrl+C to quit.\n');
                    
                    // Now start the REPL properly
                    repl.start();
                }, 1000);
            }, 1000);
        }, 1000);
    } catch (error) {
        console.error('Error during demo:', error);
        repl.start();
    }
}, 500);

// Clean up on exit
process.on('exit', () => {
    console.log('Cleaning up.');
    if (fs.existsSync('examples/demo.asm')) fs.unlinkSync('examples/demo.asm');
    if (fs.existsSync('examples/demo.bin')) fs.unlinkSync('examples/demo.bin');
    
    // Remove the examples directory if it's empty
    if (fs.existsSync('examples') && fs.readdirSync('examples').length === 0) {
        fs.rmdirSync('examples');
    }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\nExiting BURST demo...');
    process.exit(0);
});