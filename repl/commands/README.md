# BURST REPL Command Plugins

This directory contains command plugins for the BURST REPL shell commands system. Each command is implemented as a separate plugin file, making it easy to add, modify, or remove commands.

## Plugin Architecture

Each command plugin is a JavaScript file that exports a class extending `BaseCommand`. The filename (without the `.js` extension) becomes the command name.

## Creating a New Command Plugin

To create a new command, create a new file in this directory with the command name (e.g., `mycommand.js`) and follow this structure:

```javascript
const BaseCommand = require('./BaseCommand');

class MyCommand extends BaseCommand {
    async execute(args) {
        // Implement your command logic here
        // args is an array of command arguments
    }
    
    // Optional: Provide help information
    getHelp() {
        return {
            description: 'Short description of what the command does',
            usage: 'mycommand [options] <arguments>',
            examples: [
                'mycommand file.txt',
                'mycommand -v'
            ],
            category: 'Shell'  // or another category
        };
    }
    
    // Optional: Define command aliases
    getAliases() {
        return ['mc', 'mycmd'];  // These become alternative names for the command
    }
}

module.exports = MyCommand;
```

## BaseCommand API

The `BaseCommand` class provides these helper methods:

- `getCwd()` - Get the current working directory
- `setCwd(path)` - Set the current working directory
- `getAbsolutePath(path)` - Convert a relative path to absolute
- `getOriginalCwd()` - Get the directory where the REPL was launched
- `this.repl` - Access to the REPL instance
- `this.config` - Access to the configuration
- `this.PlatformUtils` - Platform-specific utilities
- `this.glob` - Glob pattern matching utilities

## Command Loading

Commands are automatically loaded from this directory when the REPL starts. The loading process:

1. Scans for all `.js` files (except `index.js`)
2. Requires each file and instantiates the command class
3. Registers the command using the filename as the command name
4. Registers any help information provided
5. Registers any aliases defined by the command

## Error Handling

If a command plugin fails to load, an error message is displayed but the REPL continues to function with the remaining commands.

## Best Practices

1. Keep commands focused and single-purpose
2. Provide comprehensive help information
3. Handle errors gracefully with informative messages
4. Use the BaseCommand helper methods for consistency
5. Follow the existing naming conventions

## Examples

See the existing command implementations:
- `cd.js` - Change directory
- `ls.` - List directory contents with glob support
- `cat.js` - Display file contents
- `edit.js` - Launch external editor
- `exec.js` - Execute external commands
