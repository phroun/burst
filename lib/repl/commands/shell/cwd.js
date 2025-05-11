// Current working directory command plugin

const BaseCommand = require('../BaseCommand');

class CwdCommand extends BaseCommand {
    async execute(args) {
        console.log(this.getCwd());
    }
    
    getHelp() {
        return {
            description: 'Print current working directory',
            usage: 'cwd',
            category: 'Shell'
        };
    }
    
    getAliases() {
        return ['pwd'];
    }
}

module.exports = CwdCommand;
