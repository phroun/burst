// Debugger functionality for BURST REPL - Updated to use VM interface

class Debugger {
    constructor(vmInterface) {
        this.vmInterface = vmInterface;
        this.breakpoints = new Set();
        this.watchpoints = new Map();
        this.running = false;
        this.symbols = new Map();
    }
    
    reset() {
        this.breakpoints.clear();
        this.watchpoints.clear();
        this.running = false;
        this.symbols.clear();
    }
    
    run() {
        this.running = true;
        
        while (this.running && !this.vmInterface.isHalted()) {
            const pc = this.vmInterface.getPC();
            
            // Check breakpoints
            if (this.breakpoints.has(pc)) {
                console.log(`Breakpoint at 0x${pc.toString(16)}`);
                this.running = false;
                break;
            }
            
            // Check watchpoints
            for (const [addr, oldValue] of this.watchpoints) {
                const newValue = this.vmInterface.readWord(addr);
                if (newValue !== oldValue) {
                    console.log(`Watchpoint: [0x${addr.toString(16)}] changed from 0x${oldValue.toString(16)} to 0x${newValue.toString(16)}`);
                    this.watchpoints.set(addr, newValue);
                    this.running = false;
                    break;
                }
            }
            
            if (this.running) {
                this.vmInterface.step();
            }
        }
    }
    
    stop() {
        this.running = false;
    }
    
    toggleBreakpoint(addr) {
        if (this.breakpoints.has(addr)) {
            this.breakpoints.delete(addr);
            console.log(`Breakpoint cleared at 0x${addr.toString(16)}`);
        } else {
            this.breakpoints.add(addr);
            console.log(`Breakpoint set at 0x${addr.toString(16)}`);
        }
    }
    
    toggleWatchpoint(addr) {
        if (this.watchpoints.has(addr)) {
            this.watchpoints.delete(addr);
            console.log(`Watchpoint cleared at 0x${addr.toString(16)}`);
        } else {
            const value = this.vmInterface.readWord(addr);
            this.watchpoints.set(addr, value);
            console.log(`Watchpoint set at 0x${addr.toString(16)}`);
        }
    }
    
    listBreakpoints() {
        if (this.breakpoints.size === 0) {
            console.log('No breakpoints set');
        } else {
            console.log('Breakpoints:');
            for (const addr of this.breakpoints) {
                console.log(`  0x${addr.toString(16)}`);
            }
        }
    }
    
    listWatchpoints() {
        if (this.watchpoints.size === 0) {
            console.log('No watchpoints set');
        } else {
            console.log('Watchpoints:');
            for (const [addr, value] of this.watchpoints) {
                console.log(`  0x${addr.toString(16)}: 0x${value.toString(16)}`);
            }
        }
    }
    
    addSymbol(name, address) {
        this.symbols.set(name, address);
    }
    
    getSymbol(name) {
        return this.symbols.get(name);
    }
    
    getAllSymbols() {
        return Object.fromEntries(this.symbols);
    }
    
    // Find closest symbol to an address
    findClosestSymbol(address) {
        let closestSymbol = null;
        let closestOffset = Number.MAX_SAFE_INTEGER;
        
        for (const [name, symAddr] of this.symbols.entries()) {
            if (symAddr <= address) {
                const offset = address - symAddr;
                if (offset < closestOffset) {
                    closestSymbol = name;
                    closestOffset = offset;
                }
            }
        }
        
        if (closestSymbol !== null && closestOffset > 0) {
            return `${closestSymbol}+${closestOffset}`;
        } else if (closestSymbol !== null) {
            return closestSymbol;
        }
        
        return null;
    }
    
    // Get symbol address, resolving expressions like "symbol+offset"
    resolveSymbolAddress(symbolExpr) {
        // Check for symbol+offset form
        const match = symbolExpr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\+(\d+)$/);
        if (match) {
            const [_, symbolName, offsetStr] = match;
            const baseAddr = this.symbols.get(symbolName);
            if (baseAddr !== undefined) {
                return baseAddr + parseInt(offsetStr);
            }
        }
        
        // Direct symbol lookup
        const addr = this.symbols.get(symbolExpr);
        if (addr !== undefined) {
            return addr;
        }
        
        // Try to parse as a number
        if (symbolExpr.startsWith('0x')) {
            return parseInt(symbolExpr, 16);
        }
        
        if (/^\d+$/.test(symbolExpr)) {
            return parseInt(symbolExpr);
        }
        
        return null;
    }
}

module.exports = { Debugger };
