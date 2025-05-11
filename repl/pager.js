// Enhanced terminal-aware pager with better resize handling, scroll behavior, and VT100 updates
const readline = require('readline');

class Pager {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.pageSize = options.pageSize;
        this.fixedPageSize = options.pageSize !== undefined;
        this.leaveContentVisible = options.leaveContentVisible !== false;

        this.lines = [];
        this.currentLine = 0;
        this.atEnd = false;

        this.screenHeight = process.stdout.rows;
        this.screenWidth = process.stdout.columns;

        process.stdout.on('resize', () => {
            this.screenHeight = process.stdout.rows;
            this.screenWidth = process.stdout.columns;
            if (!this.fixedPageSize) {
                this.pageSize = this.screenHeight - 2; // 1 for prompt, 1 buffer
            }
            this.wrapAllLines();
            this.validateCurrentLine();
            this.displayPage();
        });

        if (!this.fixedPageSize) {
            this.pageSize = this.screenHeight - 2;
        }
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
        const raw = Array.isArray(content) ? content.map(String) : String(content).split('\n');
        this.rawLines = raw;
        this.wrapAllLines();
        return this.lines.length > this.pageSize;
    }

    validateCurrentLine() {
        const maxStart = Math.max(0, this.lines.length - this.pageSize);
        if (this.currentLine > maxStart) this.currentLine = maxStart;
        if (this.currentLine < 0) this.currentLine = 0;
    }

    displayPage() {
        this.validateCurrentLine();
        process.stdout.write('\x1b[H\x1b[J');
        const end = Math.min(this.currentLine + this.pageSize, this.lines.length);
        for (let i = this.currentLine; i < end; i++) {
            process.stdout.write(this.lines[i].slice(0, this.screenWidth) + '\n');
        }
        this.atEnd = end >= this.lines.length;
        const percent = Math.floor((end / this.lines.length) * 100);
        const prompt = this.atEnd ?
            '\x1b[7m(END) - Press SPACE or ENTER to exit\x1b[0m' :
            `\x1b[7m--More-- (${percent}%)\x1b[0m`;
        process.stdout.write(prompt);
    }

    clearPrompt() {
        process.stdout.write('\r\x1b[K');
    }

    pageDown() {
        this.currentLine = Math.min(this.currentLine + this.pageSize, this.lines.length - this.pageSize);
    }

    pageUp() {
        this.currentLine = Math.max(0, this.currentLine - this.pageSize);
    }

    lineDown() {
        this.currentLine = Math.min(this.currentLine + 1, this.lines.length - this.pageSize);
    }

    lineUp() {
        this.currentLine = Math.max(0, this.currentLine - 1);
    }

    async paginate(content) {
        if (!this.shouldPaginate(content)) {
            console.log(content);
            return;
        }

        this.currentLine = 0;
        this.atEnd = false;
        this.displayPage();

        const wasRaw = process.stdin.isRaw;
        if (!wasRaw) process.stdin.setRawMode(true);

        return new Promise((resolve) => {
            const handler = (key) => {
                this.clearPrompt();
                const str = key.toString();
                switch (str) {
                    case 'q':
                    case '\x1b':
                        done();
                        break;
                    case ' ': this.pageDown(); break;
                    case '\r': this.lineDown(); break;
                    case 'b': this.pageUp(); break;
                    case 'k': case '\x1b[A': this.lineUp(); break;
                    case 'j': case '\x1b[B': this.lineDown(); break;
                    case 'g': this.currentLine = 0; break;
                    case 'G': this.currentLine = this.lines.length - this.pageSize; break;
                    default: break;
                }
                this.displayPage();
            };

            const done = () => {
                process.stdin.removeListener('data', handler);
                if (!wasRaw) process.stdin.setRawMode(false);
                if (!this.leaveContentVisible) process.stdout.write('\x1b[2J\x1b[H');
                process.stdout.write('\n');
                resolve();
            };

            process.stdin.on('data', handler);
            if (process.stdin.isPaused()) process.stdin.resume();
        });
    }
}

function paginate(content, options = {}) {
    const pager = new Pager(options);
    return pager.paginate(content);
}

module.exports = { Pager, paginate };
