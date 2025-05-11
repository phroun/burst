// Tab completion module for BURST REPL - Fixed display with partial completion

const fs = require('fs');
const path = require('path');
const PlatformUtils = require('./platform-utils');

// Helper function to find the longest common prefix
function findLongestCommonPrefix(strings) {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];
    
    let prefix = '';
    const firstString = strings[0];
    
    for (let i = 0; i < firstString.length; i++) {
        const char = firstString[i];
        for (let j = 1; j < strings.length; j++) {
            if (i >= strings[j].length || strings[j][i] !== char) {
                return prefix;
            }
        }
        prefix += char;
    }
    
    return prefix;
}

function createCompleter(repl) {
    // Store the actual completer function
    const actualCompleter = function(line) {
        // First try command completion
        const commands = Object.keys(repl.commands);
        let hits = commands.filter(cmd => cmd.startsWith(line));
        
        // Also include mnemonics in completion
        if (hits.length === 0) {
            hits = repl.validMnemonics.filter(mnem => mnem.startsWith(line.toLowerCase()));
        }
        
        // If still no hits and no space in line, try file/directory completion for potential paths
        if (hits.length === 0 && !line.includes(' ') && 
            (line.includes('/') || line.startsWith('~') || line.startsWith('./') || line.startsWith('../') || line === '.' || line === '..')) {
            // Treat it as a file path without a command
            const partial = line;
            
            // Special case: if partial is exactly '..' add trailing slash
            if (partial === '..') {
                return [[partial + '/'], line];
            }
            
            const expandedPartial = PlatformUtils.expandTilde(partial);
            
            try {
                let dir = path.dirname(expandedPartial);
                let basename = path.basename(expandedPartial);
                
                // If ending with /, the basename is empty and we want to list the directory contents
                if (partial.endsWith('/')) {
                    dir = expandedPartial;
                    basename = '';
                }
                
                // Special handling for completing '.'
                if (partial === '.') {
                    dir = repl.cwd;
                    basename = '.';
                }
                
                // Handle ./ and ../ resolution
                if (dir === '.') {
                    dir = repl.cwd;
                } else if (dir === '..') {
                    dir = path.dirname(repl.cwd);
                }
                
                // Make path absolute
                const absDir = repl.getAbsolutePath(dir);
                
                let files = fs.readdirSync(absDir);
                
                // If we're looking for files starting with '.', include . and ..
                if (basename === '.') {
                    files = ['.', '..'].concat(files.filter(f => f.startsWith('.')));
                }
                
                const matches = files
                    .filter(f => f.startsWith(basename))
                    .map(f => {
                        const absPath = path.join(absDir, f);
                        let displayPath;
                        
                        // If we're completing after a /, just show the filename
                        if (partial.endsWith('/')) {
                            displayPath = partial + f;
                        } else if (basename === '.' && (f === '.' || f === '..')) {
                            // For . and .. special directories
                            displayPath = f;
                        } else {
                            displayPath = path.join(path.dirname(partial), f);
                        }
                        
                        // Check if it's a directory and add trailing slash
                        try {
                            if (f === '.' || f === '..') {
                                displayPath += '/';
                            } else {
                                const stats = fs.statSync(absPath);
                                if (stats.isDirectory()) {
                                    displayPath += '/';
                                }
                            }
                        } catch (e) {
                            // Ignore stat errors
                        }
                        
                        return displayPath;
                    });
                
                if (matches.length > 0) {
                    return [matches, line];
                }
            } catch (e) {
                // Fall through
            }
        }
        
        // If still no hits and line includes a space, try file completion
        if (hits.length === 0 && line.includes(' ')) {
            const parts = line.split(' ');
            const cmd = parts[0];
            const partial = parts[parts.length - 1];
            
            // Handle tilde completion
            if (partial.startsWith('~') && !partial.includes('/')) {
                // Complete usernames after ~
                const prefix = partial.substring(1);
                const usernames = PlatformUtils.getUsernames();
                hits = usernames
                    .filter(user => user.startsWith(prefix))
                    .map(user => parts.slice(0, -1).concat(`~${user}/`).join(' '));
                
                if (hits.length > 0) {
                    return [hits, line];
                }
            }
            
            // Expand tilde in the partial path
            const expandedPartial = PlatformUtils.expandTilde(partial);
            
            // Commands that take file arguments
            const fileCommands = ['bload', 'bsave', 'assemble', 'cat', 'edit', 'cd', 'ls'];
            if (fileCommands.includes(cmd)) {
                // Special case: if partial is exactly '..' add trailing slash
                if (partial === '..') {
                    const completion = parts.slice(0, -1).concat(partial + '/').join(' ');
                    return [[completion], line];
                }
                
                try {
                    let dir = path.dirname(expandedPartial);
                    let basename = path.basename(expandedPartial);
                    
                    // If ending with /, the basename is empty and we want to list the directory contents
                    if (partial.endsWith('/')) {
                        dir = expandedPartial;
                        basename = '';
                    }
                    
                    // Special handling for completing '.'
                    if (partial === '.') {
                        dir = repl.cwd;
                        basename = '.';
                    }
                    
                    // Handle ./ and ../ resolution
                    if (dir === '.') {
                        dir = repl.cwd;
                    } else if (dir === '..') {
                        dir = path.dirname(repl.cwd);
                    }
                    
                    // Make path absolute
                    const absDir = repl.getAbsolutePath(dir);
                    
                    let files = fs.readdirSync(absDir);
                    
                    // If we're looking for files starting with '.', include . and ..
                    if (basename === '.') {
                        files = ['.', '..'].concat(files.filter(f => f.startsWith('.')));
                    }
                    
                    const matches = files
                        .filter(f => f.startsWith(basename))
                        .map(f => {
                            const absPath = path.join(absDir, f);
                            let displayPath;
                            
                            // If we're completing after a /, just show the filename
                            if (partial.endsWith('/')) {
                                displayPath = partial + f;
                            } else if (basename === '.' && (f === '.' || f === '..')) {
                                // For . and .. special directories
                                displayPath = f;
                            } else {
                                displayPath = path.join(path.dirname(partial), f);
                            }
                            
                            // Check if it's a directory and add trailing slash
                            try {
                                if (f === '.' || f === '..') {
                                    displayPath += '/';
                                } else {
                                    const stats = fs.statSync(absPath);
                                    if (stats.isDirectory()) {
                                        displayPath += '/';
                                    }
                                }
                            } catch (e) {
                                // Ignore stat errors
                            }
                            
                            // If we started with a tilde, preserve it in the display
                            if (partial.startsWith('~') && !partial.endsWith('/')) {
                                const tildeDir = path.dirname(partial);
                                displayPath = path.join(tildeDir, f);
                                const absPath = path.join(absDir, f);
                                try {
                                    const stats = fs.statSync(absPath);
                                    if (stats.isDirectory()) {
                                        displayPath += '/';
                                    }
                                } catch (e) {
                                    // Ignore stat errors
                                }
                            }
                            
                            return parts.slice(0, -1).concat(displayPath).join(' ');
                        });
                    
                    if (matches.length > 0) {
                        return [matches, line];
                    }
                } catch (e) {
                    // Fall through to default completion
                }
            }
        }
        
        // If we have no hits, show all commands and mnemonics
        if (hits.length === 0) {
            hits = [...commands, ...repl.validMnemonics];
        }
        
        return [hits, line];
    };

    // Wrapper function that intercepts the display and handles partial completion
    return function(line, callback) {
        // Get completions from the actual completer
        const [completions, originalLine] = actualCompleter(line);
        
        // Check if this is being called with a callback (for display)
        if (callback) {
            // If we have multiple completions, find common prefix and complete to that
            if (completions.length > 1) {
                // Find the longest common prefix among all completions
                const commonPrefix = findLongestCommonPrefix(completions);
                
                // If the common prefix is longer than what we currently have typed,
                // return that as a single completion to trigger partial completion
                if (commonPrefix.length > line.length) {
                    callback(null, [[commonPrefix], line]);
                    return;
                }
                
                // If we've already completed to the common prefix, show all options
                let displayCompletions = completions;
                
                // For command completions (with space)
                if (line.includes(' ')) {
                    const parts = line.split(' ');
                    const beforeLastPart = parts.slice(0, -1).join(' ') + ' ';
                    const lastPart = parts[parts.length - 1];
                    
                    // Check if all completions start with the command prefix
                    if (completions.every(comp => comp.startsWith(beforeLastPart))) {
                        displayCompletions = completions.map(comp => {
                            const afterCommand = comp.substring(beforeLastPart.length);
                            
                            // For path completions, find the common directory prefix
                            if (afterCommand.includes('/') || lastPart.includes('/')) {
                                // Find the last slash in the input to determine what's being completed
                                const lastSlashIndex = lastPart.lastIndexOf('/');
                                if (lastSlashIndex !== -1) {
                                    const pathBeforeCompletion = lastPart.substring(0, lastSlashIndex + 1);
                                    
                                    // Remove the common path prefix from display
                                    if (afterCommand.startsWith(pathBeforeCompletion)) {
                                        return afterCommand.substring(pathBeforeCompletion.length);
                                    }
                                }
                            }
                            
                            return afterCommand;
                        });
                    }
                }
                // For direct path completions (no command)
                else if (line.includes('/')) {
                    const lastSlashIndex = line.lastIndexOf('/');
                    if (lastSlashIndex !== -1) {
                        const pathBeforeCompletion = line.substring(0, lastSlashIndex + 1);
                        
                        // Check if all completions share this prefix
                        if (completions.every(comp => comp.startsWith(pathBeforeCompletion))) {
                            displayCompletions = completions.map(comp => 
                                comp.substring(pathBeforeCompletion.length)
                            );
                        }
                    }
                }
                
                // Only override display if we modified the completions
                if (displayCompletions !== completions) {
                    // Override the default display
                    process.stdout.write('\n');
                    
                    // Format in columns
                    console.log(PlatformUtils.formatColumns(displayCompletions));
                    
                    // Re-display the prompt and current line
                    repl.rl._refreshLine();
                    
                    // Return empty array to prevent readline from showing its own display
                    callback(null, [[], line]);
                    return;
                }
            }
            
            // Default behavior
            callback(null, [completions, originalLine]);
        } else {
            // Synchronous mode (for actual completion)
            return [completions, originalLine];
        }
    };    
}

module.exports = { createCompleter };
