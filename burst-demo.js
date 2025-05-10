#!/usr/bin/env node

// BURST VM REPL Demo
// This script demonstrates the features of the BURST REPL

const BurstREPL = require('./burst-repl.js');
const fs = require('fs');

// Create example files
const examples = {
    'examples/hello.asm': `
; Simple hello world program
main:
    jmp start
    
hello_str:
    .string "Hello, BURST World!"
    
start:
    movi r1, #hello_str    ; String address
    movi r2, #19           ; String length  
    movi r0, #30           ; SYS_PRINT
    syscall
    
    movi r0, #20           ; SYS_EXIT
    movi r1, #0            ; Exit code
    syscall
    halt
`,
    'examples/counter.asm': `
; Count from 0 to 9
main:
    movi r0, #0            ; Counter
    
loop:
    ; Print digit
    mov r1, r0
    movi r2, #48           ; ASCII '0'
    add r1, r1, r2         ; Convert to ASCII
    push r0                ; Save counter
    
    movi r0, #32           ; SYS_PUTCHAR
    syscall
    
    ; Print newline
    movi r1, #10
    syscall
    
    pop r0                 ; Restore counter
    inc r0
    movi r3, #10
    cmp r0, r3
    jlt loop
    
    halt
`,
    'examples/calc.asm': `
; Simple calculator demo
main:
    movi r0, #10           ; First number
    movi r1, #5            ; Second number
    
    ; Add
    add r2, r0, r1         ; r2 = 15
    
    ; Subtract
    sub r3, r0, r1         ; r3 = 5
    
    ; Multiply
    mul r4, r0, r1         ; r4 = 50
    
    ; Divide
    div r5, r0, r1         ; r5 = 2
    
    ; Store results in memory
    movi r6, #0x1000       ; Base address
    store r2, r6, #0       ; Store sum
    store r3, r6, #4       ; Store difference
    store r4, r6, #8       ; Store product
    store r5, r6, #12      ; Store quotient
    
    halt
`
};

// Create example files
console.log('Creating example assembly files...');
for (const [filename, content] of Object.entries(examples)) {
    fs.writeFileSync(filename, content);
    console.log(`Created ${filename}`);
}

// Demo script
console.log('\n=== BURST VM REPL Demo ===\n');

console.log('The BURST REPL provides an interactive environment for:');
console.log('- Running and debugging BURST programs');
console.log('- Assembling code on the fly');
console.log('- Setting breakpoints and watchpoints');
console.log('- Examining memory and registers');
console.log('- Single-stepping through code\n');

console.log('Example commands to try:');
console.log('  help                    - Show all commands');
console.log('  assemble hello.asm -l   - Assemble and load hello.asm');
console.log('  run                     - Run the loaded program');
console.log('  reset                   - Reset the VM');
console.log('  load hello.bin          - Load a binary file');
console.log('  break 0x0               - Set breakpoint at address 0');
console.log('  step                    - Single step execution');
console.log('  info regs               - Show all registers');
console.log('  info mem 0x0 32         - Show 32 bytes at address 0');
console.log('  disasm 0x0 10           - Disassemble 10 instructions');
console.log('  set r0 42               - Set register r0 to 42');
console.log('  print r0                - Print register value');
console.log('  movi r0, #100           - Execute instruction directly\n');

console.log('You can also enter assembly instructions directly:');
console.log('  movi r0, #42');
console.log('  add r1, r0, r0');
console.log('  syscall\n');

console.log('Starting REPL...\n');

// Start the REPL
const repl = new BurstREPL();
repl.start();
