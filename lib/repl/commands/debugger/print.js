// Print command plugin

const BaseCommand = require('../BaseCommand');
const { evaluateExpression } = require('../../vm-expression-evaluator');
const { ExprEvaluator } = require('../../expression-evaluator');

class PrintCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: print <expression>');
            return;
        }
        
        const expr = args.join(' ');
        const exprEval = new ExprEvaluator((n) => { if (n == 'x') return 100; return n; });
        try {
            const value = evaluateExpression(this.vm, exprEval.evaluate(expr), this.debugger.symbols);
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
