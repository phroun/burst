// Debugger functionality for BURST REPL

class Debugger {
    constructor(vm) {
        this.vm = vm;
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
        
        while (this.running && !this.vm.halted) {
            const pc = this.vm.pc;
            
            // Check breakpoints
            if (this.breakpoints.has(pc)) {
                console.log(`Breakpoint at 0x${pc.toString(16)}`);
                this.running = false;
                break;
            }
            
            // Check watchpoints
            for (const [addr, oldValue] of this.watchpoints) {
                const newValue = this.vm.readWord(addr);
                if (newValue !== oldValue) {
                    console.log(`Watchpoint: [0x${addr.toString(16)}] changed from 0x${oldValue.toString(16)} to 0x${newValue.toString(16)}`);
                    this.watchpoints.set(addr, newValue);
                    this.running = false;
                    break;
                }
            }
            
            this.vm.step();
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
            const value = this.vm.readWord(addr);
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
}

module.exports = { Debugger };
