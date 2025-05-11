// Shell-like commands for BURST REPL

const fs = require('fs');
const path = require('path');
const helpSystem = require('./help-system');
const PlatformUtils = require('./platform-utils');

class ShellCommands {
    constructor(repl) {
        this.repl = repl;
        // Initialize current working directory
        this.cwd = process.cwd();
        this.registerHelp();
        
        // Load config
        this.config = PlatformUtils.loadConfig();
    }
    
    registerHelp() {
        helpSystem.registerCommand('cd', {
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
        });
        
        helpSystem.registerCommand('cwd', {
            description: 'Print current working directory',
            usage: 'cwd',
            category: 'Shell',
            aliases: ['pwd']
        });
        
        helpSystem.registerCommand('ls', {
            description: 'List directory contents',
            usage: 'ls [options] [directory]',
            examples: [
                'ls',
                'ls -l          # Detailed listing',
                'ls -a          # Show hidden files',
                'ls -la         # Both detailed and hidden',
                'ls ~/projects  # List specific directory'
            ],
            category: 'Shell'
        });
        
        helpSystem.registerCommand('cat', {
            description: 'Display file contents',
            usage: 'cat <file> [file2...]',
            examples: [
                'cat program.asm',
                'cat file1.txt file2.txt'
            ],
            category: 'Shell'
        });
        
        helpSystem.registerCommand('edit', {
            description: 'Edit file with external editor',
            usage: 'edit <file>',
            examples: [
                'edit program.asm',
                'edit new_file.txt'
            ],
            category: 'Shell'
        });
        
        helpSystem.registerCommand('exec', {
            description: 'Execute external command',
            usage: 'exec <command>',
            examples: [
                'exec make',
                'exec gcc -o prog prog.c',
                '!make          # Shortcut syntax'
            ],
            category: 'Shell',
            aliases: ['!']
        });
    }
    
    // Get absolute path relative to current working directory
    getAbsolutePath(filepath) {
        // Expand tilde first (unless it's a relative path like ./ or ../)
        if (!filepath.startsWith('./') && !filepath.startsWith('../')) {
            filepath = PlatformUtils.expandTilde(filepath);
        }
        
        if (path.isAbsolute(filepath)) {
            return filepath;
        }
        return path.resolve(this.cwd, filepath);
    }
    
    // Command: cd - Change directory
    async cmdCd(args) {
        if (args.length === 0) {
            // No args - go back to original working directory
            this.cwd = this.repl.originalCwd;
            console.log(this.cwd);
            return;
        }
        
        const targetPath = this.getAbsolutePath(args[0]);
        
        try {
            const stats = fs.statSync(targetPath);
            if (!stats.isDirectory()) {
                console.error(`cd: ${args[0]}: Not a directory`);
                return;
            }
            this.cwd = targetPath;
            console.log(this.cwd);
        } catch (error) {
            console.error(`cd: ${args[0]}: ${error.message}`);
        }
    }
    
    // Command: cwd/pwd - Print working directory
    async cmdCwd(args) {
        console.log(this.cwd);
    }
    
    // Command: ls - List directory contents
    async cmdLs(args) {
        let targetPath = this.cwd;
        let showHidden = false;
        let showDetails = false;
        
        // Parse arguments
        const paths = [];
        for (let arg of args) {
            if (arg.startsWith('-')) {
                if (arg.includes('a')) showHidden = true;
                if (arg.includes('l')) showDetails = true;
            } else {
                paths.push(arg);
            }
        }
        
        // If paths specified, use the first one
        if (paths.length > 0) {
            targetPath = this.getAbsolutePath(paths[0]);
        }
        
        try {
            let files = fs.readdirSync(targetPath);
            
            // Add . and .. if showing hidden files
            if (showHidden) {
                files = ['.', '..', ...files];
            }
            
            // Filter hidden files unless -a
            const filteredFiles = showHidden ? files : files.filter(f => !f.startsWith('.'));
            
            // Sort files
            filteredFiles.sort();
            
            if (showDetails) {
                // Show detailed listing
                const lines = [];
                for (const file of filteredFiles) {
                    let fullPath;
                    if (file === '.') {
                        fullPath = targetPath;
                    } else if (file === '..') {
                        fullPath = path.dirname(targetPath);
                    } else {
                        fullPath = path.join(targetPath, file);
                    }
                    
                    try {
                        const stats = fs.statSync(fullPath);
                        const mode = this.formatFileMode(stats);
                        const size = stats.size.toString().padStart(10);
                        const mtime = PlatformUtils.formatFileDate(stats.mtime);
                        const isDir = stats.isDirectory();
                        lines.push(`${mode} ${size} ${mtime} ${file}${(isDir && file !== '.' && file !== '..') ? '/' : ''}`);
                    } catch (error) {
                        lines.push(`?????????? ${file}`);
                    }
                }
                
                // Use pagination for detailed listing
                if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                    await this.repl.pager.paginate(lines);
                } else {
                    console.log(lines.join('\n'));
                }
            } else {
                // Simple listing with columns
                const items = filteredFiles.map(file => {
                    if (file === '.' || file === '..') {
                        return file;
                    }
                    const fullPath = path.join(targetPath, file);
                    try {
                        const stats = fs.statSync(fullPath);
                        return stats.isDirectory() ? file + '/' : file;
                    } catch {
                        return file;
                    }
                });
                console.log(PlatformUtils.formatColumns(items));
            }
        } catch (error) {
            console.error(`ls: ${targetPath}: ${error.message}`);
        }
    }
    
    // Command: cat - Concatenate and display files
    async cmdCat(args) {
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
                await this.repl.pager.paginate(combinedContent);
            } else {
                console.log(combinedContent);
            }
        }
    }
    
    // Command: edit - Launch external editor
    async cmdEdit(args) {
        if (args.length === 0) {
            console.error('edit: no file specified');
            return;
        }
        
        // Use config editor if specified, otherwise use environment
        const editor = this.config.editor || process.env.EDITOR || process.env.VISUAL || 'vi';
        const filepath = this.getAbsolutePath(args[0]);
        
        console.log(`Launching ${editor} for ${filepath}...`);
        console.log('(Use Ctrl+Z to suspend and "fg" to resume when done)');
        
        // Create a child process for the editor
        const { spawn } = require('child_process');
        const child = spawn(editor, [filepath], {
            stdio: 'inherit',
            shell: true
        });
        
        // Pause the REPL while editor is running
        this.repl.rl.pause();
        
        child.on('exit', (code) => {
            console.log(`Editor exited with code ${code}`);
            this.repl.rl.resume();
            this.repl.rl.prompt();
        });
    }
    
    // Command: exec - Execute external command
    async cmdExec(args) {
        if (args.length === 0) {
            console.error('exec: no command specified');
            return;
        }
        
        const command = args.join(' ');
        console.log(`Executing: ${command}`);
        
        const { spawn } = require('child_process');
        const child = spawn(command, [], {
            stdio: 'inherit',
            shell: true,
            cwd: this.cwd
        });
        
        // Pause the REPL while command is running
        this.repl.rl.pause();
        
        child.on('exit', (code) => {
            console.log(`Command exited with code ${code}`);
            this.repl.rl.resume();
            this.repl.rl.prompt();
        });
    }
    
    // Helper: Format file mode string
    formatFileMode(stats) {
        let mode = '';
        mode += stats.isDirectory() ? 'd' : '-';
        mode += stats.mode & 0o400 ? 'r' : '-';
        mode += stats.mode & 0o200 ? 'w' : '-';
        mode += stats.mode & 0o100 ? 'x' : '-';
        mode += stats.mode & 0o040 ? 'r' : '-';
        mode += stats.mode & 0o020 ? 'w' : '-';
        mode += stats.mode & 0o010 ? 'x' : '-';
        mode += stats.mode & 0o004 ? 'r' : '-';
        mode += stats.mode & 0o002 ? 'w' : '-';
        mode += stats.mode & 0o001 ? 'x' : '-';
        return mode;
    }
    
    // Get commands - include any configured aliases
    getCommands() {
        const commands = {
            cd: this.cmdCd.bind(this),
            cwd: this.cmdCwd.bind(this),
            pwd: this.cmdCwd.bind(this),  // Alias
            ls: this.cmdLs.bind(this),
            cat: this.cmdCat.bind(this),
            edit: this.cmdEdit.bind(this),
            exec: this.cmdExec.bind(this),
            '!': this.cmdExec.bind(this),  // Shell shortcut
        };
        
        // Add configured aliases
        for (const [alias, command] of Object.entries(this.config.aliases)) {
            if (commands[command]) {
                commands[alias] = commands[command];
            } else {
                // For editor aliases and other custom commands
                if (command === 'edit') {
                    commands[alias] = this.cmdEdit.bind(this);
                } else {
                    // Create a command that executes the alias
                    commands[alias] = async (args) => {
                        const fullCommand = command.split(' ').concat(args);
                        const baseCommand = fullCommand[0];
                        const commandArgs = fullCommand.slice(1);
                        
                        if (commands[baseCommand]) {
                            await commands[baseCommand](commandArgs);
                        } else {
                            console.error(`Unknown command in alias: ${baseCommand}`);
                        }
                    };
                }
            }
        }
        
        return commands;
    }
}

module.exports = ShellCommands;
