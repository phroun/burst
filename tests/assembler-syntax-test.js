#!/usr/bin/env node

// Assembler Syntax Test Suite
// Tests all instruction formats and validates proper error detection

const fs = require('fs');
const BurstREPL = require('../burst-repl.js');

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
        
        // Edge cases for valid syntax
        new TestCase('Register r0', 'mov r0, r0', true),
        new TestCase('Register r15', 'mov r15, r15', true),
        new TestCase('Immediate 0', 'movi r0, #0', true),
        new TestCase('Immediate max', 'movi r0, #0xFFFF', true),
        new TestCase('Label with underscore', '_label:\njmp _label', true),
        new TestCase('Label with digits', 'label123:\njmp label123', true),
        
        // Comments
        new TestCase('Instruction with comment', 'nop ; This is a comment', true),
        new TestCase('Comment only line', '; Just a comment', true),
        new TestCase('Empty line', '', true),
        new TestCase('Whitespace only', '   \t   ', true),
    ],
    
    // Invalid syntax tests
    invalidInstructions: [
        // Wrong number of operands
        new TestCase('ADD missing operand', 'add r0, r1', false, 'expects 3 operands'),
        new TestCase('ADD extra operand', 'add r0, r1, r2, r3', false, 'expects 3 operands'),
        new TestCase('MOV missing operand', 'mov r0', false, 'expects 2 operands'),
        new TestCase('MOV extra operand', 'mov r0, r1, r2', false, 'expects 2 operands'),
        new TestCase('INC missing operand', 'inc', false, 'expects 1 operands'),
        new TestCase('INC extra operand', 'inc r0, r1', false, 'expects 1 operands'),
        new TestCase('NOP with operand', 'nop r0', false, 'expects 0 operands'),
        new TestCase('SYSCALL with operand', 'syscall r0', false, 'expects 0 operands'),
        
        // Wrong operand types
        new TestCase('ADD with immediate', 'add r0, r1, #5', false, 'must be a register'),
        new TestCase('SHL with immediate', 'shl r0, r1, #16', false, 'must be a register'),
        new TestCase('SUB with immediate', 'sub r0, #5, r2', false, 'must be a register'),
        new TestCase('MOV with immediate', 'mov r0, #5', false, 'must be a register'),
        new TestCase('CMP with immediate', 'cmp r0, #5', false, 'must be a register'),
        new TestCase('MOVI with register', 'movi r0, r1', false, 'must be an immediate'),
        new TestCase('JMP with register', 'jmp r0', false, 'must be an address'),
        
        // Invalid register numbers
        new TestCase('Register too high', 'mov r16, r0', false, 'Invalid register'),
        new TestCase('Register negative', 'mov r-1, r0', false, 'Invalid register'),
        new TestCase('Register not a number', 'mov rx, r0', false, 'must be a register'),
        new TestCase('Register missing r', 'mov 0, r1', false, 'must be a register'),
        
        // Invalid immediates
        new TestCase('Immediate without #', 'movi r0, 42', false, 'must be an immediate'),
        new TestCase('Immediate too large', 'movi r0, #0x10000', false, 'out of range'),
        new TestCase('Immediate not a number', 'movi r0, #abc', false, 'Undefined label'),
        
        // Invalid labels
        new TestCase('Undefined label', 'jmp undefined_label', false, 'Undefined label'),
        new TestCase('Label with spaces', 'bad label:\njmp bad label', false, 'Invalid syntax'),
        new TestCase('Label without colon', 'label\njmp label', false, 'Unknown mnemonic'),
        
        // Invalid mnemonics
        new TestCase('Unknown instruction', 'invalid r0, r1', false, 'Unknown mnemonic'),
        new TestCase('Misspelled instruction', 'addd r0, r1, r2', false, 'Unknown mnemonic'),
        new TestCase('Case sensitive', 'ADD r0, r1, r2', false, 'Unknown mnemonic'),
        
        // Memory operation errors
        new TestCase('LOAD without offset', 'load r0, r1', false, 'expects 3 operands'),
        new TestCase('LOAD with register offset', 'load r0, r1, r2', false, 'must be an immediate'),
        new TestCase('STORE with immediate address', 'store r0, #0x1000, #0', false, 'must be a register'),
        
        // Syntax errors
        new TestCase('Missing comma', 'add r0 r1 r2', false, 'expects 3 operands'),
        new TestCase('Extra comma', 'add r0, r1,, r2', false, 'expects 3 operands'), 
        new TestCase('Missing operand after comma', 'add r0, r1,', false, 'operand 3 is missing'),
        new TestCase('Invalid characters', 'add r0, r1, r2!', false, 'Invalid operand'),
    ],
    
    // Directive tests
    directiveTests: [
        // Valid directives
        new TestCase('String directive', '.string "Hello"', true),
        new TestCase('String with escape', '.string "Hello\\nWorld"', true),
        new TestCase('Byte directive', '.byte 65, 66, 67', true),
        new TestCase('Word directive', '.word 0x1234, 0x5678', true),
        new TestCase('Space directive', '.space 100', true),
        
        // Invalid directives
        new TestCase('String without quotes', '.string Hello', false, 'Invalid string literal'),
        new TestCase('String missing close quote', '.string "Hello', false, 'Invalid string literal'),
        new TestCase('Unknown directive', '.invalid 42', false, 'Unknown directive'),
        new TestCase('Byte with invalid value', '.byte abc', false, 'Invalid byte value'),
        new TestCase('Space without value', '.space', false, 'Invalid space size'),
    ],
    
    // Complex edge cases
    edgeCases: [
        // Label placement
        new TestCase('Label on same line as instruction', 'label: nop', true),
        new TestCase('Label on same line as directive', 'data: .byte 42', true),
        new TestCase('Multiple labels', 'label1:\nlabel2:\nnop', true),
        new TestCase('Label only line', 'label:', true),
        
        // Comment edge cases
        new TestCase('Comment with semicolon in string', '.string "Hello;World" ; comment', true),
        new TestCase('Multiple semicolons', 'nop ; comment ; more comment', true),
        new TestCase('Comment with special chars', 'nop ; !@#$%^&*()', true),
        
        // Whitespace variations
        new TestCase('No spaces', 'add r0,r1,r2', true),
        new TestCase('Extra spaces', 'add   r0  ,  r1  ,  r2', true),
        new TestCase('Tabs instead of spaces', 'add\tr0,\tr1,\tr2', true),
        new TestCase('Mixed whitespace', 'add\t r0 ,r1,  r2', true),
    ]
};

// Run a single test case
async function runTestCase(testCase) {
    const repl = new BurstREPL();
    
    // Create a temporary file
    const tempFile = `test_${Date.now()}.asm`;
    fs.writeFileSync(tempFile, testCase.code);
    
    let assemblyError = null;
    
    try {
        // Suppress console output and error output
        const originalLog = console.log;
        const originalError = console.error;
        let errorCaptured = null;
        
        console.log = () => {};
        console.error = (msg) => {
            // Capture error messages from console.error
            if (msg.startsWith('Assembly failed:')) {
                errorCaptured = msg.replace('Assembly failed: ', '');
            }
        };
        
        try {
            await repl.cmdAssemble([tempFile]);
        } catch (error) {
            // This catch is for synchronous errors
            throw error;
        }
        
        // Restore console functions
        console.log = originalLog;
        console.error = originalError;
        
        // If an error was captured via console.error, treat it as an assembly failure
        if (errorCaptured) {
            assemblyError = new Error(errorCaptured);
        }
    } catch (error) {
        // Direct error from cmdAssemble
        assemblyError = error;
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
            const result = await runTestCase(test);
            
            if (result.passed) {
                console.log(colorize(`  ✓ ${test.name}`, 'green'));
                passedTests++;
            } else {
                console.log(colorize(`  ✗ ${test.name}`, 'red'));
                console.log(colorize(`    ${result.error}`, 'red'));
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
    runAllTests().catch(error => {
        console.error('Error running tests:', error);
        process.exit(1);
    });
}

module.exports = { runTestCase, runAllTests };
