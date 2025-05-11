// Make directory command plugin

const fs = require('fs');
const BaseCommand = require('../BaseCommand');

class MkdirCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.error('mkdir: missing operand');
            return;
        }
        
        // Support -p option for creating parent directories
        let createParents = false;
        const dirs = [];
        
        for (const arg of args) {
            if (arg === '-p') {
                createParents = true;
            } else if (arg.startsWith('-')) {
                console.error(`mkdir: invalid option '${arg}'`);
                return;
            } else {
                dirs.push(arg);
            }
        }
        
        if (dirs.length === 0) {
            console.error('mkdir: missing operand');
            return;
        }
        
        for (const dir of dirs) {
            const fullPath = this.getAbsolutePath(dir);
            
            try {
                if (createParents) {
                    fs.mkdirSync(fullPath, { recursive: true });
                } else {
                    fs.mkdirSync(fullPath);
                }
                console.log(`Created directory: ${dir}`);
            } catch (error) {
                if (error.code === 'EEXIST') {
                    console.error(`mkdir: cannot create directory '${dir}': File exists`);
                } else {
                    console.error(`mkdir: cannot create directory '${dir}': ${error.message}`);
                }
            }
        }
    }
    
    getHelp() {
        return {
            description: 'Create directories',
            usage: 'mkdir [options] <directory...>',
            examples: [
                'mkdir newdir',
                'mkdir dir1 dir2 dir3',
                'mkdir -p path/to/new/dir  # Create parent directories as needed'
            ],
            category: 'Shell'
        };
    }
}

module.exports = MkdirCommand;
