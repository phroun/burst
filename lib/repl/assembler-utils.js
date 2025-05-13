// Assembler utilities for BURST REPL with new 16-bit ISA

const { OPCODES, CONDITIONS } = require('../burst-isa.js');

// Define expected operand types for each instruction
const OPERAND_TYPES = {
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
    'sar': ['reg', 'reg', 'reg'],
    'rol': ['reg', 'reg', 'reg'],
    'ror': ['reg', 'reg', 'reg'],
    
    // Two register instructions
    'mov': ['reg', 'reg'],
    'cmp': ['reg', 'reg'],
    
    // Register and immediate
    'movi': ['reg', 'imm16'],
    'limm': ['reg', 'imm32'],
    'addi': ['reg', 'reg', 'imm8'],
    'cmpi': ['reg', 'imm8'],
    
    // Load/store instructions
    'load': ['reg', 'reg', 'imm8'],
    'store': ['reg', 'reg', 'imm8'],
    'loadb': ['reg', 'reg', 'imm8'],
    'storeb': ['reg', 'reg', 'imm8'],
    
    // Single register
    'inc': ['reg'],
    'dec': ['reg'],
    'neg': ['reg'],
    'not': ['reg'],
    'push': ['reg'],
    'pop': ['reg'],
    'jmpr': ['reg'],
    'calli': ['reg'],
    
    // Jump instructions (24-bit address)
    'jmp': ['addr24'],
    'call': ['addr24'],
    
    // Frame operations
    'enter': ['imm16'],
    
    // Others
    'trap': ['imm8'],
    
    // No operands
    'nop': [],
    'halt': [],
    'ret': [],
    'syscall': [],
    'leave': [],
};

// Map of condition prefixes to condition codes
const CONDITION_PREFIXES = {
    'always': CONDITIONS.ALWAYS,
    'ne': CONDITIONS.NE,
    'nz': CONDITIONS.NE,
    'ge': CONDITIONS.GE,
    'gt': CONDITIONS.GT,
    'never': CONDITIONS.NEVER,
    'eq': CONDITIONS.EQ,
    'z': CONDITIONS.EQ,
    'lt': CONDITIONS.LT,
    'le': CONDITIONS.LE,
};

// Legacy conditional instruction aliases
const LEGACY_ALIASES = {
    // Conditional jumps
    'jz': { mnemonic: 'jmp', condition: CONDITIONS.EQ },
    'jnz': { mnemonic: 'jmp', condition: CONDITIONS.NE },
    'jeq': { mnemonic: 'jmp', condition: CONDITIONS.EQ },
    'jne': { mnemonic: 'jmp', condition: CONDITIONS.NE },
    'jlt': { mnemonic: 'jmp', condition: CONDITIONS.LT },
    'jgt': { mnemonic: 'jmp', condition: CONDITIONS.GT },
    'jle': { mnemonic: 'jmp', condition: CONDITIONS.LE },
    'jge': { mnemonic: 'jmp', condition: CONDITIONS.GE },
    
    // Conditional moves
    'movz': { mnemonic: 'mov', condition: CONDITIONS.EQ },
    'movnz': { mnemonic: 'mov', condition: CONDITIONS.NE },
    'movlt': { mnemonic: 'mov', condition: CONDITIONS.LT },
    'movge': { mnemonic: 'mov', condition: CONDITIONS.GE },
    'movle': { mnemonic: 'mov', condition: CONDITIONS.LE },
    'movgt': { mnemonic: 'mov', condition: CONDITIONS.GT },
    'movne': { mnemonic: 'mov', condition: CONDITIONS.NE },
    'moveq': { mnemonic: 'mov', condition: CONDITIONS.EQ },
};

// Get list of valid mnemonics
function getValidMnemonics() {
    const baseMnemonics = Object.keys(OPERAND_TYPES);
    const legacyMnemonics = Object.keys(LEGACY_ALIASES);
    return [...baseMnemonics, ...legacyMnemonics];
}

// Parse condition prefix
function parseConditionPrefix(mnemonic) {
    // Check for legacy aliases first
    if (LEGACY_ALIASES.hasOwnProperty(mnemonic)) {
        const alias = LEGACY_ALIASES[mnemonic];
        return { condition: alias.condition, mnemonic: alias.mnemonic };
    }
    
    // Check for ifXX prefix
    if (mnemonic.startsWith('if')) {
        const condPart = mnemonic.substring(2);
        for (const [prefix, condition] of Object.entries(CONDITION_PREFIXES)) {
            if (condPart.startsWith(prefix)) {
                const baseMnemonic = condPart.substring(prefix.length);
                if (baseMnemonic && OPERAND_TYPES.hasOwnProperty(baseMnemonic)) {
                    return { condition, mnemonic: baseMnemonic };
                }
            }
        }
    }
    
    // Check for mnemonic with condition suffix (legacy support)
    for (const [prefix, condition] of Object.entries(CONDITION_PREFIXES)) {
        if (mnemonic.endsWith(prefix) && prefix !== 'always') {
            const baseMnemonic = mnemonic.substring(0, mnemonic.length - prefix.length);
            if (baseMnemonic && OPERAND_TYPES.hasOwnProperty(baseMnemonic)) {
                return { condition, mnemonic: baseMnemonic };
            }
        }
    }
    
    // No condition prefix/suffix
    if (OPERAND_TYPES.hasOwnProperty(mnemonic)) {
        return { condition: CONDITIONS.ALWAYS, mnemonic };
    }
    
    return null;
}

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
    
    // Parse condition prefix/suffix
    const parsed = parseConditionPrefix(mnemonic);
    if (!parsed) {
        throw new Error(`Unknown mnemonic: ${originalMnemonic}`);
    }
    
    const { condition, mnemonic: baseMnemonic } = parsed;
    
    // Get expected operand types
    const expectedTypes = OPERAND_TYPES[baseMnemonic];
    
    // Validate operand count
    if (operands.length !== expectedTypes.length) {
        throw new Error(`${baseMnemonic} expects ${expectedTypes.length} operands, got ${operands.length}`);
    }
    
    // Parse operands
    const parsedOps = operands.map((op, index) => {
        return parseOperand(op, index, expectedTypes[index], baseMnemonic, asm);
    });
    
    // Validate operand types match expected
    for (let i = 0; i < expectedTypes.length; i++) {
        const expected = expectedTypes[i];
        const actual = parsedOps[i];
        
        validateOperandType(actual, expected, i, baseMnemonic);
    }
    
    // Extract values from parsed operands
    const values = parsedOps.map(op => op.value);
    
    // Call appropriate assembler method with condition
    callAssemblerMethod(asm, baseMnemonic, values, condition);
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
    if ((expectedType === 'imm8' || expectedType === 'imm16' || expectedType === 'imm32') && !op.startsWith('#')) {
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
        if (expectedType === 'imm8') {
            if (value < -128 || value > 255) {
                throw new Error(`8-bit immediate value out of range: ${value}`);
            }
            // Convert negative values to unsigned 8-bit representation
            if (value < 0) {
                value = (value & 0xFF);
            }
        } else if (expectedType === 'imm16') {
            // For MOVI, allow signed 16-bit values
            if (value < -32768 || value > 65535) {
                throw new Error(`16-bit immediate value out of range: ${value}`);
            }
            // Convert negative values to unsigned 16-bit representation
            if (value < 0) {
                value = (value & 0xFFFF);
            }
        } else if (expectedType === 'imm32') {
            // LIMM can take any 32-bit value
            value = value >>> 0; // Convert to unsigned 32-bit
        }
        
        return { type: 'immediate', value };
    } else if (asm.labels.has(op)) {
        // Direct label reference (used in jumps)
        return { type: 'label', value: asm.labels.get(op) };
    } else if (op.match(/^\d+$/)) {
        // Decimal number (for jump addresses, but not for immediates)
        if (expectedType.startsWith('imm')) {
            throw new Error(`${mnemonic} operand ${index + 1} must be an immediate value`);
        }
        return { type: 'immediate', value: parseInt(op) };
    } else if (op.match(/^0x[0-9a-fA-F]+$/i)) {
        // Hex number (for jump addresses, but not for immediates)
        if (expectedType.startsWith('imm')) {
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
        } else if ((expectedType === 'addr24' || expectedType === 'addr') && op.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
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
        case 'imm8':
        case 'imm16':
        case 'imm32':
            if (actual.type !== 'immediate') {
                throw new Error(`${mnemonic} operand ${index + 1} must be an immediate value, got ${actual.type}`);
            }
            break;
        case 'addr24':
        case 'addr':
            if (actual.type !== 'immediate' && actual.type !== 'label') {
                throw new Error(`${mnemonic} operand ${index + 1} must be an address, got ${actual.type}`);
            }
            break;
    }
}

function callAssemblerMethod(asm, mnemonic, values, condition) {
    // All assembler methods now take condition as the last parameter
    switch (mnemonic) {
        case 'nop': asm.nop(condition); break;
        case 'halt': asm.halt(condition); break;
        case 'syscall': asm.syscall(condition); break;
        case 'ret': asm.ret(condition); break;
        case 'leave': asm.leave(condition); break;
        
        case 'push': asm.push(values[0], condition); break;
        case 'pop': asm.pop(values[0], condition); break;
        case 'inc': asm.inc(values[0], condition); break;
        case 'dec': asm.dec(values[0], condition); break;
        case 'neg': asm.neg(values[0], condition); break;
        case 'not': asm.not(values[0], condition); break;
        
        case 'mov': asm.mov(values[0], values[1], condition); break;
        case 'movi': asm.movi(values[0], values[1], condition); break;
        case 'limm': asm.limm(values[0], values[1], condition); break;
        
        case 'add': asm.add(values[0], values[1], values[2], condition); break;
        case 'sub': asm.sub(values[0], values[1], values[2], condition); break;
        case 'mul': asm.mul(values[0], values[1], values[2], condition); break;
        case 'div': asm.div(values[0], values[1], values[2], condition); break;
        case 'mod': asm.mod(values[0], values[1], values[2], condition); break;
        case 'addi': asm.addi(values[0], values[1], values[2], condition); break;
        
        case 'and': asm.and(values[0], values[1], values[2], condition); break;
        case 'or': asm.or(values[0], values[1], values[2], condition); break;
        case 'xor': asm.xor(values[0], values[1], values[2], condition); break;
        
        case 'shl': asm.shl(values[0], values[1], values[2], condition); break;
        case 'shr': asm.shr(values[0], values[1], values[2], condition); break;
        case 'sar': asm.sar(values[0], values[1], values[2], condition); break;
        case 'rol': asm.rol(values[0], values[1], values[2], condition); break;
        case 'ror': asm.ror(values[0], values[1], values[2], condition); break;
        
        case 'load': asm.load(values[0], values[1], values[2], condition); break;
        case 'store': asm.store(values[0], values[1], values[2], condition); break;
        case 'loadb': asm.loadb(values[0], values[1], values[2], condition); break;
        case 'storeb': asm.storeb(values[0], values[1], values[2], condition); break;
        
        case 'jmp': asm.jmp(values[0], condition); break;
        case 'jmpr': asm.jmpr(values[0], condition); break;
        case 'call': asm.call(values[0], condition); break;
        case 'calli': asm.calli(values[0], condition); break;
        
        case 'cmp': asm.cmp(values[0], values[1], condition); break;
        case 'cmpi': asm.cmpi(values[0], values[1], condition); break;
        
        case 'enter': asm.enter(values[0], condition); break;
        case 'trap': asm.trap(values[0], condition); break;
        
        default:
            throw new Error(`Unknown mnemonic: ${mnemonic}`);
    }
}

module.exports = {
    assembleInstruction,
    getValidMnemonics,
    parseConditionPrefix,
    OPERAND_TYPES
};
