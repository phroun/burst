// BURST Assembler class - Generates machine code for new 16-bit ISA

const { OPCODES, CONDITIONS } = require('./burst-isa.js');

class BurstAssembler {
    constructor() {
        this.output = [];
        this.labels = new Map();
        this.pendingLabels = [];
        this.address = 0;
    }
    
    // Emit a byte
    emitByte(byte) {
        this.output.push(byte & 0xFF);
        this.address += 1;
    }
    
    // Emit a 16-bit word (little-endian)
    emitWord16(word) {
        this.emitByte(word & 0xFF);
        this.emitByte((word >> 8) & 0xFF);
    }
    
    // Emit a 32-bit word (little-endian)
    emitWord32(word) {
        this.emitByte(word & 0xFF);
        this.emitByte((word >> 8) & 0xFF);
        this.emitByte((word >> 16) & 0xFF);
        this.emitByte((word >> 24) & 0xFF);
    }
    
    // Build instruction with condition
    buildInstruction(opcode, condition = CONDITIONS.ALWAYS, flags = 0) {
        return (condition << 13) | (flags << 8) | (opcode & 0xFF);
    }
    
    // Add label
    label(name) {
        this.labels.set(name, this.address);
    }
    
    // Parse condition prefix
    parseCondition(prefix) {
        const conditionMap = {
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
        
        if (prefix && prefix.startsWith('if')) {
            const cond = prefix.substring(2);
            return conditionMap[cond] || CONDITIONS.ALWAYS;
        }
        
        return conditionMap[prefix] || CONDITIONS.ALWAYS;
    }
    
    // Assembly methods for each instruction
    // No-operand instructions
    nop(condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.NOP, condition));
    }
    
    halt(condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.HALT, condition));
    }
    
    syscall(condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.SYSCALL, condition));
    }
    
    ret(condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.RET, condition));
    }
    
    leave(condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.LEAVE, condition));
    }
    
    // Register operations
    mov(dest, src, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.MOV, condition));
        this.emitByte((dest & 0xF) | ((src & 0xF) << 4));
        this.emitByte(0); // Padding
    }
    
    movi(reg, imm, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.MOVI, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
        this.emitWord16(imm & 0xFFFF);
    }
    
    limm(reg, imm32, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.LIMM, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Reserved
        this.emitWord32(imm32);
    }
    
    // Stack operations
    push(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.PUSH, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    pop(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.POP, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    // Arithmetic operations
    add(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.ADD, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    sub(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.SUB, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    mul(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.MUL, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    div(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.DIV, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    mod(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.MOD, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    inc(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.INC, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    dec(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.DEC, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    neg(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.NEG, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    addi(dest, src, imm8, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.ADDI, condition));
        this.emitByte((dest & 0xF) | ((src & 0xF) << 4));
        this.emitByte(imm8 & 0xFF);
    }
    
    // Logical operations
    and(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.AND, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    or(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.OR, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    xor(dest, src1, src2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.XOR, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src1 & 0xF) | ((src2 & 0xF) << 4));
    }
    
    not(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.NOT, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    // Shift operations
    shl(dest, src, count, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.SHL, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src & 0xF) | ((count & 0xF) << 4));
    }
    
    shr(dest, src, count, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.SHR, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src & 0xF) | ((count & 0xF) << 4));
    }
    
    sar(dest, src, count, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.SAR, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src & 0xF) | ((count & 0xF) << 4));
    }
    
    rol(dest, src, count, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.ROL, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src & 0xF) | ((count & 0xF) << 4));
    }
    
    ror(dest, src, count, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.ROR, condition));
        this.emitByte(dest & 0xF);
        this.emitByte((src & 0xF) | ((count & 0xF) << 4));
    }
    
    // Memory operations
    load(dest, base, offset = 0, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.LOAD, condition));
        this.emitByte((dest & 0xF) | ((base & 0xF) << 4));
        this.emitByte(offset & 0xFF);
    }
    
    store(src, base, offset = 0, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.STORE, condition));
        this.emitByte((src & 0xF) | ((base & 0xF) << 4));
        this.emitByte(offset & 0xFF);
    }
    
    loadb(dest, base, offset = 0, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.LOADB, condition));
        this.emitByte((dest & 0xF) | ((base & 0xF) << 4));
        this.emitByte(offset & 0xFF);
    }
    
    storeb(src, base, offset = 0, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.STOREB, condition));
        this.emitByte((src & 0xF) | ((base & 0xF) << 4));
        this.emitByte(offset & 0xFF);
    }
    
    // Control flow
    jmp(address, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.JMP, condition));
        this.emitByte(address & 0xFF);
        this.emitByte((address >> 8) & 0xFF);
        this.emitByte((address >> 16) & 0xFF);
        this.emitByte(0); // Padding for alignment
    }
    
    jmpr(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.JMPR, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    call(address, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.CALL, condition));
        this.emitByte(address & 0xFF);
        this.emitByte((address >> 8) & 0xFF);
        this.emitByte((address >> 16) & 0xFF);
        this.emitByte(0); // Padding for alignment
    }
    
    calli(reg, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.CALLI, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(0); // Padding
    }
    
    // Comparison
    cmp(reg1, reg2, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.CMP, condition));
        this.emitByte((reg1 & 0xF) | ((reg2 & 0xF) << 4));
        this.emitByte(0); // Padding
    }
    
    cmpi(reg, imm8, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.CMPI, condition));
        this.emitByte(reg & 0xF);
        this.emitByte(imm8 & 0xFF);
    }
    
    // Stack frame operations
    enter(locals, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.ENTER, condition));
        this.emitWord16(locals & 0xFFFF);
    }
    
    // Other instructions
    trap(trapNum, condition = CONDITIONS.ALWAYS) {
        this.emitWord16(this.buildInstruction(OPCODES.TRAP, condition));
        this.emitByte(trapNum & 0xFF);
        this.emitByte(0); // Padding
    }
    
    // String data
    string(str, addNull = false) {
        for (let i = 0; i < str.length; i++) {
            this.output.push(str.charCodeAt(i));
        }
        if (addNull) {
            this.output.push(0); // Null terminator
        }
        this.address += str.length + (addNull ? 1 : 0);
    }
    
    // Raw data
    data(bytes) {
        for (const byte of bytes) {
            this.output.push(byte & 0xFF);
        }
        this.address += bytes.length;
    }
    
    // Get final program
    getProgram() {
        return new Uint8Array(this.output);
    }
}

module.exports = BurstAssembler;
