// Binary load command plugin

const fs = require('fs');
const BaseCommand = require('../BaseCommand');

class BloadCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: bload <file>');
            return;
        }
        
        const filename = this.getAbsolutePath(args[0]);
        try {
            const data = fs.readFileSync(filename);
            this.vm.loadProgram(new Uint8Array(data));
            console.log(`Loaded ${data.length} bytes from ${args[0]}`);
        } catch (error) {
            console.error(`Failed to load binary file: ${error.message}`);
        }
    }
    
    getHelp() {
        return {
            description: 'Load binary program from file',
            usage: 'bload <file>',
            examples: [
                'bload program.bin',
                'bload ../tests/test1.bin'
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

module.exports = BloadCommand;
