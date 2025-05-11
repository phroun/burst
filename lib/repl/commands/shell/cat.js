// Cat command plugin

const fs = require('fs');
const BaseCommand = require('../BaseCommand');

class CatCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.error('cat: no files specified');
            return;
        }
        
        const allContent = [];
        
        for (const arg of args) {
            const filepath = this.getAbsolutePath(arg);
            try {
                const content = fs.readFileSync(filepath, 'utf8');
                if (args.length > 1) {
                    allContent.push(`==> ${arg} <==`);
                }
                allContent.push(content);
            } catch (error) {
                console.error(`cat: ${arg}: ${error.message}`);
            }
        }
        
        if (allContent.length > 0) {
            const combinedContent = allContent.join('\n');
            if (this.repl.pager && this.repl.pager.shouldPaginate(combinedContent)) {
                await this.repl.pager.paginate(combinedContent, this.repl.rl);
            } else {
                console.log(combinedContent);
            }
        }
    }
    
    getHelp() {
        return {
            description: 'Display file contents',
            usage: 'cat <file> [file2...]',
            examples: [
                'cat program.asm',
                'cat file1.txt file2.txt'
            ],
            category: 'Shell'
        };
    }
}

module.exports = CatCommand;
