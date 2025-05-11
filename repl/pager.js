// Terminal-aware pager that integrates with existing readline
const readline = require('readline');

class Pager {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.debug = options.debug || false;

        this.lines = [];
        this.currentLine = 0;
        this.atEnd = false;
        
        // Search state
        this.searchMode = false;
        this.searchBuffer = '';
        this.searchPattern = null;
        this.searchMatches = [];
        this.currentMatch = -1;

        // Initialize dimensions
        this.screenHeight = process.stdout.rows || 24;
        this.screenWidth = process.stdout.columns || 80;
        
        // Calculate page size - use full height minus 1 for prompt
        this.pageSize = Math.max(1, this.screenHeight - 1);

        // Handle resize events
        this.resizeHandler = () => {
            // Update screen dimensions
            this.screenHeight = process.stdout.rows || 24;
            this.screenWidth = process.stdout.columns || 80;
            
            // Recalculate page size
            this.pageSize = Math.max(1, this.screenHeight - 1);
            
            // Re-wrap lines with new width
            this.wrapAllLines();
            
            // Adjust current line position if needed
            this.validateCurrentLine();
            
            // Redisplay if we're active
            if (this.active) {
                this.displayPage();
            }
        };
    }

    wrapLine(line) {
        line = line.replace(/\t/g, '        '); // expand tabs
        if (line.length <= this.screenWidth) return [line];

        const result = [];
        while (line.length > this.screenWidth) {
            let splitAt = line.lastIndexOf(' ', this.screenWidth);
            if (splitAt <= 0) splitAt = this.screenWidth;
            result.push(line.slice(0, splitAt));
            line = line.slice(splitAt).trim();
        }
        if (line) result.push(line);
        return result;
    }

    wrapAllLines() {
        const raw = this.rawLines || [];
        this.lines = raw.flatMap(line => this.wrapLine(line));
    }

    shouldPaginate(content) {
        if (!this.enabled || !process.stdout.isTTY) return false;
        
        // Update dimensions and page size before checking
        this.screenHeight = process.stdout.rows || 24;
        this.screenWidth = process.stdout.columns || 80;
        this.pageSize = Math.max(1, this.screenHeight - 1);
        
        // Store raw content
        const raw = Array.isArray(content) ? content.map(String) : String(content).split('\n');
        this.rawLines = raw;
        
        // Wrap lines
        this.wrapAllLines();
        
        return this.lines.length > this.pageSize;
    }

    validateCurrentLine() {
        // Ensure currentLine is within bounds
        if (this.currentLine < 0) {
            this.currentLine = 0;
        }
        
        // Don't scroll past where we can see content
        const maxScroll = Math.max(0, this.lines.length - this.pageSize);
        if (this.currentLine > maxScroll) {
            this.currentLine = maxScroll;
        }
    }

    displayPage() {
        this.validateCurrentLine();
        process.stdout.write('\x1b[H\x1b[J'); // Clear screen
        
        // Calculate how many lines we can show
        const linesToShow = Math.min(this.pageSize, this.lines.length - this.currentLine);
        const end = this.currentLine + linesToShow;
        
        // Display the lines
        for (let i = this.currentLine; i < end; i++) {
            let line = this.lines[i].slice(0, this.screenWidth);
            
            // Highlight search matches if active
            if (this.searchPattern && this.searchMatches.includes(i)) {
                line = this.highlightMatch(line);
            }
            
            process.stdout.write(line + '\n');
        }
        
        // Check if we're at the end
        this.atEnd = end >= this.lines.length;
        
        // Show prompt
        this.showPrompt();
    }

    showPrompt() {
        // Calculate percentage
        const end = Math.min(this.currentLine + this.pageSize, this.lines.length);
        const percent = Math.min(100, Math.floor((end / this.lines.length) * 100));
        
        // Create debug info if enabled
        const debugInfo = this.debug ? 
            ` [H:${this.screenHeight} W:${this.screenWidth} PS:${this.pageSize} CL:${this.currentLine} TL:${this.lines.length}]` : '';
        
        // Build prompt
        let prompt;
        if (this.searchMode) {
            prompt = `/${this.searchBuffer}`;
        } else if (this.atEnd) {
            prompt = `\x1b[7m(END) - Press SPACE or ENTER to exit${debugInfo}\x1b[0m`;
        } else {
            prompt = `\x1b[7m--More-- (${percent}%)${debugInfo}\x1b[0m`;
            if (this.searchPattern) {
                const matchInfo = this.searchMatches.length > 0 
                    ? ` [Match ${this.currentMatch + 1}/${this.searchMatches.length}]`
                    : ' [No matches]';
                prompt += matchInfo;
            }
        }
        process.stdout.write(prompt);
    }

    clearPrompt() {
        process.stdout.write('\r\x1b[K');
    }

    highlightMatch(line) {
        const regex = new RegExp(`(${this.searchPattern})`, 'gi');
        return line.replace(regex, '\x1b[33m$1\x1b[0m'); // Yellow highlight
    }

    executeSearch() {
        if (!this.searchBuffer) return;
        
        this.searchPattern = this.searchBuffer;
        this.searchMatches = [];
        
        // Find all matches
        const regex = new RegExp(this.searchPattern, 'i');
        for (let i = 0; i < this.lines.length; i++) {
            if (regex.test(this.lines[i])) {
                this.searchMatches.push(i);
            }
        }
        
        // Jump to first match after current position
        if (this.searchMatches.length > 0) {
            for (let i = 0; i < this.searchMatches.length; i++) {
                if (this.searchMatches[i] >= this.currentLine) {
                    this.currentMatch = i;
                    this.currentLine = this.searchMatches[i];
                    return;
                }
            }
            // If no match after current position, wrap to beginning
            this.currentMatch = 0;
            this.currentLine = this.searchMatches[0];
        }
    }

    nextMatch() {
        if (this.searchMatches.length === 0) return;
        this.currentMatch = (this.currentMatch + 1) % this.searchMatches.length;
        this.currentLine = this.searchMatches[this.currentMatch];
        this.validateCurrentLine();
    }

    previousMatch() {
        if (this.searchMatches.length === 0) return;
        this.currentMatch = (this.currentMatch - 1 + this.searchMatches.length) % this.searchMatches.length;
        this.currentLine = this.searchMatches[this.currentMatch];
        this.validateCurrentLine();
    }

    async paginate(content, readlineInterface) {
        if (!this.shouldPaginate(content)) {
            console.log(content);
            return;
        }

        this.currentLine = 0;
        this.atEnd = false;
        this.active = true;
        
        // Add resize handler
        process.stdout.on('resize', this.resizeHandler);
        
        this.displayPage();

        // Save the original raw mode state
        const wasRaw = process.stdin.isRaw;
        
        // Save and clear readline's current line
        const savedLine = readlineInterface.line;
        const savedCursor = readlineInterface.cursor;
        readlineInterface.line = '';
        readlineInterface.cursor = 0;
        
        // Pause readline and temporarily remove its input handlers
        const originalPaused = readlineInterface.paused;
        readlineInterface.pause();
        
        // Temporarily disable readline's keypress handling
        const keypressListeners = process.stdin.listeners('keypress');
        process.stdin.removeAllListeners('keypress');
        
        return new Promise((resolve) => {
            // Set raw mode only if not already set
            if (!wasRaw && process.stdin.setRawMode) {
                process.stdin.setRawMode(true);
            }
            
            const handler = (chunk) => {
                const key = chunk.toString();
                
                if (this.searchMode) {
                    this.handleSearchInput(key);
                } else {
                    this.handleNavigationInput(key);
                }
            };

            const done = () => {
                this.active = false;
                process.stdin.removeListener('data', handler);
                process.stdout.removeListener('resize', this.resizeHandler);
                
                // Restore original raw mode state
                if (!wasRaw && process.stdin.setRawMode) {
                    process.stdin.setRawMode(false);
                }
                
                this.clearPrompt();
                
                // Don't write a newline here - readline's prompt will handle positioning
                
                // Restore readline's keypress listeners
                keypressListeners.forEach(listener => {
                    process.stdin.on('keypress', listener);
                });
                
                // Restore readline's line state (clear it for fresh prompt)
                readlineInterface.line = '';
                readlineInterface.cursor = 0;
                
                // Resume readline if it was originally not paused
                if (!originalPaused) {
                    readlineInterface.resume();
                }
                
                // Prompt explicitly
                readlineInterface.prompt();
                
                resolve();
            };

            this.done = done;
            
            // Add our handler
            process.stdin.on('data', handler);
            
            // Ensure stdin is flowing
            if (process.stdin.isPaused()) {
                process.stdin.resume();
            }
        });
    }

    handleSearchInput(key) {
        this.clearPrompt();
        
        if (key === '\r' || key === '\n') {
            // Execute search
            this.searchMode = false;
            this.executeSearch();
            this.displayPage();
        } else if (key === '\x1b') {
            // Cancel search
            this.searchMode = false;
            this.searchBuffer = '';
            this.displayPage();
        } else if (key === '\x7f' || key === '\b') {
            // Backspace
            if (this.searchBuffer.length > 0) {
                this.searchBuffer = this.searchBuffer.slice(0, -1);
            }
            this.showPrompt();
        } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
            // Add character to search
            this.searchBuffer += key;
            this.showPrompt();
        }
    }

    handleNavigationInput(str) {
        this.clearPrompt();
        let handled = true;
        
        switch (str) {
            case 'q':
            case '\x1b':
                this.done();
                return;
            case ' ':
                if (this.atEnd) {
                    this.done();
                    return;
                }
                this.pageDown();
                break;
            case '\r':
            case '\n':
                if (this.atEnd) {
                    this.done();
                    return;
                }
                this.lineDown();
                break;
            case 'b':
                this.pageUp();
                break;
            case 'k':
            case '\x1b[A':
                this.lineUp();
                break;
            case 'j':
            case '\x1b[B':
                this.lineDown();
                break;
            case 'g':
                this.goToStart();
                break;
            case 'G':
                this.goToEnd();
                break;
            case '/':
                this.searchMode = true;
                this.searchBuffer = '';
                this.showPrompt();
                return;
            case 'n':
                if (this.searchPattern) {
                    this.nextMatch();
                }
                break;
            case 'N':
                if (this.searchPattern) {
                    this.previousMatch();
                }
                break;
            default:
                handled = false;
                break;
        }
        
        if (handled) {
            this.displayPage();
        } else {
            this.showPrompt();
        }
    }

    pageDown() {
        this.currentLine = Math.min(
            this.currentLine + this.pageSize,
            Math.max(0, this.lines.length - this.pageSize)
        );
        this.validateCurrentLine();
    }

    pageUp() {
        this.currentLine = Math.max(0, this.currentLine - this.pageSize);
        this.validateCurrentLine();
    }

    lineDown() {
        if (this.currentLine < this.lines.length - this.pageSize) {
            this.currentLine++;
        }
        this.validateCurrentLine();
    }

    lineUp() {
        if (this.currentLine > 0) {
            this.currentLine--;
        }
        this.validateCurrentLine();
    }

    goToStart() {
        this.currentLine = 0;
        this.validateCurrentLine();
    }

    goToEnd() {
        this.currentLine = Math.max(0, this.lines.length - this.pageSize);
        this.validateCurrentLine();
    }
}

function paginate(content, readlineInterface, options = {}) {
    const pager = new Pager(options);
    return pager.paginate(content, readlineInterface);
}

module.exports = { Pager, paginate };
