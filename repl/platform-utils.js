// Cross-platform utilities for BURST REPL
const os = require('os');
const path = require('path');
const fs = require('fs');

class PlatformUtils {
    // Get the home directory for a given user or current user
    static getHomeDirectory(username = null) {
        if (!username) {
            return os.homedir();
        }
        
        // Handle platform-specific home directory patterns
        if (process.platform === 'win32') {
            // Windows: C:\Users\username
            return path.join('C:', 'Users', username);
        } else {
            // Unix-like: /home/username or /Users/username (macOS)
            if (process.platform === 'darwin') {
                return path.join('/Users', username);
            } else {
                return path.join('/home', username);
            }
        }
    }
    
    // Expand tilde in paths
    static expandTilde(filepath) {
        if (!filepath) {
            return filepath;
        }
        
        // Handle ./ and ../ relative paths - no expansion needed
        if (filepath.startsWith('./') || filepath.startsWith('../')) {
            return filepath;
        }
        
        if (filepath[0] !== '~') {
            return filepath;
        }
        
        if (filepath === '~' || filepath.startsWith('~/')) {
            // ~/ or ~ alone
            return path.join(os.homedir(), filepath.slice(2));
        } else {
            // ~username/path
            const slashIndex = filepath.indexOf('/');
            const username = slashIndex === -1 ? filepath.slice(1) : filepath.slice(1, slashIndex);
            const rest = slashIndex === -1 ? '' : filepath.slice(slashIndex);
            
            try {
                const userHome = this.getHomeDirectory(username);
                // Verify the directory exists
                if (fs.existsSync(userHome)) {
                    return path.join(userHome, rest);
                }
            } catch {
                // Fall back to original path if we can't expand
            }
        }
        
        return filepath;
    }
    
    // Get list of users for tilde completion (Unix-like systems)
    static getUsernames() {
        if (process.platform === 'win32') {
            // Windows doesn't have a simple way to list users
            return [];
        }
        
        try {
            // Try to read from /etc/passwd
            const passwd = fs.readFileSync('/etc/passwd', 'utf8');
            const users = passwd.split('\n')
                .filter(line => line.trim())
                .map(line => line.split(':')[0])
                .filter(user => user);
            return users;
        } catch {
            return [];
        }
    }
    
    // Get config file path
    static getConfigPath() {
        return path.join(os.homedir(), '.burst-repl.config');
    }
    
    // Default config content
    static getDefaultConfig() {
        return `# BURST REPL Configuration File
# This file allows you to customize the behavior of the BURST REPL
# 
# Editor Configuration
# Set the default editor for the 'edit' command
# editor = nano
# editor = vim
# editor = emacs
# editor = code

# Command Aliases
# Define custom command aliases
# Each alias should be on its own line in the format:
# alias.name = command
#
# Examples:
# alias.joe = edit
# alias.emacs = edit
# alias.vi = edit
# alias.vim = edit
# alias.nano = edit
# alias.ll = ls -l
# alias.la = ls -a
# alias.lla = ls -la
# alias.md = mkdir
# alias.rd = rmdir

# Here are some default aliases to get you started:
# (uncomment to activate)
# alias.joe = edit
# alias.emacs = edit
# alias.vi = edit
# alias.vim = edit
# alias.nano = edit
`;
    }
    
    // Load config file
    static loadConfig() {
        const configPath = this.getConfigPath();
        const config = {
            editor: null,
            aliases: {}
        };
        
        try {
            // Try to create default config if it doesn't exist
            if (!fs.existsSync(configPath)) {
                try {
                    fs.writeFileSync(configPath, this.getDefaultConfig(), 'utf8');
                } catch {
                    // Silently fail if we can't write
                }
            }
            
            // Load the config
            const content = fs.readFileSync(configPath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                
                if (trimmed.startsWith('editor')) {
                    const match = trimmed.match(/^editor\s*=\s*(.+)$/);
                    if (match) {
                        config.editor = match[1].trim();
                    }
                } else if (trimmed.startsWith('alias.')) {
                    const match = trimmed.match(/^alias\.([^\s=]+)\s*=\s*(.+)$/);
                    if (match) {
                        config.aliases[match[1].trim()] = match[2].trim();
                    }
                }
            }
        } catch {
            // Return default config if we can't read
        }
        
        return config;
    }
    
    // Format file date for ls -l
    static formatFileDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    // Get terminal width for column formatting
    static getTerminalWidth() {
        return process.stdout.columns || 80;
    }
    
    // Format items in columns (like ls)
    static formatColumns(items, options = {}) {
        const termWidth = this.getTerminalWidth();
        const padding = options.padding || 2;
        
        if (items.length === 0) return '';
        
        // Find the maximum item width
        const maxWidth = Math.max(...items.map(item => item.length));
        const columnWidth = maxWidth + padding;
        const columns = Math.max(1, Math.floor(termWidth / columnWidth));
        
        // Group items into rows
        const rows = [];
        for (let i = 0; i < items.length; i += columns) {
            const row = items.slice(i, i + columns);
            rows.push(row);
        }
        
        // Format output
        let output = '';
        for (const row of rows) {
            for (let i = 0; i < row.length; i++) {
                const item = row[i];
                if (i === row.length - 1) {
                    output += item;
                } else {
                    output += item.padEnd(columnWidth);
                }
            }
            output += '\n';
        }
        
        return output.trim();
    }
}

module.exports = PlatformUtils;
