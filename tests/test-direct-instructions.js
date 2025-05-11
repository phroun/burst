// Test direct assembly instruction input in BURST REPL

const BurstREPL = require('../burst-repl');

async function testDirectInstructions() {
    console.log('Testing direct assembly instruction input...\n');
    
    const repl = new BurstREPL();
    
    // Test cases
    const instructions = [
        'movi r0, #0x1234',     // Load immediate
        'movi r1, #0x5678',     // Load immediate
        'add r2, r0, r1',       // Add registers
        'mov r3, r2',           // Move register
        'push r3',              // Push to stack
        'pop r4',               // Pop from stack
        'inc r4',               // Increment
        'nop',                  // No operation
    ];
    
    console.log('Testing instructions:');
    for (const instruction of instructions) {
        console.log(`  > ${instruction}`);
        try {
            await repl.assemblyCommands.parseAssemblyLine(instruction);
            console.log('    ✓ Success');
        } catch (error) {
            console.log(`    ✗ Error: ${error.message}`);
        }
    }
    
    // Show registers to verify
    console.log('\nRegister state after instructions:');
    repl.vm.dumpRegisters();
    
    // Disassemble the assembled instructions
    console.log('\nDisassembled instructions:');
    let addr = 0;
    for (let i = 0; i < instructions.length; i++) {
        const instruction = repl.vm.readWord(addr);
        const disasm = repl.disassembler.disassembleInstruction(repl.vm, addr, instruction);
        console.log(`0x${addr.toString(16).padStart(8, '0')}: ${disasm}`);
        addr += 4;
    }
    
    // Clean up - close the readline interface
    repl.rl.close();
    
    console.log('\nTest completed successfully!');
}

// Run test
if (require.main === module) {
    testDirectInstructions()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = testDirectInstructions;
