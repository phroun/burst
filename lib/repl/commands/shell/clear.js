// Current working directory command plugin

const BaseCommand = require('../BaseCommand');

class ClearCommand extends BaseCommand {
    async execute(args) {
        console.clear();
    }
    
    getHelp() {
        return {
            description: 'Clears the screen',
            usage: 'clear',
            category: 'Shell'
        };
    }
    
    getAliases() {
        return ['cls'];
    }
}

module.exports = ClearCommand;
