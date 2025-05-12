// Test suite for BURST ISA Addendum instructions
const { BurstVM, BurstAssembler, OPCODES, SYSCALLS, FLAGS } = require('../lib/burst-vm.js');

// Test utilities
let testCount = 0;
let passedTests = 0;

function test(name, fn) {
    testCount++;
    try {
        fn();
        console.log(`✅ ${name}`);
        passedTests++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
    }
}

function assertEquals(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
    }
}

function assertArrayEquals(actual, expected, message = '') {
    if (actual.length !== expected.length) {
        throw new Error(`Array length mismatch: ${message}\n  Expected length: ${expected.length}\n  Actual length: ${actual.length}`);
    }
    for (let i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) {
            throw new Error(`Array mismatch at index ${i}: ${message}\n  Expected: ${expected[i]}\n  Actual: ${actual[i]}`);
        }
    }
}

// Test LIMM (Load 32-bit immediate)
test('LIMM instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Load 32-bit value into R1
    asm.limm(1, 0x12345678);
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[1], 0x12345678, 'LIMM should load 32-bit value');
});

// Fix for test-isa-addendum.js

// Issue 1: ENTER/LEAVE test fix
test('ENTER and LEAVE instructions', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Set up initial state
    asm.movi(15, 0x1000); // Set FP to some value
    const initialSP = vm.sp;
    
    // Test ENTER with 4 locals
    asm.enter(4);
    // At this point:
    // - Old FP should be pushed on stack
    // - FP should equal SP after push
    // - SP should be decreased by locals*4
    
    // Store new FP value for later check
    asm.mov(2, 15); // Save new FP in R2
    
    // Test LEAVE
    asm.leave();
    // Should restore SP and FP
    
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    
    // Execute MOVI
    vm.step();
    const oldFP = vm.registers[15];
    const oldSP = vm.sp;
    
    // Execute ENTER
    vm.step();
    const newFP = vm.registers[15];
    const newSP = vm.sp;
    
    // Check ENTER effects
    assertEquals(vm.readWord(newFP), oldFP, 'Old FP should be saved on stack');
    assertEquals(newFP, oldSP - 4, 'New FP should be old SP - 4');
    assertEquals(newSP, newFP - 16, 'SP should be decreased by locals * 4');
    
    // Execute MOV (save FP)
    vm.step();
    const savedFP = vm.registers[2];
    
    // Execute LEAVE
    vm.step();
    
    // The key fix: LEAVE should restore SP to the saved FP position, not FP+4
    assertEquals(vm.sp, savedFP + 4, 'SP should be FP + 4 after LEAVE');
    assertEquals(vm.registers[15], oldFP, 'FP should be restored');
});

// Issue 2: CALLI test should use absolute addresses
// Fix for CALLI test
test('CALLI instruction - FIXED', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Make sure we're placing the function at the right location
    // Main program at address 0
    asm.limm(1, 0x100);    // Load function address (8 bytes for LIMM)
    asm.calli(1);          // Call function at address in R1 (4 bytes)
    asm.halt();            // Halt after return (4 bytes)
    
    // Pad to reach 0x100
    while (asm.address < 0x100) {
        asm.nop();
    }
    
    // Function at address 0x100
    asm.movi(3, 0x42);     // Function sets R3 to 0x42
    asm.ret();             // Return to caller
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    
    // Debug: Print the first few instructions
    console.log('Program layout:');
    console.log(`0x00: ${vm.readWord(0x00).toString(16)} (LIMM opcode)`);
    console.log(`0x04: ${vm.readWord(0x04).toString(16)} (LIMM immediate)`);
    console.log(`0x08: ${vm.readWord(0x08).toString(16)} (CALLI)`);
    console.log(`0x0C: ${vm.readWord(0x0C).toString(16)} (HALT)`);
    console.log(`0x100: ${vm.readWord(0x100).toString(16)} (MOVI at function)`);
    
    // Execute the program
    let steps = 0;
    while (!vm.halted && steps < 20) {
        console.log(`Step ${steps}: PC=0x${vm.pc.toString(16)}, R1=0x${vm.registers[1].toString(16)}, R3=${vm.registers[3]}`);
        try {
            vm.step();
        } catch (e) {
            console.error(`Error at step ${steps}: ${e.message}`);
            break;
        }
        steps++;
    }
    
    assertEquals(vm.registers[3], 0x42, 'CALLI should call function and return');
});

// Issue 3: Fix CMPI test with proper jump addresses
test('CMPI instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    let addr = 0;
    asm.movi(1, 50);      // R1 = 50 (addr 0)
    addr += 4;
    
    asm.cmpi(1, 50);      // Compare R1 with 50 (equal) (addr 4)
    addr += 4;
    
    const skip1 = addr + 8; // Calculate jump target
    asm.jz(skip1);        // Jump if zero flag set (addr 8)
    addr += 4;
    
    asm.movi(2, 0);       // Should be skipped (addr 12)
    addr += 4;
    
    asm.movi(2, 1);       // R2 = 1 (success) (addr 16)
    addr += 4;
    
    asm.cmpi(1, 60);      // Compare R1 with 60 (less than) (addr 20)
    addr += 4;
    
    const skip2 = addr + 8; // Calculate jump target
    asm.jlt(skip2);       // Jump if less than (addr 24)
    addr += 4;
    
    asm.movi(3, 0);       // Should be skipped (addr 28)
    addr += 4;
    
    asm.movi(3, 1);       // R3 = 1 (success) (addr 32)
    addr += 4;
    
    asm.halt();           // End program (addr 36)
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    
    // Run with safety limit
    let steps = 0;
    while (!vm.halted && steps < 20) {
        vm.step();
        steps++;
    }
    
    assertEquals(vm.registers[2], 1, 'CMPI should set zero flag when equal');
    assertEquals(vm.registers[3], 1, 'CMPI should set less-than flags correctly');
});

// Test JMPR (Indirect jump)
test('JMPR instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Jump target at address 0x100
    asm.address = 0x100;
    asm.movi(4, 0x99);
    asm.halt();
    
    // Main program
    asm.address = 0;
    asm.limm(1, 0x100); // Load jump target
    asm.jmpr(1);        // Jump to address in R1
    // This should be skipped
    asm.movi(4, 0x11);
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[4], 0x99, 'JMPR should jump to target address');
});

// Test ROL (Rotate left)
test('ROL instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    asm.limm(1, 0x80000001); // Load test value
    asm.movi(2, 1);          // Rotate by 1
    asm.rol(3, 1, 2);        // R3 = R1 ROL R2
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[3], 0x00000003, 'ROL should rotate left');
});

// Test ROR (Rotate right)
test('ROR instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    asm.limm(1, 0x80000001); // Load test value
    asm.movi(2, 1);          // Rotate by 1
    asm.ror(3, 1, 2);        // R3 = R1 ROR R2
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[3], 0xC0000000, 'ROR should rotate right');
});

// Test SAR (Shift arithmetic right)
test('SAR instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Test with negative number
    asm.limm(1, 0x80000000); // Load negative number
    asm.movi(2, 1);          // Shift by 1
    asm.sar(3, 1, 2);        // R3 = R1 SAR R2
    
    // Test with positive number
    asm.limm(4, 0x40000000); // Load positive number
    asm.sar(5, 4, 2);        // R5 = R4 SAR R2
    
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[3], 0xC0000000, 'SAR should preserve sign bit (negative)');
    assertEquals(vm.registers[5], 0x20000000, 'SAR should shift right (positive)');
});

// Test ADDI (Add immediate)
test('ADDI instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    asm.movi(1, 100);     // R1 = 100
    asm.addi(2, 1, 50);   // R2 = R1 + 50
    asm.addi(3, 1, -20);  // R3 = R1 + (-20), test negative immediate
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[2], 150, 'ADDI should add positive immediate');
    assertEquals(vm.registers[3], 80, 'ADDI should add negative immediate');
});

// Test CMPI (Compare immediate)
// Add debug version of the CMPI test
test('CMPI instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Set a max steps to prevent infinite loops
    let maxSteps = 20;
    let stepCount = 0;
    
    asm.movi(1, 50);      // R1 = 50
    asm.cmpi(1, 50);      // Compare R1 with 50 (equal)
    asm.jz(0x10);         // Jump to absolute address 0x10 if zero
    asm.movi(2, 0);       // Should be skipped (address 0x0C)
    asm.movi(2, 1);       // R2 = 1 (success) (address 0x10)
    
    asm.cmpi(1, 60);      // Compare R1 with 60 (less than) (address 0x14)
    asm.jlt(0x20);        // Jump to absolute address 0x20 if less than
    asm.movi(3, 0);       // Should be skipped (address 0x1C)
    asm.movi(3, 1);       // R3 = 1 (success) (address 0x20)
    
    asm.halt();           // Important: Add halt to prevent infinite loop
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    
    // Debug: print program
    console.log('Program size:', program.length);
    
    // Run with safety limit
    while (!vm.halted && stepCount < maxSteps) {
        if (stepCount % 5 === 0) {
            console.log(`Step ${stepCount}: PC=${vm.pc.toString(16)}, R1=${vm.registers[1]}, R2=${vm.registers[2]}, R3=${vm.registers[3]}`);
        }
        vm.step();
        stepCount++;
    }
    
    if (stepCount >= maxSteps) {
        throw new Error('Test reached maximum steps - possible infinite loop');
    }
    
    assertEquals(vm.registers[2], 1, 'CMPI should set zero flag when equal');
    assertEquals(vm.registers[3], 1, 'CMPI should set less-than flags correctly');
});

// Test TRAP instruction
test('TRAP instruction', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Set up trap handler
    let trapCalled = false;
    vm.trapHandlers.set(5, function() {
        trapCalled = true;
        this.registers[4] = 0x1234;
    });
    
    asm.trap(5);          // Call trap handler 5
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(trapCalled, true, 'TRAP should call handler');
    assertEquals(vm.registers[4], 0x1234, 'TRAP handler should set register');
});

// Test conditional move instructions
test('Conditional move instructions', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Set up source values
    asm.movi(1, 0x11);    // Source value for moves
    asm.movi(2, 0x22);    // Another source value
    
    // Test MOVZ (move if zero)
    asm.movi(10, 0);      // Set up for zero flag
    asm.cmp(10, 10);      // Compare to set zero flag
    asm.movz(3, 1);       // Should move R1 to R3
    
    // Test MOVNZ (move if not zero)
    asm.movi(10, 1);      // Set up for non-zero
    asm.cmp(10, 10);      // Clear zero flag
    asm.movnz(4, 2);      // Should NOT move
    asm.movi(10, 5);      // Different value
    asm.cmp(10, 11);      // Set non-zero
    asm.movnz(4, 2);      // Should move R2 to R4
    
    // Test MOVLT (move if less than)
    asm.movi(10, 5);
    asm.movi(11, 10);
    asm.cmp(10, 11);      // 5 < 10
    asm.movlt(5, 1);      // Should move R1 to R5
    
    // Test MOVGE (move if greater or equal)
    asm.movi(10, 10);
    asm.movi(11, 5);
    asm.cmp(10, 11);      // 10 >= 5
    asm.movge(6, 2);      // Should move R2 to R6
    
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[3], 0x11, 'MOVZ should move when zero flag set');
    assertEquals(vm.registers[4], 0x22, 'MOVNZ should move when zero flag clear');
    assertEquals(vm.registers[5], 0x11, 'MOVLT should move when less than');
    assertEquals(vm.registers[6], 0x22, 'MOVGE should move when greater or equal');
});

// Test all conditional moves comprehensively
test('All conditional move variants', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Set up test values
    asm.movi(1, 0xAA);    // Source value
    
    // Test each condition
    // 1. MOVC (unconditional)
    asm.movc(10, 1);      // Always moves
    
    // 2. MOVZ (zero)
    asm.movi(2, 0);
    asm.cmp(2, 2);        // Set zero flag
    asm.movz(11, 1);
    
    // 3. MOVNZ (not zero)
    asm.movi(2, 5);
    asm.movi(3, 10);
    asm.cmp(2, 3);        // Clear zero flag
    asm.movnz(12, 1);
    
    // 4. MOVLT (less than)
    asm.movi(2, 5);
    asm.movi(3, 10);
    asm.cmp(2, 3);        // 5 < 10
    asm.movlt(13, 1);
    
    // 5. MOVGE (greater or equal)
    asm.movi(2, 10);
    asm.movi(3, 5);
    asm.cmp(2, 3);        // 10 >= 5
    asm.movge(14, 1);
    
    // 6. MOVLE (less or equal)
    asm.movi(2, 5);
    asm.movi(3, 5);
    asm.cmp(2, 3);        // 5 <= 5
    asm.movle(15, 1);
    
    // 7. MOVGT (greater than)
    asm.movi(2, 10);
    asm.movi(3, 5);
    asm.cmp(2, 3);        // 10 > 5
    asm.movgt(6, 1);
    
    // 8. MOVNE (not equal, alias of MOVNZ)
    asm.movi(2, 5);
    asm.movi(3, 10);
    asm.cmp(2, 3);        // 5 != 10
    asm.movne(7, 1);
    
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[10], 0xAA, 'MOVC should always move');
    assertEquals(vm.registers[11], 0xAA, 'MOVZ should move when zero');
    assertEquals(vm.registers[12], 0xAA, 'MOVNZ should move when not zero');
    assertEquals(vm.registers[13], 0xAA, 'MOVLT should move when less than');
    assertEquals(vm.registers[14], 0xAA, 'MOVGE should move when greater or equal');
    assertEquals(vm.registers[15], 0xAA, 'MOVLE should move when less or equal');
    assertEquals(vm.registers[6], 0xAA, 'MOVGT should move when greater than');
    assertEquals(vm.registers[7], 0xAA, 'MOVNE should move when not equal');
});

// Test edge cases and complex scenarios
// Fix for ADDI edge case test
test('ISA Addendum edge cases - FIXED', () => {
    const vm = new BurstVM();
    const asm = new BurstAssembler();
    
    // Test ADDI with max/min values
    asm.movi(1, 0);
    asm.addi(2, 1, 127);   // Max positive 8-bit
    asm.addi(3, 1, -128);  // Min negative 8-bit
    
    // Test rotating by 0 and 32
    // Use LIMM to load the exact value
    asm.limm(4, 0xF0F0F0F0);
    asm.movi(5, 0);        // Rotate by 0
    asm.rol(6, 4, 5);      // Should not change
    
    asm.movi(5, 32);       // Rotate by 32 (full rotation)
    asm.rol(7, 4, 5);      // Should return to original
    
    // Test SAR with different shift amounts
    asm.limm(8, 0x80000000);
    asm.movi(9, 31);       // Shift all the way
    asm.sar(10, 8, 9);     // Should be all 1s
    
    asm.halt();
    
    const program = asm.getProgram();
    vm.loadProgram(program);
    vm.run();
    
    assertEquals(vm.registers[2], 127, 'ADDI with max positive immediate');
    
    // The key fix: ADDI with -128 results in 0 + (-128) = -128
    // In 32-bit representation, this is 0xFFFFFF80
    // When viewed as unsigned, it's 4294967168
    // But in JavaScript, when you have a negative number in registers,
    // it might be shown as negative. Let's check the actual bit pattern:
    
    const expectedNegative128 = 0xFFFFFF80;
    assertEquals(vm.registers[3] >>> 0, expectedNegative128, 'ADDI with min negative immediate (unsigned view)');
    
    // Alternative: check if the value is -128 when interpreted as signed
    assertEquals(vm.registers[3] | 0, -128, 'ADDI with min negative immediate (signed view)');
    
    assertEquals(vm.registers[6], 0xF0F0F0F0, 'ROL by 0 should not change value');
    assertEquals(vm.registers[7], 0xF0F0F0F0, 'ROL by 32 should return to original');
    assertEquals(vm.registers[10] >>> 0, 0xFFFFFFFF, 'SAR of negative by 31 should be all 1s');
});

// Print test results
console.log('\n=== ISA Addendum Test Results ===');
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${testCount - passedTests}`);

if (passedTests === testCount) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
}
