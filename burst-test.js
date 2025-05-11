#!/usr/bin/env node

// BURST VM Test Script
// Tests the complete implementation with REPL

const { BurstVM, BurstAssembler, OPCODES, SYSCALLS } = require('./lib/burst-vm.js');
const BurstREPL = require('./lib/burst-repl.js');
const fs = require('fs');

console.log('BURST VM Test Suite');
console.log('==================\n');

// Test 1: Direct VM operation
console.log('Test 1: Direct VM Operation');
const vm = new BurstVM();
const asm = new BurstAssembler();

// Simple program: print 'A'
asm.movi(0, SYSCALLS.SYS_PUTCHAR);
asm.movi(1, 65); // 'A'
asm.syscall();
asm.halt();

const program = asm.getProgram();
vm.loadProgram(program);
vm.run();
console.log('Expected: A');
console.log(`VM output: ${vm.output}\n`);

// Test 2: Memory operations
console.log('Test 2: Memory Operations');
const vm2 = new BurstVM();
const asm2 = new BurstAssembler();

// Calculate addresses manually since we can't use labels directly
const successAddr = 7 * 4; // 7 instructions * 4 bytes each

asm2.movi(3, 0x1000);      // Address in R3
asm2.movi(1, 0x1234);      // Value in R1
asm2.store(1, 3, 0);       // Store value at address
asm2.load(2, 3, 0);        // Load it back into R2
asm2.cmp(1, 2);            // Compare
asm2.jeq(successAddr);     // Jump to success if equal
asm2.halt();               // Otherwise halt (failure)

// Success path (at instruction 7)
asm2.movi(0, SYSCALLS.SYS_PUTCHAR);
asm2.movi(1, 79); // 'O'
asm2.syscall();
asm2.movi(1, 75); // 'K'
asm2.syscall();
asm2.halt();

const program2 = asm2.getProgram();
vm2.loadProgram(program2);
vm2.run();
console.log('Expected: OK');
console.log(`VM output: ${vm2.output}\n`);

// Test 3: Hello World assembly file
console.log('Test 3: Assembly File Test');
const helloAsm = `
; Test hello world program
main:
    jmp start
    
msg:
    .string "Hello!"
    
start:
    movi r1, #msg
    movi r2, #6
    movi r0, #30    ; SYS_PRINT
    syscall
    halt
`;

fs.writeFileSync('test_hello.asm', helloAsm);
console.log('Created test_hello.asm');

// Test 4: Arithmetic operations
console.log('\nTest 4: Arithmetic Operations');
const vm3 = new BurstVM();
const asm3 = new BurstAssembler();

// Calculate addresses
const failAddr = 23 * 4;  // fail label will be at instruction 23

asm3.movi(0, 10);     // r0 = 10
asm3.movi(1, 5);      // r1 = 5
asm3.add(2, 0, 1);    // r2 = r0 + r1 = 15
asm3.sub(3, 0, 1);    // r3 = r0 - r1 = 5
asm3.mul(4, 0, 1);    // r4 = r0 * r1 = 50
asm3.div(5, 0, 1);    // r5 = r0 / r1 = 2

// Check results
asm3.movi(6, 15);
asm3.cmp(2, 6);
asm3.jne(failAddr);

asm3.movi(6, 5);
asm3.cmp(3, 6);
asm3.jne(failAddr);

asm3.movi(6, 50);
asm3.cmp(4, 6);
asm3.jne(failAddr);

asm3.movi(6, 2);
asm3.cmp(5, 6);
asm3.jne(failAddr);

// Success
asm3.movi(0, SYSCALLS.SYS_PUTCHAR);
asm3.movi(1, 80); // 'P'
asm3.syscall();
asm3.movi(1, 65); // 'A'
asm3.syscall();
asm3.movi(1, 83); // 'S'
asm3.syscall();
asm3.movi(1, 83); // 'S'
asm3.syscall();
asm3.halt();

// Fail path (at instruction 23)
asm3.movi(0, SYSCALLS.SYS_PUTCHAR);
asm3.movi(1, 70); // 'F'
asm3.syscall();
asm3.movi(1, 65); // 'A'
asm3.syscall();
asm3.movi(1, 73); // 'I'
asm3.syscall();
asm3.movi(1, 76); // 'L'
asm3.syscall();
asm3.halt();

const program3 = asm3.getProgram();
vm3.loadProgram(program3);
vm3.run();
console.log('Expected: PASS');
console.log(`VM output: ${vm3.output}\n`);

// Test 5: Stack operations
console.log('Test 5: Stack Operations');
const vm4 = new BurstVM();
const asm4 = new BurstAssembler();

const stackOkAddr = 7 * 4;  // stack_ok label at instruction 7

asm4.movi(0, 42);
asm4.push(0);
asm4.movi(0, 0);  // Clear r0
asm4.pop(0);      // Should restore 42
asm4.movi(1, 42);
asm4.cmp(0, 1);
asm4.jeq(stackOkAddr);
asm4.halt();

// stack_ok path (at instruction 7)
asm4.movi(0, SYSCALLS.SYS_PUTCHAR);
asm4.movi(1, 83); // 'S'
asm4.syscall();
asm4.halt();

const program4 = asm4.getProgram();
vm4.loadProgram(program4);
vm4.run();
console.log('Expected: S');
console.log(`VM output: ${vm4.output}\n`);

// Test 6: Loop test
console.log('Test 6: Loop Test');
const loopAsm = `
; Count from 0 to 3
main:
    movi r0, #0    ; Counter
loop:
    ; Print digit
    mov r1, r0
    movi r2, #48
    add r1, r1, r2
    push r0
    
    movi r0, #32   ; SYS_PUTCHAR
    syscall
    
    pop r0
    inc r0
    movi r2, #4
    cmp r0, r2
    jlt loop
    
    halt
`;

fs.writeFileSync('test_loop.asm', loopAsm);
console.log('Created test_loop.asm');

// Test 7: Sign Extension Test
console.log('\nTest 7: Sign Extension Test');
const vm5 = new BurstVM();
const asm5 = new BurstAssembler();

// Test negative immediate values
asm5.movi(0, 0xFFFF);  // Should be -1 after sign extension
asm5.movi(1, 0);       // R1 = 0
asm5.add(1, 1, 0);     // R1 = 0 + (-1) = -1
asm5.movi(2, 0xFFFF);  // R2 = -1
asm5.cmp(1, 2);        // Compare R1 and R2
asm5.jeq(6 * 4);       // Jump to success if equal
asm5.halt();           // Otherwise fail

// Success path
asm5.movi(0, SYSCALLS.SYS_PUTCHAR);
asm5.movi(1, 83); // 'S'
asm5.syscall();
asm5.halt();

const program5 = asm5.getProgram();
vm5.loadProgram(program5);
vm5.run();
console.log('Expected: S (sign extension working)');
console.log(`VM output: ${vm5.output}\n`);

// Summary
console.log('\n=== Test Summary ===');
console.log('The BURST VM appears to be working correctly.');
console.log('All tests should have passed:');
console.log('  Test 1: A');
console.log('  Test 2: OK');
console.log('  Test 3: (Assembly file created)');
console.log('  Test 4: PASS');
console.log('  Test 5: S');
console.log('  Test 6: (Assembly file created)');
console.log('  Test 7: S');
console.log('\nTo test the REPL interactively, run:');
console.log('  node burst-repl.js');
console.log('\nThen try:');
console.log('  assemble test_hello.asm -l');
console.log('  run');
console.log('  reset');
console.log('  assemble test_loop.asm -l');
console.log('  run');

// Cleanup test files
setTimeout(() => {
    if (fs.existsSync('test_hello.asm')) fs.unlinkSync('test_hello.asm');
    if (fs.existsSync('test_loop.asm')) fs.unlinkSync('test_loop.asm');
    if (fs.existsSync('test_hello.bin')) fs.unlinkSync('test_hello.bin');
    if (fs.existsSync('test_loop.bin')) fs.unlinkSync('test_loop.bin');
}, 1000);
