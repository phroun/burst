// MemoryManager class for BURST VM
// This file can be required separately to reduce the size of burst-vm.js

class MemoryManager {
    constructor(totalSize = 1024 * 1024) {
        this.totalSize = totalSize;
        this.freeList = [{ start: 0x10000, size: totalSize - 0x10000 }]; // Reserve first 64KB
        this.allocations = new Map();
    }
    
    alloc(size) {
        // Align size to 8 bytes
        size = (size + 7) & ~7;
        
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            if (block.size >= size) {
                const addr = block.start;
                
                // Update or remove free block
                if (block.size === size) {
                    this.freeList.splice(i, 1);
                } else {
                    block.start += size;
                    block.size -= size;
                }
                
                this.allocations.set(addr, size);
                return addr;
            }
        }
        
        return 0; // Out of memory
    }
    
    free(addr) {
        const size = this.allocations.get(addr);
        if (!size) return false;
        
        this.allocations.delete(addr);
        
        // Add back to free list and try to merge
        let inserted = false;
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            
            // Check if we can merge with this block
            if (block.start === addr + size) {
                // Merge with block after
                block.start = addr;
                block.size += size;
                inserted = true;
                
                // Check if we can also merge with block before
                if (i > 0) {
                    const prevBlock = this.freeList[i - 1];
                    if (prevBlock.start + prevBlock.size === addr) {
                        prevBlock.size += block.size;
                        this.freeList.splice(i, 1);
                    }
                }
                break;
            } else if (block.start + block.size === addr) {
                // Merge with block before
                block.size += size;
                inserted = true;
                
                // Check if we can also merge with block after
                if (i < this.freeList.length - 1) {
                    const nextBlock = this.freeList[i + 1];
                    if (addr + size === nextBlock.start) {
                        block.size += nextBlock.size;
                        this.freeList.splice(i + 1, 1);
                    }
                }
                break;
            } else if (block.start > addr) {
                // Insert before this block
                this.freeList.splice(i, 0, { start: addr, size: size });
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            this.freeList.push({ start: addr, size: size });
        }
        
        return true;
    }
    
    realloc(addr, newSize) {
        const oldSize = this.allocations.get(addr);
        if (!oldSize) return 0;
        
        if (newSize <= oldSize) {
            // Shrink - we can just update the size
            this.allocations.set(addr, newSize);
            if (newSize < oldSize) {
                // Return excess to free list
                this.free(addr + newSize);
                this.allocations.set(addr, newSize);
            }
            return addr;
        }
        
        // Try to expand in place
        const excess = newSize - oldSize;
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            if (block.start === addr + oldSize && block.size >= excess) {
                // Can expand in place
                if (block.size === excess) {
                    this.freeList.splice(i, 1);
                } else {
                    block.start += excess;
                    block.size -= excess;
                }
                this.allocations.set(addr, newSize);
                return addr;
            }
        }
        
        // Need to relocate
        const newAddr = this.alloc(newSize);
        if (newAddr === 0) return 0;
        
        this.free(addr);
        return newAddr;
    }
}

// Export the MemoryManager class
module.exports = MemoryManager;
