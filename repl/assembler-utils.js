// Assembler utilities for BURST REPL

const { OPCODES } = require('../burst-vm.js');

// Assemble a single instruction
async function assembleInstruction(asm, mnemonic, operands) {
    const originalMnemonic = mnemonic;
    
    // Check case sensitivity first - if uppercase, it's invalid
    if (originalMnemonic !== originalMnemonic.toLowerCase() && 
        originalMnemonic === originalMnemonic.toUpperCase() && 
        originalMnemonic.length > 1) {
        throw new Error(`Unknown mnemonic: ${originalMnemonic}`);
    }
    
    mnemonic = mnemonic.toLowerCase();
    
    // Define expected operand types for each instruction
    const operandTypes = {
        // Three register instructions
        'add': ['reg', 'reg', 'reg'],
        'sub': ['reg', 'reg', 'reg'],
        'mul': ['reg', 'reg', 'reg'],
        'div': ['reg', 'reg', 'reg'],
        'mod': ['reg', 'reg', 'reg'],
        'and': ['reg', 'reg', 'reg'],
        'or': ['reg', 'reg', 'reg'],
        'xor': ['reg', 'reg', 'reg'],
        'shl': ['reg', 'reg', 'reg'],
        'shr': ['reg', 'reg', 'reg'],
        
        // Two register instructions
        'mov': ['reg', 'reg'],
        'cmp': ['reg', 'reg'],
        
        // Register and immediate
        'movi': ['reg', 'imm'],
        
        // Load/store instructions
        'load': ['reg', 'reg', 'imm'],
        'store': ['reg', 'reg', 'imm'],
        'loadb': ['reg', 'reg', 'imm'],
        'storeb': ['reg', 'reg', 'imm'],
        
        // Single register
        'inc': ['reg'],
        'dec': ['reg'],
        'neg': ['reg'],
        'not': ['reg'],
        'push': ['reg'],
        'pop': ['reg'],
        
        // Jump instructions (address)
        'jmp': ['addr'],
        'jz': ['addr'],
        'jnz': ['addr'],
        'jeq': ['addr'],
        'jne': ['addr'],
        'jlt': ['addr'],
        'jgt': ['addr'],
        'jle': ['addr'],
        'jge': ['addr'],
        'call': ['addr'],
        
        // No operands
        'nop': [],
        'halt': [],
        'ret': [],
        'syscall': [],
    };
    
    // Check if instruction exists
    if (!operandTypes.hasOwnProperty(mnemonic)) {
        throw new Error(`Unknown mnemonic: ${originalMnemonic}`);
    }
    
    // Get expected operand types
    const expectedTypes = operandTypes[mnemonic];
    
    // Validate operand count
    if (operands.length !== expectedTypes.length) {
        throw new Error(`${mnemonic} expects ${expectedTypes.length} operands, got ${operands.length}`);
    }
    
    // Parse operands
    const parsedOps = operands.map((op, index) => {
        return parseOperand(op, index, expectedTypes[index], mnemonic, asm);
    });
    
    // Validate operand types match expected
    for (let i = 0; i < expectedTypes.length; i++) {
        const expected = expectedTypes[i];
        const actual = parsedOps[i];
        
        validateOperandType(actual, expected, i, mnemonic);
    }
    
    // Extract values from parsed operands
    const values = parsedOps.map(op => op.value);
    
    // Call appropriate assembler method
    callAssemblerMethod(asm, mnemonic, values);
}

function parseOperand(op, index, expectedType, mnemonic, asm) {
    if ((!op || op === '') && expectedType) {
        throw new Error(`${mnemonic} operand ${index + 1} is missing`);
    }
    
    // Remove whitespace and comments
    op = op.trim();
    const commentIndex = op.indexOf(';');
    if (commentIndex !== -1) {
        op = op.substring(0, commentIndex).trim();
    }
    
    // Empty after trimming
    if (!op && expectedType) {
        throw new Error(`${mnemonic} operand ${index + 1} is missing`);
    }
    
    // Check for immediate without # when immediate expected
    if (expectedType === 'imm' && !op.startsWith('#')) {
        if (op.match(/^\d+$/) || op.match(/^0x[0-9a-fA-F]+$/i) || op.match(/^-\d+$/)) {
            // It's a number but missing the #
            throw new Error(`${mnemonic} operand ${index + 1} must be an immediate value`);
        }
    }
    
    // Parse different operand types
    if (op.match(/^r\d+$/i)) {
        // Register
        const regNum = parseInt(op.substr(1));
        if (regNum < 0 || regNum > 15) {
            throw new Error(`Invalid register: ${op}`);
        }
        return { type: 'register', value: regNum };
    } else if (op.match(/^r-/i)) {
        // Invalid register format (r-1, etc.)
        throw new Error(`Invalid register: ${op}`);
    } else if (op.match(/^r[a-z]/i)) {
        // Invalid register format (rx, etc.)
        if (expectedType === 'reg') {
            throw new Error(`${mnemonic} operand ${index + 1} must be a register`);
        }
        throw new Error(`Invalid register: ${op}`);
    } else if (op.startsWith('#')) {
        // Immediate value
        const val = op.substr(1);
        
        // Check if it's a label reference
        if (asm.labels.has(val)) {
            return { type: 'immediate', value: asm.labels.get(val) };
        }
        
        // Try to parse as a number
        let value;
        if (val.startsWith('0x')) {
            value = parseInt(val, 16);
        } else if (val.match(/^-?\d+$/)) {
            value = parseInt(val);
        } else {
            // Not a valid number and not a known label
            throw new Error(`Undefined label: ${val}`);
        }
        
        // Validate immediate value range for different instructions
        if (mnemonic === 'movi') {
            // For MOVI, allow signed 16-bit values
            if (value < -32768 || value > 65535) {
                throw new Error(`Immediate value out of range for ${mnemonic}: ${value}`);
            }
            // Convert negative values to unsigned 16-bit representation
            if (value < 0) {
                value = (value & 0xFFFF);
            }
        } else if (value < 0 || value > 0xFFFF) {
            throw new Error(`Immediate value out of range: ${value}`);
        }
        
        return { type: 'immediate', value };
    } else if (op.match(/^\[.*\]$/)) {
        // Memory addressing [reg] or [reg+offset]
        const inner = op.slice(1, -1);
        const parts = inner.split('+').map(p => p.trim());
        
        if (parts.length === 1) {
            // [reg]
            if (parts[0].match(/^r\d+$/i)) {
                const regNum = parseInt(parts[0].substr(1));
                if (regNum < 0 || regNum > 15) {
                    throw new Error(`Invalid register in memory address: ${parts[0]}`);
                }
                return { type: 'mem', reg: regNum, offset: 0 };
            }
        } else if (parts.length === 2) {
            // [reg+offset]
            if (parts[0].match(/^r\d+$/i)) {
                const regNum = parseInt(parts[0].substr(1));
                if (regNum < 0 || regNum > 15) {
                    throw new Error(`Invalid register in memory address: ${parts[0]}`);
                }
                const offset = parseInt(parts[1]);
                if (isNaN(offset)) {
                    throw new Error(`Invalid offset in memory address: ${parts[1]}`);
                }
                return { type: 'mem', reg: regNum, offset };
            }
        }
        throw new Error(`Invalid memory addressing: ${op}`);
    } else if (asm.labels.has(op)) {
        // Direct label reference (used in jumps)
        return { type: 'label', value: asm.labels.get(op) };
    } else if (op.match(/^\d+$/)) {
        // Decimal number (for jump addresses, but not for immediates)
        if (expectedType === 'imm') {
            throw new Error(`${mnemonic} operand ${index + 1} must be an immediate value`);
        }
        return { type: 'immediate', value: parseInt(op) };
    } else if (op.match(/^0x[0-9a-fA-F]+$/i)) {
        // Hex number (for jump addresses, but not for immediates)
        if (expectedType === 'imm') {
            throw new Error(`${mnemonic} operand ${index + 1} must be an immediate value`);
        }
        return { type: 'immediate', value: parseInt(op, 16) };
    } else {
        // Check for operands with invalid characters like !
        if (op.match(/[!@#$%^&*()+=\[\]{};'\\|<>?/]/)) {
            throw new Error(`Invalid operand: ${op}`);
        }
        
        // Check what kind of error this is
        if (expectedType === 'reg' && (op.match(/^r-/) || op.match(/^r[a-z]/i))) {
            // Invalid register format
            throw new Error(`Invalid register: ${op}`);
        } else if (expectedType === 'reg') {
            // Expected register but got something else
            throw new Error(`${mnemonic} operand ${index + 1} must be a register`);
        } else if (expectedType === 'addr' && op.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
            // Looks like a label but wasn't found
            throw new Error(`Undefined label: ${op}`);
        } else {
            // General invalid operand
            throw new Error(`Invalid operand or undefined label: ${op}`);
        }
    }
}

function validateOperandType(actual, expected, index, mnemonic) {
    switch (expected) {
        case 'reg':
            if (actual.type !== 'register') {
                throw new Error(`${mnemonic} operand ${index + 1} must be a register, got ${actual.type}`);
            }
            break;
        case 'imm':
            if (actual.type !== 'immediate') {
                throw new Error(`${mnemonic} operand ${index + 1} must be an immediate value, got ${actual.type}`);
            }
            break;
        case 'addr':
            if (actual.type !== 'immediate' && actual.type !== 'label') {
                throw new Error(`${mnemonic} operand ${index + 1} must be an address, got ${actual.type}`);
            }
            break;
    }
}

function callAssemblerMethod(asm, mnemonic, values) {
    switch (mnemonic) {
        case 'nop': asm.nop(); break;
        case 'halt': asm.halt(); break;
        case 'push': asm.push(values[0]); break;
        case 'pop': asm.pop(values[0]); break;
        case 'mov': asm.mov(values[0], values[1]); break;
        case 'movi': asm.movi(values[0], values[1]); break;
        case 'add': asm.add(values[0], values[1], values[2]); break;
        case 'sub': asm.sub(values[0], values[1], values[2]); break;
        case 'mul': asm.mul(values[0], values[1], values[2]); break;
        case 'div': asm.div(values[0], values[1], values[2]); break;
        case 'mod': asm.mod(values[0], values[1], values[2]); break;
        case 'and': asm.and(values[0], values[1], values[2]); break;
        case 'or': asm.or(values[0], values[1], values[2]); break;
        case 'xor': asm.xor(values[0], values[1], values[2]); break;
        case 'not': asm.not(values[0]); break;
        case 'shl': asm.shl(values[0], values[1], values[2]); break;
        case 'shr': asm.shr(values[0], values[1], values[2]); break;
        case 'inc': asm.inc(values[0]); break;
        case 'dec': asm.dec(values[0]); break;
        case 'neg': asm.neg(values[0]); break;
        case 'cmp': asm.cmp(values[0], values[1]); break;
        case 'jmp': asm.jmp(values[0]); break;
        case 'jz': asm.jz(values[0]); break;
        case 'jnz': asm.jnz(values[0]); break;
        case 'jeq': asm.jeq(values[0]); break;
        case 'jne': asm.jne(values[0]); break;
        case 'jlt': asm.jlt(values[0]); break;
        case 'jgt': asm.jgt(values[0]); break;
        case 'jle': asm.jle(values[0]); break;
        case 'jge': asm.jge(values[0]); break;
        case 'call': asm.call(values[0]); break;
        case 'ret': asm.ret(); break;
        case 'syscall': asm.syscall(); break;
        case 'load': asm.load(values[0], values[1], values[2]); break;
        case 'store': asm.store(values[0], values[1], values[2]); break;
        case 'loadb': asm.loadb(values[0], values[1], values[2]); break;
        case 'storeb': asm.storeb(values[0], values[1], values[2]); break;
        default:
            throw new Error(`Unknown mnemonic: ${mnemonic}`);
    }
}

module.exports = {
    assembleInstruction
};
