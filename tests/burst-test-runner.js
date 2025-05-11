#!/usr/bin/env node

// BURST VM Test Runner
// Runs all test suites and provides detailed diagnostics

const fs = require('fs');
const path = require('path');
const { BurstVM, BurstAssembler } = require('../burst-vm.js');
const BurstREPL = require('../burst-repl.js');

// Test files
const testFiles = [
    { name: 'Arithmetic Tests', file: 'test-arithmetic.asm' },
    { name: 'Logical Tests', file: 'test-logical.asm' },
    { name: 'Memory Tests', file: 'test-memory.asm' },
    { name: 'Control Flow Tests', file: 'test-control.asm' },
    { name: 'System Tests', file: 'test-system.asm' },
    { name: 'Register Tests', file: 'test-registers.asm' }
];

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

// Check if test files exist
function checkTestFiles() {
    let allExist = true;
    for (const testFile of testFiles) {
        if (!fs.existsSync(testFile.file)) {
            console.error(colorize(`Missing test file: ${testFile.file}`, 'red'));
            allExist = false;
        }
    }
    return allExist;
}

// Run a single test
async function runTest(testFile) {
    console.log(`\n${colorize(`Running ${testFile.name}...`, 'bold')}`);
    
    try {
        // Create a new REPL instance for assembling
        const repl = new BurstREPL();
        
        // Suppress assembler output
        const originalConsoleLog = console.log;
        console.log = () => {};
        
        // Assemble the test file
        await repl.assemble([testFile.file]);
        
        // Restore console.log
        console.log = originalConsoleLog;
        
        // Create a new VM instance
        const vm = new BurstVM();
        
        // Load the assembled program
        const binFile = testFile.file.replace('.asm', '.bin');
        if (!fs.existsSync(binFile)) {
            throw new Error(`Failed to create binary file: ${binFile}`);
        }
        
        const program = fs.readFileSync(binFile);
        vm.loadProgram(new Uint8Array(program));
        
        // Capture console output
        let capturedOutput = '';
        const originalLog = console.log;
        console.log = (...args) => {
            // Capture the output
            const output = args.join(' ');
            capturedOutput += output + '\n';
            
            // Still show debug output
            if (output.includes('Labels found:') || output.includes('Assembled')) {
                // Skip assembler output
                return;
            }
        };
        
        // Run the program
        const startTime = Date.now();
        vm.run();
        const endTime = Date.now();
        
        // Restore console.log
        console.log = originalLog;
        
        // Also capture VM output field
        if (vm.output) {
            capturedOutput += vm.output;
        }
        
        // Parse results
        const lines = capturedOutput.split('\n');
        let passCount = 0;
        let failCount = 0;
        
        for (const line of lines) {
            if (line.includes('PASS:')) {
                passCount++;
                console.log(colorize(`  ✓ ${line}`, 'green'));
            } else if (line.includes('FAIL:')) {
                failCount++;
                console.log(colorize(`  ✗ ${line}`, 'red'));
            } else if (line.includes('===')) {
                console.log(colorize(`  ${line}`, 'cyan'));
            } else if (line.trim() && !line.includes('Labels found') && !line.includes('Assembled')) {
                console.log(`    ${line}`);
            }
        }
        
        // Show summary
        console.log(`\n  Execution time: ${endTime - startTime}ms`);
        console.log(`  Tests passed: ${colorize(passCount, 'green')}`);
        console.log(`  Tests failed: ${colorize(failCount, 'red')}`);
        
        // Show register state if tests failed
        if (failCount > 0) {
            console.log(colorize('\n  Register state at halt:', 'yellow'));
            for (let i = 0; i < 16; i++) {
                console.log(`    R${i}: 0x${vm.registers[i].toString(16).padStart(8, '0')} (${vm.registers[i]})`);
            }
            console.log(`    PC: 0x${vm.pc.toString(16).padStart(8, '0')}`);
            console.log(`    SP: 0x${vm.sp.toString(16).padStart(8, '0')}`);
            console.log(`    Flags: ${vm.flags.toString(2).padStart(8, '0')}`);
        }
        
        return { pass: passCount, fail: failCount };
        
    } catch (error) {
        console.error(colorize(`  Error: ${error.message}`, 'red'));
        console.error(error.stack);
        return { pass: 0, fail: 1 };
    }
}

// Clean up binary files
function cleanupBinaryFiles() {
    for (const testFile of testFiles) {
        const binFile = testFile.file.replace('.asm', '.bin');
        if (fs.existsSync(binFile)) {
            fs.unlinkSync(binFile);
        }
    }
}

// Run all tests
async function runAllTests() {
    console.log(colorize('BURST VM Test Suite', 'bold'));
    console.log(colorize('===================', 'bold'));
    
    // Check if test files exist
    if (!checkTestFiles()) {
        console.error(colorize('\nPlease create the missing test files first.', 'red'));
        console.log('\nYou need to save the test files from the artifacts:');
        console.log('  - test-arithmetic.asm');
        console.log('  - test-logical.asm');
        console.log('  - test-memory.asm');
        console.log('  - test-control.asm');
        console.log('  - test-system.asm');
        console.log('  - test-registers.asm');
        process.exit(1);
    }
    
    let totalPass = 0;
    let totalFail = 0;
    
    for (const testFile of testFiles) {
        const result = await runTest(testFile);
        totalPass += result.pass;
        totalFail += result.fail;
    }
    
    // Final summary
    console.log(colorize('\n=== Test Summary ===', 'bold'));
    console.log(`Total tests passed: ${colorize(totalPass, 'green')}`);
    console.log(`Total tests failed: ${colorize(totalFail, 'red')}`);
    
    if (totalFail === 0) {
        console.log(colorize('\n✓ All tests passed!', 'green'));
    } else {
        console.log(colorize('\n✗ Some tests failed!', 'red'));
    }
    
    // Cleanup and exit
    cleanupBinaryFiles();
    process.exit(totalFail > 0 ? 1 : 0);
}

// Export for use
module.exports = {
    runAllTests,
    runTest
};

// Run tests if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === '--file' && args[1]) {
        // Run a specific test file
        const testFile = testFiles.find(tf => tf.file === args[1]);
        if (testFile) {
            runTest(testFile)
                .then(result => {
                    cleanupBinaryFiles();
                    process.exit(result.fail > 0 ? 1 : 0);
                })
                .catch(error => {
                    console.error(error);
                    process.exit(1);
                });
        } else {
            console.error(colorize(`Test file not found: ${args[1]}`, 'red'));
            process.exit(1);
        }
    } else {
        // Run all tests
        runAllTests().catch(error => {
            console.error(error);
            process.exit(1);
        });
    }
}
