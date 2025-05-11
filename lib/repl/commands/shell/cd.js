// Change directory command plugin

const fs = require('fs');
const BaseCommand = require('../BaseCommand');

class CdCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            // No args - go back to original working directory
            this.setCwd(this.getOriginalCwd());
            console.log(this.getCwd());
            return;
        }
        
        const targetPath = this.getAbsolutePath(args[0]);
        
        try {
            const stats = fs.statSync(targetPath);
            if (!stats.isDirectory()) {
                console.error(`cd: ${args[0]}: Not a directory`);
                return;
            }
            this.setCwd(targetPath);
            console.log(this.getCwd());
        } catch (error) {
            console.error(`cd: ${args[0]}: ${error.message}`);
        }
    }
    
    getHelp() {
        return {
            description: 'Change current directory',
            usage: 'cd [directory]',
            examples: [
                'cd /home/user',
                'cd ~/projects',
                'cd ~username   # Go to another user\'s home',
                'cd ./subdir    # Go to subdirectory',
                'cd ../sibling  # Go to sibling directory',
                'cd ..          # Go up one directory',
                'cd             # Return to original launch directory'
            ],
            category: 'Shell'
        };
    }
}

module.exports = CdCommand;
