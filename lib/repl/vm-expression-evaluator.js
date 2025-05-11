// VM Expression evaluator for BURST REPL

function evaluateExpression(vm, expr, symbols = new Map()) {
    // Simple expression evaluator
    // Supports: registers, memory access, constants
    
    if (expr.match(/^r\d+$/i)) {
        // Register
        const regNum = parseInt(expr.substr(1));
        return vm.registers[regNum];
    } else if (expr === 'pc') {
        return vm.pc;
    } else if (expr === 'sp') {
        return vm.sp;
    } else if (expr.match(/^\[.+\]$/)) {
        // Memory access
        const inner = expr.slice(1, -1);
        const addr = evaluateExpression(vm, inner, symbols);
        return vm.readWord(addr);
    } else if (expr.startsWith('0x')) {
        // Hex constant
        return parseInt(expr, 16);
    } else {
        // Decimal constant or symbol
        const value = parseInt(expr);
        if (!isNaN(value)) {
            return value;
        }
        
        // Check symbols
        if (symbols.has(expr)) {
            return symbols.get(expr);
        }
        
        throw new Error(`Unknown expression: ${expr}`);
    }
}

function parseAddress(str) {
    if (str.startsWith('0x')) {
        return parseInt(str, 16);
    } else {
        return parseInt(str);
    }
}

function parseValue(str) {
    if (str.startsWith('0x')) {
        return parseInt(str, 16);
    } else if (str.startsWith("'") && str.endsWith("'")) {
        return str.charCodeAt(1);
    } else {
        return parseInt(str);
    }
}

function parseRegister(str) {
    return str.toLowerCase();
}

module.exports = {
    evaluateExpression,
    parseAddress,
    parseValue,
    parseRegister
};
