// Quit command plugin

const BaseCommand = require('../BaseCommand');

class QuitCommand extends BaseCommand {
    async execute(args) {
        if (this.repl.rl) {
            this.repl.rl.close();
        }
    }
    
    getHelp() {
        return {
            description: 'Exit the REPL',
            usage: 'quit',
            category: 'General',
            aliases: ['q', 'exit']
        };
    }
    
    getAliases() {
        return ['q', 'exit'];
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = QuitCommand;
