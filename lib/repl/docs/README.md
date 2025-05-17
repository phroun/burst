# BURST REPL Command Architecture

This directory contains the command plugins for the BURST REPL. The command system uses a plugin architecture that automatically loads commands from JavaScript files in this directory and its subdirectories.

## Directory Structure

```
commands/
├── BaseCommand.js       # Base class that all commands extend
├── basic/              # Basic REPL commands (help, run, reset, etc.)
├── debugger/           # Debugger commands (step, break, watch, etc.)
├── shell/              # Shell-like commands (cd, ls, cat, etc.)
└── README.md           # This file
```

## Command Categories

Commands are organized into three high-level categories:

- **BASIC**: Core REPL commands that appear in the main help
- **DEBUGGER**: Advanced debugging commands shown with `help debugger`
- **SHELL**: File system and shell commands shown with `help shell`

## Creating a New Command

To create a new command, follow these steps:

1. **Create a new .js file** in the appropriate subdirectory (basic/, debugger/, or shell/)
2. **Extend the BaseCommand class**
3. **Implement required methods**

Here's a template for a new command:

```javascript
const BaseCommand = require('../BaseCommand');

class MyCommand extends BaseCommand {
    // Required: Main execution method
    async execute(args) {
        // args is an array of command arguments
        console.log('MyCommand executed with args:', args);
    }
    
    // Required: Return the high-level category
    getCategory() {
        return 'BASIC';  // or 'DEBUGGER' or 'SHELL'
    }
    
    // Required: Should this appear in the main help?
    showInBasicHelp() {
        return true;  // true for basic commands, false for others
    }
    
    // Optional: Provide help information
    getHelp() {
        return {
            description: 'Short description of what the command does',
            usage: 'mycommand [options] <arguments>',
            examples: [
                'mycommand file.txt',
                'mycommand -v file.txt'
            ],
            category: 'General'  // Help category (different from high-level category)
        };
    }
    
    // Optional: Define command aliases
    getAliases() {
        return ['mc', 'mycmd'];
    }
}

module.exports = MyCommand;
```

## Available BaseCommand Helpers

The BaseCommand class provides these helper methods and properties:

- `this.commandLoader` - Reference to the command loader
- `this.repl` - Reference to the REPL instance
- `this.config` - Current configuration
- `this.vm` - The BURST virtual machine
- `this.debugger` - The debugger instance
- `this.getCwd()` - Get current working directory
- `this.setCwd(path)` - Set current working directory
- `this.getAbsolutePath(path)` - Convert relative path to absolute
- `this.PlatformUtils` - Platform-specific utilities
- `this.glob` - Glob pattern matching utilities

## Command Loading Process

1. The command loader scans this directory recursively for .js files
2. Each file is required and instantiated with the command loader
3. The filename (without .js) becomes the command name
4. Commands are registered with the help system
5. Aliases are set up for command shortcuts

## Example: Creating a 'grep' Command

Let's create a simple grep command in the shell category:

```javascript
// commands/shell/grep.js
const BaseCommand = require('../BaseCommand');
const fs = require('fs');

class GrepCommand extends BaseCommand {
    async execute(args) {
        if (args.length < 2) {
            console.error('Usage: grep <pattern> <file>');
            return;
        }
        
        const [pattern, filename] = args;
        const filepath = this.getAbsolutePath(filename);
        
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            const lines = content.split('\n');
            const regex = new RegExp(pattern, 'gi');
            
            lines.forEach((line, index) => {
                if (regex.test(line)) {
                    console.log(`${index + 1}: ${line}`);
                }
            });
        } catch (error) {
            console.error(`grep: ${error.message}`);
        }
    }
    
    getCategory() {
        return 'SHELL';
    }
    
    showInBasicHelp() {
        return false;
    }
    
    getHelp() {
        return {
            description: 'Search for patterns in files',
            usage: 'grep <pattern> <file>',
            examples: [
                'grep TODO myfile.txt',
                'grep "function.*test" code.js'
            ],
            category: 'Shell'
        };
    }
}

module.exports = GrepCommand;
```

After creating this file, the command will be automatically loaded on REPL startup and available as `grep`.

## Tips

- Keep commands focused on a single task
- Use async/await for asynchronous operations
- Handle errors gracefully with informative messages
- Provide comprehensive help with examples
- Use the BaseCommand helpers for consistency
- Add commands to the appropriate category subdirectory
