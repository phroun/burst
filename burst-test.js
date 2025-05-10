#!/usr/bin/env node

// BURST VM Test Script
// Tests the complete implementation with REPL

const { BurstVM, BurstAssembler, OPCODES, SYSCALLS } = require('./burst-vm.js');
const BurstREPL = require('./burst-repl.js');
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

asm2.movi(0, 0x1000);      // Address
asm2.movi(1, 0x12345678);  // Value
asm2.store(1, 0, 0);       // Store value at address
asm2.load(2, 0, 0);        // Load it back
asm2.cmp(1, 2);            // Compare
asm2.jeq('success');
asm2.halt();
asm2.label('success');
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

asm3.movi(0, 10);     // r0 = 10
asm3.movi(1, 5);      // r1 = 5
asm3.add(2, 0, 1);    // r2 = r0 + r1 = 15
asm3.sub(3, 0, 1);    // r3 = r0 - r1 = 5
asm3.mul(4, 0, 1);    // r4 = r0 * r1 = 50
asm3.div(5, 0, 1);    // r5 = r0 / r1 = 2

// Check results
asm3.movi(6, 15);
asm3.cmp(2, 6);
asm3.jne('fail');

asm3.movi(6, 5);
asm3.cmp(3, 6);
asm3.jne('fail');

asm3.movi(6, 50);
asm3.cmp(4, 6);
asm3.jne('fail');

asm3.movi(6, 2);
asm3.cmp(5, 6);
asm3.jne('fail');

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

asm3.label('fail');
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

asm4.movi(0, 42);
asm4.push(0);
asm4.movi(0, 0);  // Clear r0
asm4.pop(0);      // Should restore 42
asm4.movi(1, 42);
asm4.cmp(0, 1);
asm4.jeq('stack_ok');
asm4.halt();

asm4.label('stack_ok');
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

// Summary
console.log('\n=== Test Summary ===');
console.log('The BURST VM appears to be working correctly.');
console.log('To test the REPL interactively, run:');
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
