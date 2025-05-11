// Edit command plugin

const { spawn } = require('child_process');
const BaseCommand = require('../BaseCommand');

class EditCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.error('edit: no file specified');
            return;
        }
        
        // Use config editor if specified, otherwise use environment
        const editor = this.config.editor || process.env.EDITOR || process.env.VISUAL || 'vi';
        const filepath = this.getAbsolutePath(args[0]);
        
        console.log(`Launching ${editor} for ${filepath}...`);
        
        // Properly handle external command execution
        return new Promise((resolve) => {
            // Pause the REPL while editor is running
            this.repl.rl.pause();
            
            // Completely remove keypress handlers to avoid input conflicts
            const keypressListeners = process.stdin.listeners('keypress');
            const dataListeners = process.stdin.listeners('data');
            process.stdin.removeAllListeners('keypress');
            process.stdin.removeAllListeners('data');
            
            // Save and disable raw mode
            const wasRaw = process.stdin.isRaw;
            if (wasRaw && process.stdin.setRawMode) {
                process.stdin.setRawMode(false);
            }
            
            const child = spawn(editor, [filepath], {
                stdio: 'inherit',
                shell: true
            });
            
            child.on('exit', (code) => {
                console.log(`Editor exited with code ${code}`);
                
                // Restore raw mode
                if (wasRaw && process.stdin.setRawMode) {
                    process.stdin.setRawMode(true);
                }
                
                // Restore listeners
                keypressListeners.forEach(listener => {
                    process.stdin.on('keypress', listener);
                });
                dataListeners.forEach(listener => {
                    process.stdin.on('data', listener);
                });
                
                // Resume the REPL
                this.repl.rl.resume();
                this.repl.rl.prompt();
                resolve();
            });
            
            child.on('error', (err) => {
                console.error(`Failed to launch editor: ${err.message}`);
                
                // Restore everything on error as well
                if (wasRaw && process.stdin.setRawMode) {
                    process.stdin.setRawMode(true);
                }
                
                keypressListeners.forEach(listener => {
                    process.stdin.on('keypress', listener);
                });
                dataListeners.forEach(listener => {
                    process.stdin.on('data', listener);
                });
                
                this.repl.rl.resume();
                this.repl.rl.prompt();
                resolve();
            });
        });
    }
    
    getHelp() {
        return {
            description: 'Edit file with external editor',
            usage: 'edit <file>',
            examples: [
                'edit program.asm',
                'edit new_file.txt'
            ],
            category: 'Shell'
        };
    }
}

module.exports = EditCommand;
