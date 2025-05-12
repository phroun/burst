#!/usr/bin/env node

// Test runner for BURST ISA Addendum
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('=== BURST ISA Addendum Test Suite ===\n');

// Run JavaScript unit tests
console.log('1. Running JavaScript unit tests...');
const jsTests = spawn('node', ['test-isa-addendum.js'], { stdio: 'inherit' });

jsTests.on('close', (code) => {
    if (code !== 0) {
        console.error('\n❌ JavaScript tests failed');
        process.exit(1);
    }
    
    console.log('\n2. Running assembly tests...');
    
    // First, assemble the test file
    const assembler = spawn('node', ['../lib/burst-repl.js', '-c', 'assemble test-isa-addendum.asm'], {
        stdio: 'inherit'
    });
    
    assembler.on('close', (code) => {
        if (code !== 0) {
            console.error('\n❌ Assembly failed');
            process.exit(1);
        }
        
        // Now run the assembled program
        console.log('\n3. Executing assembled test program...');
        const runner = spawn('node', ['../lib/burst-repl.js', '-c', 'load test-isa-addendum.bin; run'], {
            stdio: 'inherit'
        });
        
        runner.on('close', (code) => {
            if (code !== 0) {
                console.error('\n❌ Execution failed');
                process.exit(1);
            }
            
            console.log('\n✅ All ISA Addendum tests passed!');
        });
    });
});

// Also create a simple visual test
console.log('\n4. Creating visual instruction test...\n');

const { BurstVM, BurstAssembler, OPCODES } = require('../lib/burst-vm.js');

function formatHex(value, width = 8) {
    return '0x' + value.toString(16).padStart(width, '0').toUpperCase();
}

// Create a visual test of some instructions
const vm = new BurstVM();
const asm = new BurstAssembler();

console.log('Demonstrating new instructions:\n');

// LIMM demonstration
asm.limm(1, 0x12345678);
let program = asm.getProgram();
console.log('LIMM R1, #0x12345678');
console.log(`  Bytes: ${Array.from(program).map(b => formatHex(b, 2)).join(' ')}`);
console.log(`  Size: ${program.length} bytes (two-word instruction)\n`);

// ADDI demonstration
asm.address = 0;
asm.output = [];
asm.addi(2, 1, -10);
program = asm.getProgram();
console.log('ADDI R2, R1, #-10');
console.log(`  Bytes: ${Array.from(program).map(b => formatHex(b, 2)).join(' ')}`);
console.log(`  Encoding: [ADDI:0x4D][Dest:R2][Src:R1][Imm:-10]\n`);

// Conditional move demonstration
asm.address = 0;
asm.output = [];
asm.movz(3, 4);
program = asm.getProgram();
console.log('MOVZ R3, R4');
console.log(`  Bytes: ${Array.from(program).map(b => formatHex(b, 2)).join(' ')}`);
console.log(`  Encoding: [MOVZ:0x61][Dest:R3][Src:R4]\n`);

// Show opcode table for new instructions
console.log('New Opcode Summary:');
console.log('-------------------');
const newOpcodes = [
    ['LIMM', 0x43, 'Load 32-bit immediate'],
    ['ENTER', 0x46, 'Enter stack frame'],
    ['LEAVE', 0x47, 'Leave stack frame'],
    ['CALLI', 0x48, 'Indirect call'],
    ['JMPR', 0x49, 'Indirect jump'],
    ['ROL', 0x4A, 'Rotate left'],
    ['ROR', 0x4B, 'Rotate right'],
    ['SAR', 0x4C, 'Shift arithmetic right'],
    ['ADDI', 0x4D, 'Add immediate'],
    ['CMPI', 0x4E, 'Compare immediate'],
    ['TRAP', 0x4F, 'Software trap'],
    ['MOVC-MOVNE', '0x60-0x67', 'Conditional moves']
];

newOpcodes.forEach(([mnemonic, opcode, description]) => {
    if (typeof opcode === 'number') {
        console.log(`  ${mnemonic.padEnd(10)} ${formatHex(opcode, 2)}  ${description}`);
    } else {
        console.log(`  ${mnemonic.padEnd(10)} ${opcode}  ${description}`);
    }
});

console.log('\n=== Test suite complete ===');
