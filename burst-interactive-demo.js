#!/usr/bin/env node

// BURST VM Interactive Demo
// Run this to see the VM in action

const BurstREPL = require('./burst-repl.js');
const fs = require('fs');

console.log('=== BURST VM Interactive Demo ===\n');

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
fs.writeFileSync('demo.asm', demoProgram);

console.log('Created demo.asm');
console.log('Starting BURST REPL...\n');
console.log('Commands to try:');
console.log('1. assemble demo.asm -l');
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
setTimeout(() => {
    console.log('\nAuto-running demo commands...\n');
    repl.handleCommand('assemble demo.asm -l');
    
    setTimeout(() => {
        repl.handleCommand('info regs');
        
        setTimeout(() => {
            repl.handleCommand('run');
            
            setTimeout(() => {
                console.log('\nNow try your own commands!');
                console.log('Type "help" for a list of available commands.');
                repl.rl.prompt();
            }, 1000);
        }, 1000);
    }, 1000);
}, 1000);

// Clean up on exit
process.on('exit', () => {
    if (fs.existsSync('demo.asm')) fs.unlinkSync('demo.asm');
    if (fs.existsSync('demo.bin')) fs.unlinkSync('demo.bin');
});
