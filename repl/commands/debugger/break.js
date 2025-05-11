// Break command plugin

const BaseCommand = require('../BaseCommand');
const { parseAddress } = require('../../vm-expression-evaluator');

class BreakCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            // List breakpoints
            this.debugger.listBreakpoints();
        } else {
            // Set/clear breakpoint
            const addr = parseAddress(args[0]);
            this.debugger.toggleBreakpoint(addr);
        }
    }
    
    getHelp() {
        return {
            description: 'Set or list breakpoints',
            usage: 'break [address]',
            examples: [
                'break',
                'break 0x1000',
                'break 4096'
            ],
            category: 'Debugging',
            aliases: ['b']
        };
    }
    
    getAliases() {
        return ['b'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = BreakCommand;
