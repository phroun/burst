// Watch command plugin

const BaseCommand = require('../BaseCommand');
const { parseAddress } = require('../../vm-expression-evaluator');

class WatchCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            // List watchpoints
            this.debugger.listWatchpoints();
        } else {
            // Set/clear watchpoint
            const addr = parseAddress(args[0]);
            this.debugger.toggleWatchpoint(addr);
        }
    }
    
    getHelp() {
        return {
            description: 'Set or list watchpoints',
            usage: 'watch [address]',
            examples: [
                'watch',
                'watch 0x2000'
            ],
            category: 'Debugging',
            aliases: ['w']
        };
    }
    
    getAliases() {
        return ['w'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = WatchCommand;
