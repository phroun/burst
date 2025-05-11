// Binary save command plugin

const fs = require('fs');
const BaseCommand = require('../BaseCommand');

class BsaveCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: bsave <file>');
            return;
        }
        
        const filename = this.getAbsolutePath(args[0]);
        try {
            fs.writeFileSync(filename, this.vm.memory);
            console.log(`Saved ${this.vm.memory.length} bytes to ${args[0]}`);
        } catch (error) {
            console.error(`Failed to save binary file: ${error.message}`);
        }
    }
    
    getHelp() {
        return {
            description: 'Save binary memory to file',
            usage: 'bsave <file>',
            examples: [
                'bsave memory.bin',
                'bsave dump.bin'
            ],
            category: 'File Operations'
        };
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = BsaveCommand;
