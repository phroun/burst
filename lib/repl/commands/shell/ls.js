// List directory command plugin

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../BaseCommand');

class LsCommand extends BaseCommand {
    async execute(args) {
        let targetPath = this.getCwd();
        let showHidden = false;
        let showDetails = false;
        let targetPattern = null;
        
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
        
        // Process the path/pattern argument
        if (paths.length > 0) {
            const pathArg = paths[0];
            
            // Check if the argument contains glob characters
            if (this.glob.hasGlobChars(pathArg)) {
                // Split into directory and pattern
                const { dir, pattern } = this.glob.splitPath(pathArg);
                targetPath = this.getAbsolutePath(dir);
                targetPattern = pattern;
            } else {
                // It's a regular path - could be file or directory
                const fullPath = this.getAbsolutePath(pathArg);
                
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isDirectory()) {
                        targetPath = fullPath;
                    } else {
                        // It's a file - list just that file
                        await this.listSingleFile(fullPath, pathArg, showDetails);
                        return;
                    }
                } catch (error) {
                    console.error(`ls: ${pathArg}: ${error.message}`);
                    return;
                }
            }
        }
        
        try {
            let files = fs.readdirSync(targetPath);
            
            // Add . and .. if showing hidden files and no pattern
            if (showHidden && !targetPattern) {
                files = ['.', '..', ...files];
            }
            
            // Apply pattern filtering if specified
            if (targetPattern) {
                files = this.glob.filter(files, targetPattern);
            }
            
            // Filter hidden files unless -a
            const filteredFiles = showHidden ? files : files.filter(f => !f.startsWith('.'));
            
            // Sort files
            filteredFiles.sort();
            
            if (filteredFiles.length === 0 && targetPattern) {
                console.log(`ls: No match for pattern '${targetPattern}'`);
                return;
            }
            
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
                        const mtime = this.PlatformUtils.formatFileDate(stats.mtime);
                        const isDir = stats.isDirectory();
                        lines.push(`${mode} ${size} ${mtime} ${file}${(isDir && file !== '.' && file !== '..') ? '/' : ''}`);
                    } catch (error) {
                        lines.push(`?????????? ${file}`);
                    }
                }
                
                // Use pagination for detailed listing
                if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                    await this.repl.pager.paginate(lines, this.repl.rl);
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
                console.log(this.PlatformUtils.formatColumns(items));
            }
        } catch (error) {
            console.error(`ls: ${targetPath}: ${error.message}`);
        }
    }
    
    // Helper method to list a single file
    async listSingleFile(fullPath, displayName, showDetails) {
        try {
            const stats = fs.statSync(fullPath);
            
            if (showDetails) {
                const mode = this.formatFileMode(stats);
                const size = stats.size.toString().padStart(10);
                const mtime = this.PlatformUtils.formatFileDate(stats.mtime);
                console.log(`${mode} ${size} ${mtime} ${displayName}`);
            } else {
                console.log(displayName);
            }
        } catch (error) {
            console.error(`ls: ${displayName}: ${error.message}`);
        }
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
    
    getHelp() {
        return {
            description: 'List directory contents',
            usage: 'ls [options] [path|pattern]',
            examples: [
                'ls',
                'ls -l              # Detailed listing',
                'ls -a              # Show hidden files',
                'ls -la             # Both detailed and hidden',
                'ls ~/projects      # List specific directory',
                'ls myfile.txt      # Show specific file',
                'ls *.asm           # List files matching pattern',
                'ls src/*.js        # List matching files in directory',
                'ls test?.txt       # Match single character',
                'ls [abc]*.txt      # Character class matching',
                'ls {src,test}/*.js # Brace expansion'
            ],
            category: 'Shell'
        };
    }
}

module.exports = LsCommand;
