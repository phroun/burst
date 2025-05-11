// Exec command plugin

const { spawn } = require('child_process');
const BaseCommand = require('../BaseCommand');

class ExecCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.error('exec: no command specified');
            return;
        }
        
        const command = args.join(' ');
        console.log(`Executing: ${command}`);
        
        return new Promise((resolve) => {
            // Pause the REPL while command is running
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
            
            const child = spawn(command, [], {
                stdio: 'inherit',
                shell: true,
                cwd: this.getCwd()
            });
            
            child.on('exit', (code) => {
                console.log(`Command exited with code ${code}`);
                
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
                console.error(`Failed to execute command: ${err.message}`);
                
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
            description: 'Execute external command',
            usage: 'exec <command>',
            examples: [
                'exec make',
                'exec gcc -o prog prog.c',
                '!make          # Shortcut syntax'
            ],
            category: 'Shell'
        };
    }
    
    getAliases() {
        return ['!'];
    }
}

module.exports = ExecCommand;
