// Tab completion module for BURST REPL

const fs = require('fs');
const path = require('path');
const PlatformUtils = require('./platform-utils');

function createCompleter(repl) {
    return function completer(line) {
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
            const fileCommands = ['load', 'save', 'assemble', 'cat', 'edit', 'cd', 'ls'];
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
}

module.exports = { createCompleter };
