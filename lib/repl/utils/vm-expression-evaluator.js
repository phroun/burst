// VM Expression evaluator for BURST REPL - Updated for interface architecture

/**
 * Evaluates an expression in the context of a VM
 * @param {Object} vmInterface - The VM interface
 * @param {*} expr - The expression to evaluate
 * @param {Map} symbols - Optional symbol table for label resolution
 * @returns {number} The evaluated expression value
 */
function evaluateExpression(vmInterface, expr, symbols = new Map()) {
    // Simple expression evaluator
    // Supports: registers, memory access, constants
    
    if (expr.match(/^r\d+$/i)) {
        // Register
        const regNum = parseInt(expr.substr(1));
        return vmInterface.getRegister(regNum);
    } else if (expr === 'pc') {
        return vmInterface.getPC();
    } else if (expr === 'sp' && vmInterface.state && vmInterface.state.sp !== undefined) {
        return vmInterface.state.sp;
    } else if (typeof expr === 'object' && expr.type === 'memoryAccess') {
        // Memory access from the expression evaluator
        return vmInterface.readWord(expr.address);
    } else if (expr.match(/^\[.+\]$/)) {
        // Memory access syntax
        const inner = expr.slice(1, -1);
        const addr = evaluateExpression(vmInterface, inner, symbols);
        return vmInterface.readWord(addr);
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
        if (symbols && symbols.has(expr)) {
            return symbols.get(expr);
        }
        
        throw new Error(`Unknown expression: ${expr}`);
    }
}

/**
 * Parse an address string into a number
 * @param {string} str - The address string to parse
 * @returns {number} The parsed address
 */
function parseAddress(str) {
    if (str.startsWith('0x')) {
        return parseInt(str, 16);
    } else {
        return parseInt(str);
    }
}

/**
 * Parse a value string into a number
 * @param {string} str - The value string to parse
 * @returns {number} The parsed value
 */
function parseValue(str) {
    if (str.startsWith('0x')) {
        return parseInt(str, 16);
    } else if (str.startsWith("'") && str.endsWith("'")) {
        return str.charCodeAt(1);
    } else {
        return parseInt(str);
    }
}

/**
 * Parse a register name
 * @param {string} str - The register name to parse
 * @returns {string} The normalized register name
 */
function parseRegister(str) {
    return str.toLowerCase();
}

/**
 * Create a variable lookup function that uses vmInterface
 * @param {Object} vmInterface - The VM interface
 * @param {Map} symbols - Optional symbol table for label resolution
 * @returns {Function} A lookup function for use with ExprEvaluator
 */
function createVMLookupFunction(vmInterface, symbols = new Map()) {
    return (name) => {
        if (name.match(/^r\d+$/i)) {
            // Register
            const regNum = parseInt(name.substr(1));
            return vmInterface.getRegister(regNum);
        } else if (name === 'pc') {
            return vmInterface.getPC();
        } else if (name === 'sp' && vmInterface.state && vmInterface.state.sp !== undefined) {
            return vmInterface.state.sp;
        } else if (symbols && symbols.has(name)) {
            // Try symbols
            return symbols.get(name);
        }
        
        // Default to returning the name as is (might be a number)
        const value = parseInt(name);
        return isNaN(value) ? name : value;
    };
}

module.exports = {
    evaluateExpression,
    parseAddress,
    parseValue,
    parseRegister,
    createVMLookupFunction
};
