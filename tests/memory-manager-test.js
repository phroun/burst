#!/usr/bin/env node

// Memory Manager Unit Test
// Tests the MemoryManager class from burst-vm.js

const { MemoryManager } = require('../burst-vm.js');

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

class TestRunner {
    constructor() {
        this.tests = [];
        this.passCount = 0;
        this.failCount = 0;
    }
    
    test(name, fn) {
        this.tests.push({ name, fn });
    }
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
        }
    }
    
    assertNotEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(`${message}. Expected not: ${expected}, Actual: ${actual}`);
        }
    }
    
    run() {
        console.log(colorize('Memory Manager Unit Tests', 'bold'));
        console.log(colorize('========================', 'bold'));
        console.log();
        
        for (const test of this.tests) {
            try {
                test.fn.call(this);
                console.log(colorize(`✓ ${test.name}`, 'green'));
                this.passCount++;
            } catch (error) {
                console.log(colorize(`✗ ${test.name}`, 'red'));
                console.log(`  ${error.message}`);
                this.failCount++;
            }
        }
        
        console.log();
        console.log(colorize('Test Summary', 'bold'));
        console.log(colorize('============', 'bold'));
        console.log(`Passed: ${colorize(this.passCount, 'green')}`);
        console.log(`Failed: ${colorize(this.failCount, 'red')}`);
        
        if (this.failCount === 0) {
            console.log(colorize('\n✓ All tests passed!', 'green'));
        } else {
            console.log(colorize('\n✗ Some tests failed!', 'red'));
        }
        
        process.exit(this.failCount > 0 ? 1 : 0);
    }
}

// Create test runner
const runner = new TestRunner();

// Test: Basic allocation
runner.test('Basic allocation', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr = mm.alloc(100);
    this.assertNotEqual(addr, 0, 'Allocation should succeed');
    this.assert(addr >= 0x10000, 'Address should be in user space');
});

// Test: Multiple allocations
runner.test('Multiple allocations', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr1 = mm.alloc(100);
    const addr2 = mm.alloc(200);
    const addr3 = mm.alloc(300);
    
    this.assertNotEqual(addr1, 0, 'First allocation should succeed');
    this.assertNotEqual(addr2, 0, 'Second allocation should succeed');
    this.assertNotEqual(addr3, 0, 'Third allocation should succeed');
    
    // Addresses should be different
    this.assertNotEqual(addr2, addr1, 'Addresses should be different');
    this.assertNotEqual(addr3, addr2, 'Addresses should be different');
    
    // Check spacing (with 8-byte alignment)
    this.assert(addr2 >= addr1 + 100, 'Second address should be after first allocation');
    this.assert(addr3 >= addr2 + 200, 'Third address should be after second allocation');
});

// Test: Alignment
runner.test('Allocation alignment', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Test various sizes, all should be aligned to 8 bytes
    const addr1 = mm.alloc(7);
    const addr2 = mm.alloc(15);
    const addr3 = mm.alloc(1);
    
    this.assertEqual(addr1 % 8, 0, 'First address should be 8-byte aligned');
    this.assertEqual(addr2 % 8, 0, 'Second address should be 8-byte aligned');
    this.assertEqual(addr3 % 8, 0, 'Third address should be 8-byte aligned');
    
    // Check that space is properly allocated with alignment
    this.assert(addr2 >= addr1 + 8, 'Allocation of 7 bytes should use 8 bytes');
    this.assert(addr3 >= addr2 + 16, 'Allocation of 15 bytes should use 16 bytes');
});

// Test: Free memory
runner.test('Free memory', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr = mm.alloc(100);
    this.assertNotEqual(addr, 0, 'Allocation should succeed');
    
    const result = mm.free(addr);
    this.assert(result, 'Free should succeed');
    
    // Try to free the same address again
    const result2 = mm.free(addr);
    this.assert(!result2, 'Double free should fail');
});

// Test: Allocate after free
runner.test('Allocate after free', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Allocate three blocks
    const addr1 = mm.alloc(100);
    const addr2 = mm.alloc(100);
    const addr3 = mm.alloc(100);
    
    // Free the middle one
    mm.free(addr2);
    
    // Allocate again - should reuse the freed space
    const addr4 = mm.alloc(100);
    this.assertEqual(addr4, addr2, 'Should reuse freed memory');
});

// Test: Coalescing adjacent free blocks
runner.test('Coalescing free blocks', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Allocate three adjacent blocks
    const addr1 = mm.alloc(100);
    const addr2 = mm.alloc(100);
    const addr3 = mm.alloc(100);
    
    // Free them in order
    mm.free(addr1);
    mm.free(addr2);
    mm.free(addr3);
    
    // Allocate a large block that needs the coalesced space
    const addr4 = mm.alloc(300);
    this.assertEqual(addr4, addr1, 'Should use coalesced free space');
});

// Test: Realloc to smaller size
runner.test('Realloc to smaller size', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr = mm.alloc(200);
    const newAddr = mm.realloc(addr, 100);
    
    this.assertEqual(newAddr, addr, 'Address should remain the same when shrinking');
});

// Test: Realloc to larger size (in place)
runner.test('Realloc to larger size in place', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr1 = mm.alloc(100);
    const addr2 = mm.alloc(200);  // Leave space after first allocation
    
    mm.free(addr2);  // Free the second allocation
    
    // Now realloc the first one to a larger size
    const newAddr = mm.realloc(addr1, 200);
    this.assertEqual(newAddr, addr1, 'Should expand in place');
});

// Test: Realloc requiring relocation
runner.test('Realloc requiring relocation', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr1 = mm.alloc(100);
    const addr2 = mm.alloc(100);  // Block expansion
    
    // Try to expand first allocation
    const newAddr = mm.realloc(addr1, 300);
    this.assertNotEqual(newAddr, 0, 'Realloc should succeed');
    this.assertNotEqual(newAddr, addr1, 'Should relocate to new address');
});

// Test: Out of memory
runner.test('Out of memory', function() {
    const mm = new MemoryManager(1024);  // Small memory
    
    // Try to allocate more than available
    const addr = mm.alloc(2048);
    this.assertEqual(addr, 0, 'Large allocation should fail');
});

// Test: Invalid free
runner.test('Invalid free', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Try to free an address that was never allocated
    const result = mm.free(0x20000);
    this.assert(!result, 'Free of unallocated address should fail');
});

// Test: Invalid realloc
runner.test('Invalid realloc', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Try to realloc an address that was never allocated
    const result = mm.realloc(0x20000, 100);
    this.assertEqual(result, 0, 'Realloc of unallocated address should fail');
});

// Test: Zero-size allocation
runner.test('Zero-size allocation', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    const addr = mm.alloc(0);
    // Zero-size allocations should still return a valid address
    this.assertNotEqual(addr, 0, 'Zero-size allocation should succeed');
    
    // But they should be aligned
    this.assertEqual(addr % 8, 0, 'Zero-size allocation should be aligned');
});

// Test: Fragmentation handling
runner.test('Fragmentation handling', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Create fragmentation by allocating and freeing alternately
    const addrs = [];
    for (let i = 0; i < 10; i++) {
        addrs.push(mm.alloc(50));
    }
    
    // Free every other allocation
    for (let i = 0; i < 10; i += 2) {
        mm.free(addrs[i]);
    }
    
    // Try to allocate a large block
    const largeAddr = mm.alloc(200);
    this.assertNotEqual(largeAddr, 0, 'Should handle fragmentation and find space');
});

// Test: Memory statistics
runner.test('Memory tracking', function() {
    const mm = new MemoryManager(1024 * 1024);
    
    // Track allocations
    const addr1 = mm.alloc(100);
    const addr2 = mm.alloc(200);
    
    // Check that allocations are tracked
    this.assert(mm.allocations.has(addr1), 'First allocation should be tracked');
    this.assert(mm.allocations.has(addr2), 'Second allocation should be tracked');
    this.assertEqual(mm.allocations.get(addr1), 104, 'First allocation size should be aligned');
    this.assertEqual(mm.allocations.get(addr2), 200, 'Second allocation size should be aligned');
    
    // Free and check
    mm.free(addr1);
    this.assert(!mm.allocations.has(addr1), 'Freed allocation should not be tracked');
});

// Run all tests
runner.run();
