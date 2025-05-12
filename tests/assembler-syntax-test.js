#!/usr/bin/env node

// Assembler Syntax Test Suite
// Tests all instruction formats and validates proper error detection

const fs = require('fs');
const path = require('path');

// Try to load BurstREPL from different possible locations
let BurstREPL;
try {
    // Then try parent directory
    BurstREPL = require('../lib/burst-repl.js');
} catch (e1) {
    console.error('Could not find burst-repl.js');
    console.error('Current directory:', process.cwd());
    console.error('Script directory:', __dirname);
    process.exit(1);
}

console.log('BurstREPL loaded successfully');

// Test case structure
class TestCase {
    constructor(name, code, shouldPass, expectedError = null) {
        this.name = name;
        this.code = code;
        this.shouldPass = shouldPass;
        this.expectedError = expectedError;
    }
}

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

// Test categories
const testCategories = {
    // Valid syntax tests
    validInstructions: [
        // No operands
        new TestCase('NOP', 'nop', true),
        new TestCase('HALT', 'halt', true),
        new TestCase('RET', 'ret', true),
        new TestCase('SYSCALL', 'syscall', true),
        
        // Single register
        new TestCase('INC register', 'inc r0', true),
        new TestCase('DEC register', 'dec r15', true),
        new TestCase('NEG register', 'neg r7', true),
        new TestCase('NOT register', 'not r3', true),
        new TestCase('PUSH register', 'push r0', true),
        new TestCase('POP register', 'pop r1', true),
        
        // Two registers
        new TestCase('MOV reg,reg', 'mov r0, r1', true),
        new TestCase('CMP reg,reg', 'cmp r5, r10', true),
        
        // Register and immediate
        new TestCase('MOVI reg,imm', 'movi r0, #42', true),
        new TestCase('MOVI reg,hex', 'movi r0, #0xFF', true),
        new TestCase('MOVI reg,negative', 'movi r0, #-10', true),
        new TestCase('MOVI reg,label', 'label1:\nmovi r0, #label1', true),
        
        // Three registers
        new TestCase('ADD reg,reg,reg', 'add r0, r1, r2', true),
        new TestCase('SUB reg,reg,reg', 'sub r3, r4, r5', true),
        new TestCase('MUL reg,reg,reg', 'mul r6, r7, r8', true),
        new TestCase('DIV reg,reg,reg', 'div r9, r10, r11', true),
        new TestCase('MOD reg,reg,reg', 'mod r12, r13, r14', true),
        new TestCase('AND reg,reg,reg', 'and r0, r1, r2', true),
        new TestCase('OR reg,reg,reg', 'or r0, r1, r2', true),
        new TestCase('XOR reg,reg,reg', 'xor r0, r1, r2', true),
        new TestCase('SHL reg,reg,reg', 'shl r0, r1, r2', true),
        new TestCase('SHR reg,reg,reg', 'shr r0, r1, r2', true),
        
        // Memory operations
        new TestCase('LOAD reg,reg,imm', 'load r0, r1, #0', true),
        new TestCase('STORE reg,reg,imm', 'store r0, r1, #4', true),
        new TestCase('LOADB reg,reg,imm', 'loadb r0, r1, #8', true),
        new TestCase('STOREB reg,reg,imm', 'storeb r0, r1, #12', true),
        
        // Jump instructions
        new TestCase('JMP label', 'label1:\njmp label1', true),
        new TestCase('JZ label', 'label1:\njz label1', true),
        new TestCase('JNZ label', 'label1:\njnz label1', true),
        new TestCase('JEQ label', 'label1:\njeq label1', true),
        new TestCase('JNE label', 'label1:\njne label1', true),
        new TestCase('JLT label', 'label1:\njlt label1', true),
        new TestCase('JGT label', 'label1:\njgt label1', true),
        new TestCase('JLE label', 'label1:\njle label1', true),
        new TestCase('JGE label', 'label1:\njge label1', true),
        new TestCase('CALL label', 'label1:\ncall label1', true),
    ],
    
    // Basic invalid syntax tests to verify test framework is working
    basicInvalidTests: [
        // Wrong number of operands
        new TestCase('ADD missing operand', 'add r0, r1', false, 'expects 3 operands'),
        new TestCase('NOP with operand', 'nop r0', false, 'expects 0 operands'),
        new TestCase('Unknown instruction', 'invalid r0, r1', false, 'Unknown mnemonic'),
    ]
};

// Run a single test case
async function runTestCase(testCase) {
    console.log(`  Running test: ${testCase.name}`);
    
    try {
        const repl = new BurstREPL();
        
        // Create a temporary file
        const tempFile = `test_${Date.now()}.asm`;
        fs.writeFileSync(tempFile, testCase.code);
        
        let assemblyError = null;
        
        try {
            // Suppress console output
            const originalLog = console.log;
            const originalError = console.error;
            let errorCaptured = null;
            
            console.log = () => {};
            console.error = (msg) => {
                console.error = originalError; // Restore immediately
                console.error(`  DEBUG: Console error: ${msg}`);
                if (msg.includes('Assembly failed:')) {
                    errorCaptured = msg.replace('Assembly failed: ', '');
                }
            };
            
            try {
                console.log = originalLog; // Temporarily restore for debugging
                console.log(`  DEBUG: Calling assemble with ${tempFile}`);
                console.log = () => {}; // Suppress again
                
                await repl.assemble([tempFile]);
                
                console.log = originalLog;
                console.log(`  DEBUG: Assembly succeeded`);
            } catch (error) {
                console.log = originalLog;
                console.log(`  DEBUG: Assembly threw error: ${error.message}`);
                assemblyError = error;
            }
            
            // If an error was captured via console.error, treat it as an assembly failure
            if (errorCaptured && !assemblyError) {
                assemblyError = new Error(errorCaptured);
            }
        } finally {
            // Clean up
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            const binFile = tempFile.replace('.asm', '.bin');
            if (fs.existsSync(binFile)) fs.unlinkSync(binFile);
        }
        
        // Determine test result
        if (assemblyError) {
            // Assembly failed
            if (!testCase.shouldPass) {
                // Expected failure
                if (testCase.expectedError && !assemblyError.message.includes(testCase.expectedError)) {
                    return { 
                        passed: false, 
                        error: `Expected error containing "${testCase.expectedError}" but got "${assemblyError.message}"` 
                    };
                }
                return { passed: true };
            } else {
                // Unexpected failure
                return { 
                    passed: false, 
                    error: `Expected success but got error: ${assemblyError.message}` 
                };
            }
        } else {
            // Assembly succeeded
            if (testCase.shouldPass) {
                return { passed: true };
            } else {
                return { 
                    passed: false, 
                    error: `Expected failure but assembly succeeded` 
                };
            }
        }
    } catch (error) {
        console.error(`  ERROR in test framework: ${error.message}`);
        console.error(error.stack);
        return {
            passed: false,
            error: `Test framework error: ${error.message}`
        };
    }
}

// Run all tests
async function runAllTests() {
    console.log(colorize('Assembler Syntax Test Suite', 'bold'));
    console.log(colorize('===========================', 'bold'));
    console.log();
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    for (const [categoryName, tests] of Object.entries(testCategories)) {
        console.log(colorize(`\n${categoryName}:`, 'cyan'));
        
        for (const test of tests) {
            totalTests++;
            try {
                const result = await runTestCase(test);
                
                if (result.passed) {
                    console.log(colorize(`  ✓ ${test.name}`, 'green'));
                    passedTests++;
                } else {
                    console.log(colorize(`  ✗ ${test.name}`, 'red'));
                    console.log(colorize(`    ${result.error}`, 'red'));
                    failedTests++;
                }
            } catch (error) {
                console.log(colorize(`  ✗ ${test.name}`, 'red'));
                console.log(colorize(`    Test framework error: ${error.message}`, 'red'));
                failedTests++;
            }
        }
    }
    
    // Summary
    console.log();
    console.log(colorize('Test Summary', 'bold'));
    console.log(colorize('============', 'bold'));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${colorize(passedTests, 'green')}`);
    console.log(`Failed: ${colorize(failedTests, 'red')}`);
    
    if (failedTests === 0) {
        console.log(colorize('\n✓ All syntax tests passed!', 'green'));
    } else {
        console.log(colorize('\n✗ Some syntax tests failed!', 'red'));
    }
    
    process.exit(failedTests > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
    console.log('Starting test suite...');
    runAllTests().catch(error => {
        console.error('Error running tests:', error);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { runTestCase, runAllTests };
