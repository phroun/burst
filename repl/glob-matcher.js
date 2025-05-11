// Glob pattern matching module for BURST REPL
// Implements common glob patterns without external dependencies

class GlobMatcher {
    constructor() {
        // Common glob patterns and their regex equivalents
        this.patterns = {
            '*': '[^/]*',      // Match any characters except directory separator
            '**': '.*',        // Match any characters including directory separator
            '?': '[^/]',       // Match single character except directory separator
            '.': '\\.',        // Escape literal dots
            '+': '\\+',        // Escape literal plus
            '^': '\\^',        // Escape literal caret
            '$': '\\$',        // Escape literal dollar
            '(': '\\(',        // Escape literal parenthesis
            ')': '\\)',        // Escape literal parenthesis
            '|': '\\|',        // Escape literal pipe
            '\\': '\\\\'       // Escape literal backslash
        };
    }
    
    /**
     * Convert a glob pattern to a regular expression
     * @param {string} glob - The glob pattern
     * @param {object} options - Options for pattern conversion
     * @returns {RegExp} - The resulting regular expression
     */
    globToRegex(glob, options = {}) {
        const {
            ignoreCase = false,
            matchWholePath = false
        } = options;
        
        let regex = '';
        let inCharClass = false;
        let i = 0;
        
        while (i < glob.length) {
            const char = glob[i];
            
            switch (char) {
                case '*':
                    if (glob[i + 1] === '*') {
                        // Handle ** (globstar)
                        regex += this.patterns['**'];
                        i += 2;
                        // Skip any following slashes
                        while (i < glob.length && glob[i] === '/') {
                            i++;
                        }
                        i--; // Adjust for the loop increment
                    } else {
                        // Handle single *
                        regex += this.patterns['*'];
                    }
                    break;
                    
                case '?':
                    if (!inCharClass) {
                        regex += this.patterns['?'];
                    } else {
                        regex += char;
                    }
                    break;
                    
                case '[':
                    inCharClass = true;
                    regex += char;
                    break;
                    
                case ']':
                    inCharClass = false;
                    regex += char;
                    break;
                    
                case '{':
                    // Handle brace expansion {a,b,c}
                    const braceEnd = glob.indexOf('}', i);
                    if (braceEnd !== -1) {
                        const braceContent = glob.substring(i + 1, braceEnd);
                        const options = braceContent.split(',').map(opt => 
                            this.escapeRegexSpecialChars(opt.trim())
                        );
                        regex += '(' + options.join('|') + ')';
                        i = braceEnd;
                    } else {
                        regex += '\\{';
                    }
                    break;
                    
                case '/':
                    regex += '\\/';
                    break;
                    
                default:
                    // Escape special regex characters
                    if (this.patterns[char] && !inCharClass) {
                        regex += this.patterns[char];
                    } else {
                        regex += char;
                    }
            }
            i++;
        }
        
        // Add anchors based on options
        if (matchWholePath) {
            regex = '^' + regex + '$';
        } else {
            regex = '^' + regex + '$';
        }
        
        const flags = ignoreCase ? 'i' : '';
        return new RegExp(regex, flags);
    }
    
    /**
     * Escape special regex characters in a string
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeRegexSpecialChars(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Match a string against a glob pattern
     * @param {string} str - String to test
     * @param {string} pattern - Glob pattern
     * @param {object} options - Matching options
     * @returns {boolean} - Whether the string matches the pattern
     */
    match(str, pattern, options = {}) {
        const regex = this.globToRegex(pattern, options);
        return regex.test(str);
    }
    
    /**
     * Filter an array of strings by a glob pattern
     * @param {string[]} items - Array of strings to filter
     * @param {string} pattern - Glob pattern
     * @param {object} options - Matching options
     * @returns {string[]} - Filtered array
     */
    filter(items, pattern, options = {}) {
        const regex = this.globToRegex(pattern, options);
        return items.filter(item => regex.test(item));
    }
    
    /**
     * Check if a pattern has glob special characters
     * @param {string} pattern - Pattern to check
     * @returns {boolean} - Whether the pattern has glob characters
     */
    hasGlobChars(pattern) {
        return /[*?{}[\]]/.test(pattern);
    }
    
    /**
     * Split a path into directory and pattern parts
     * @param {string} pathPattern - Path with potential glob pattern
     * @returns {{dir: string, pattern: string}} - Directory and pattern parts
     */
    splitPath(pathPattern) {
        // Find the first glob character
        const firstGlobIndex = pathPattern.search(/[*?{}[\]]/);
        
        if (firstGlobIndex === -1) {
            // No glob characters, it's just a path
            return { dir: pathPattern, pattern: null };
        }
        
        // Find the last directory separator before the first glob character
        const lastSepBeforeGlob = pathPattern.lastIndexOf('/', firstGlobIndex);
        
        if (lastSepBeforeGlob === -1) {
            // Glob pattern in current directory
            return { dir: '.', pattern: pathPattern };
        }
        
        // Split at the last separator
        return {
            dir: pathPattern.substring(0, lastSepBeforeGlob),
            pattern: pathPattern.substring(lastSepBeforeGlob + 1)
        };
    }
}

// Export singleton instance
module.exports = new GlobMatcher();
