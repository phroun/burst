// Reset command plugin

const BaseCommand = require('../BaseCommand');

class ResetCommand extends BaseCommand {
    async execute(args) {
        const { BurstVM } = require('../../../burst-vm');
        const { Debugger } = require('../../debugger');
        
        this.repl.vm = new BurstVM();
        this.repl.debugger = new Debugger(this.repl.vm);
        console.log('VM reset');
    }
    
    getHelp() {
        return {
            description: 'Reset the virtual machine state',
            usage: 'reset',
            category: 'General'
        };
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = ResetCommand;
