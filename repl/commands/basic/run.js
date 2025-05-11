// Run command plugin

const BaseCommand = require('../BaseCommand');

class RunCommand extends BaseCommand {
    async execute(args) {
        if (args.length > 0) {
            // Load and run file
            const BloadCommand = require('./bload');
            const bloadCmd = new BloadCommand(this.commandLoader);
            await bloadCmd.execute(args);
        }
        
        console.log('Running...');
        this.debugger.run();
        
        if (this.vm.halted) {
            console.log('Program halted');
        }
    }
    
    getHelp() {
        return {
            description: 'Run program from beginning or load and run file',
            usage: 'run [file]',
            examples: [
                'run',
                'run program.bin'
            ],
            category: 'Execution',
            aliases: ['r']
        };
    }
    
    getAliases() {
        return ['r'];
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = RunCommand;
