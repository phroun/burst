// Print command plugin - Updated for interface architecture

const BaseCommand = require('../BaseCommand');
const { evaluateExpression, createVMLookupFunction } = require('../../utils/vm-expression-evaluator');
const { ExprEvaluator } = require('../../utils/expression-evaluator');

class PrintCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: print <expression>');
            return;
        }
        
        const expr = args.join(' ');
        
        try {
            // Create a variable lookup function that uses vmInterface
            const lookupFn = createVMLookupFunction(this.vmInterface, this.debugger.symbols);
            
            // Create expression evaluator with our lookup function
            const exprEval = new ExprEvaluator(lookupFn);
            
            // Evaluate the expression
            const valueExpression = exprEval.evaluate(expr);
            
            // Pass to evaluateExpression for memory access and final resolution
            const value = evaluateExpression(this.vmInterface, valueExpression, this.debugger.symbols);
            
            console.log(`${expr} = 0x${value.toString(16)} (${value})`);
        } catch (error) {
            console.error(`Error evaluating expression: ${error.message}`);
        }
    }
    
    getHelp() {
        return {
            description: 'Print value of expression',
            usage: 'print <expression>',
            examples: [
                'print r0',
                'print [0x1000]',
                'print pc'
            ],
            category: 'Inspection',
            aliases: ['p']
        };
    }
    
    getAliases() {
        return ['p'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = PrintCommand;
