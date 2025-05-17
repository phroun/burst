// Reset command plugin - Updated for interface architecture

const BaseCommand = require('../BaseCommand');

class ResetCommand extends BaseCommand {
    async execute(args) {
        try {
            // Reset the VM using the VM interface
            const result = this.vmInterface.reset();
            
            // Reset the debugger to match
            if (this.debugger && this.debugger.reset) {
                this.debugger.reset();
            }
            
            console.log('VM reset');
        } catch (error) {
            console.error(`Reset failed: ${error.message}`);
        }
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
