#!/usr/bin/env node

// Debug Test Runner
// Shows detailed information about VM execution

const fs = require('fs');
const { BurstVM } = require('../burst-vm.js');
const BurstREPL = require('../burst-repl.js');

async function debugTest(filename) {
    console.log(`\nDebugging ${filename}...`);
    
    try {
        // Create REPL and assemble
        const repl = new BurstREPL();
        await repl.assemblyCommands.cmdAssemble([filename]);
        
        // Create VM
        const vm = new BurstVM();
        
        // Load program
        const binFile = filename.replace('.asm', '.bin');
        const program = fs.readFileSync(binFile);
        vm.loadProgram(new Uint8Array(program));
        
        console.log('\nProgram loaded. Starting execution...');
        
        // Track all syscalls
        const originalExecuteSyscall = vm.executeSyscall.bind(vm);
        vm.executeSyscall = function(syscallNum) {
            console.log(`\nSYSCALL: ${syscallNum}`);
            console.log(`  R0: ${vm.registers[0]}`);
            console.log(`  R1: ${vm.registers[1]}`);
            console.log(`  R2: ${vm.registers[2]}`);
            
            if (syscallNum === 30) { // SYS_PRINT
                const ptr = vm.registers[1];
                const length = vm.registers[2];
                let str = '';
                for (let i = 0; i < length; i++) {
                    str += String.fromCharCode(vm.readByte(ptr + i));
                }
                console.log(`  String at ${ptr}: "${str}"`);
            }
            
            originalExecuteSyscall(syscallNum);
            
            console.log(`  After syscall - R0: ${vm.registers[0]}`);
            console.log(`  VM output: "${vm.output}"`);
        };
        
        // Track instruction execution
        let instructionCount = 0;
        const originalStep = vm.step.bind(vm);
        vm.step = function() {
            const pc = vm.pc;
            const instruction = vm.readWord(pc);
            const opcode = instruction >> 24;
            
            console.log(`\nStep ${instructionCount++}:`);
            console.log(`  PC: 0x${pc.toString(16)}`);
            console.log(`  Instruction: 0x${instruction.toString(16)}`);
            console.log(`  Opcode: 0x${opcode.toString(16)}`);
            
            const result = originalStep();
            
            console.log(`  After step - PC: 0x${vm.pc.toString(16)}`);
            
            return result;
        };
        
        // Run the VM
        vm.run();
        
        console.log('\nExecution complete.');
        console.log(`Final VM output: "${vm.output}"`);
        
        // Show final state
        console.log('\nFinal registers:');
        for (let i = 0; i < 4; i++) {
            console.log(`  R${i}: ${vm.registers[i]}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run debug test
const filename = process.argv[2] || 'simple-output-test.asm';
debugTest(filename);
