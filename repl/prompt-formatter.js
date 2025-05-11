const path = require('path');
const os = require('os');
const PlatformUtils = require('./platform-utils');

function formatPrompt(currentPath, originalCwd, replCommands) {
    // Safety check for undefined path
    if (!currentPath) {
        currentPath = originalCwd || process.cwd();
    }
    
    const termWidth = PlatformUtils.getTerminalWidth();
    const maxPathLength = Math.floor(termWidth / 2);
    
    let formattedPath = '';
    
    // Normalize the path for comparison and remove trailing slashes
    let normalizedCurrent = path.normalize(currentPath);
    // Remove trailing slashes except for root directory
    if (normalizedCurrent.length > 1 && normalizedCurrent.endsWith(path.sep)) {
        normalizedCurrent = normalizedCurrent.slice(0, -1);
    }
    
    const normalizedOriginal = path.normalize(originalCwd);
    const homeDir = os.homedir();
    
    // Check if we're in the original launch directory
    if (normalizedCurrent === normalizedOriginal) {
        formattedPath = '';
    }
    // Check if we're in a subdirectory of the launch directory
    else if (normalizedCurrent.startsWith(normalizedOriginal + path.sep)) {
        const relativePath = path.relative(normalizedOriginal, normalizedCurrent);
        formattedPath = ' ' + relativePath;
    }
    // Check if we're in the user's home directory
    else if (normalizedCurrent === homeDir) {
        formattedPath = ' ~';
    }
    // Check if we're in a subdirectory of the user's home
    else if (normalizedCurrent.startsWith(homeDir + path.sep)) {
        const relativePath = path.relative(homeDir, normalizedCurrent);
        formattedPath = ' ~/' + relativePath;
    }
    // Check for other users' home directories
    else {
        let matched = false;
        
        // Windows-specific home directory detection
        if (process.platform === 'win32') {
            const userProfileBase = process.env.USERPROFILE ? 
                path.dirname(process.env.USERPROFILE) : 'C:\\Users';
            
            if (normalizedCurrent.startsWith(userProfileBase + path.sep)) {
                const relativePath = path.relative(userProfileBase, normalizedCurrent);
                const pathParts = relativePath.split(path.sep);
                
                if (pathParts.length > 0) {
                    const username = pathParts[0];
                    if (username === path.basename(homeDir)) {
                        // It's the current user's home, already handled above
                        formattedPath = ' ' + normalizedCurrent;
                    } else if (pathParts.length === 1) {
                        formattedPath = ' ~' + username;
                    } else {
                        const rest = pathParts.slice(1).join('/');
                        formattedPath = ' ~' + username + '/' + rest;
                    }
                    matched = true;
                }
            }
        }
        // Unix-like systems
        else {
            const match = normalizedCurrent.match(/^(\/home|\/Users)\/([^\/]+)(.*)$/);
            if (match) {
                const username = match[2];
                const rest = match[3];
                if (rest === '') {
                    formattedPath = ' ~' + username;
                } else {
                    // Remove leading slash and normalize separators
                    const restPath = rest.substring(1);
                    formattedPath = ' ~' + username + '/' + restPath;
                }
                matched = true;
            }
        }
        
        if (!matched) {
            formattedPath = ' ' + normalizedCurrent;
        }
    }
    
    // Remove trailing slashes in formatted path (except for root)
    if (formattedPath.endsWith('/') && formattedPath !== ' /') {
        formattedPath = formattedPath.slice(0, -1);
    }
    
    // Handle path abbreviation if it's too long
    let fullPrompt = 'burst' + formattedPath + '>';
    if (fullPrompt.length > maxPathLength && formattedPath.length > 0) {
        // Start removing components from the beginning until it fits
        let parts = formattedPath.trim().split('/');
        let prefix = '';
        
        // Determine the prefix to preserve
        if (formattedPath.startsWith(' ~/')) {
            prefix = '~';
            parts = parts[0].substring(1).split('/').concat(parts.slice(1));
        } else if (formattedPath.match(/^ ~[^\/]+/)) {
            const match = formattedPath.match(/^ (~[^\/]+)/);
            prefix = match[1];
            const afterPrefix = formattedPath.substring(match[1].length + 1);
            parts = afterPrefix.split('/').filter(p => p);
        } else if (formattedPath.startsWith(' /')) {
            prefix = '';
            parts = parts.filter(p => p);
        }
        
        // Remove components from the beginning until it fits
        while (parts.length > 1) {
            const testPath = prefix + ':' + parts.join('/');
            const testPrompt = 'burst ' + testPath + '>';
            if (testPrompt.length <= maxPathLength) {
                break;
            }
            parts.shift();
        }
        
        // Construct the abbreviated path
        const shortenedPath = parts.join('/');
        if (prefix) {
            formattedPath = ' ' + prefix + ':' + shortenedPath + '>';
        } else {
            formattedPath = ' /:' + shortenedPath + '>';
        }
        fullPrompt = 'burst' + formattedPath.slice(0, -1) + '>';
    }
    
    // Apply color if specified
    const promptColor = replCommands.getOption ? replCommands.getOption('promptColor') : undefined;
    if (promptColor !== undefined && promptColor !== null) {
        // ANSI color codes: 30-37 for regular colors, 90-97 for bright colors
        let colorCode;
        if (promptColor >= 0 && promptColor <= 7) {
            colorCode = 30 + promptColor;
        } else if (promptColor >= 8 && promptColor <= 15) {
            colorCode = 90 + (promptColor - 8);
        }
        
        if (colorCode) {
            // Apply color to the prompt and reset at the end
            fullPrompt = `\x1b[${colorCode}m${fullPrompt}\x1b[0m`;
        }
    }
    
    return fullPrompt || 'burst>';
}

module.exports = { formatPrompt };
