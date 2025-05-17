// Continue command plugin

const BaseCommand = require('../BaseCommand');

class ContinueCommand extends BaseCommand {
    async execute(args) {
        if (this.vm.halted) {
            console.log('Program already halted');
            return;
        }
        
        this.debugger.run();
    }
    
    getHelp() {
        return {
            description: 'Continue execution until breakpoint or halt',
            usage: 'continue',
            category: 'Execution',
            aliases: ['c']
        };
    }
    
    getAliases() {
        return ['c'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = ContinueCommand;
