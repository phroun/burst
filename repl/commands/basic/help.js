// Help command plugin with multi-category support and pager

const BaseCommand = require('../BaseCommand');
const helpSystem = require('../../help-system');

class HelpCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            // Show basic help - commands marked with showInBasicHelp
            const lines = ['', 'BASIC COMMAND HELP:'];
            
            const commandsByCategory = this.commandLoader.getCommandsByCategory();
            const categories = {};
            
            // Collect all commands that should show in basic help
            for (const categoryType of ['BASIC', 'DEBUGGER', 'SHELL']) {
                for (const cmd of commandsByCategory[categoryType]) {
                    if (cmd.showInBasicHelp && cmd.instance.getHelp) {
                        const help = cmd.instance.getHelp();
                        const category = help.category || 'General';
                        
                        if (!categories[category]) {
                            categories[category] = [];
                        }
                        
                        // Avoid duplicates if same command is in multiple categories
                        if (!categories[category].find(c => c.name === cmd.name)) {
                            categories[category].push({
                                name: cmd.name,
                                description: help.description
                            });
                        }
                    }
                }
            }
            
            // Build display lines by category
            for (const [category, commands] of Object.entries(categories)) {
                lines.push('');
                lines.push(`${category}:`);
                for (const cmd of commands) {
                    lines.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}`);
                }
            }
            
            lines.push('');
            lines.push('To show DEBUGGER commands: help debugger');
            lines.push('To show SHELL commands: help shell');
            lines.push('');
            lines.push('Type "help <command>" for detailed help on a specific command');
            lines.push('You can also enter BURST assembly instructions directly');
            lines.push('');
            
            // Use pager if enabled
            if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                await this.repl.pager.paginate(lines, this.repl.rl);
            } else {
                console.log(lines.join('\n'));
            }
            return;
        } else if (args[0].toLowerCase() === 'all') {
            // Show ALL commands from all categories
            const lines = ['', 'ALL COMMANDS:'];
            const commandsByCategory = this.commandLoader.getCommandsByCategory();
            const categories = {};
            const seen = new Set(); // Track commands we've already added
            
            // Collect all commands from all categories
            for (const categoryType of ['BASIC', 'DEBUGGER', 'SHELL']) {
                for (const cmd of commandsByCategory[categoryType]) {
                    if (!seen.has(cmd.name) && cmd.instance.getHelp) {
                        const help = cmd.instance.getHelp();
                        const category = help.category || 'General';
                        
                        if (!categories[category]) {
                            categories[category] = [];
                        }
                        
                        categories[category].push({
                            name: cmd.name,
                            description: help.description
                        });
                        seen.add(cmd.name);
                    }
                }
            }
            
            // Build display lines by category
            for (const [category, commands] of Object.entries(categories)) {
                lines.push('');
                lines.push(`${category}:`);
                for (const cmd of commands) {
                    lines.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}`);
                }
            }
            lines.push('');
            
            // Use pager if enabled
            if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                await this.repl.pager.paginate(lines, this.repl.rl);
            } else {
                console.log(lines.join('\n'));
            }
            return;
        } else if (args[0].toLowerCase() === 'debugger') {
            // Show ALL debugger-related commands
            const lines = ['', 'DEBUGGER COMMANDS:'];
            const categories = {};
            const commandsByCategory = this.commandLoader.getCommandsByCategory();
            
            // Include commands from DEBUGGER category
            const debuggerCommands = commandsByCategory.DEBUGGER;
            
            // Also include specific BASIC commands that are debugger-related
            const debuggerBasicCommands = ['assemble', 'run', 'bload', 'bsave', 'reset'];
            
            // Collect DEBUGGER category commands
            for (const cmd of debuggerCommands) {
                if (cmd.instance.getHelp) {
                    const help = cmd.instance.getHelp();
                    const category = help.category || 'General';
                    
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push({
                        name: cmd.name,
                        description: help.description
                    });
                }
            }
            
            // Add the specific BASIC commands that are also debugger-related
            for (const cmd of commandsByCategory.BASIC) {
                if (debuggerBasicCommands.includes(cmd.name) && cmd.instance.getHelp) {
                    const help = cmd.instance.getHelp();
                    const category = help.category || 'General';
                    
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    
                    // Avoid duplicates
                    if (!categories[category].find(c => c.name === cmd.name)) {
                        categories[category].push({
                            name: cmd.name,
                            description: help.description
                        });
                    }
                }
            }
            
            // Build display lines by category
            for (const [category, commands] of Object.entries(categories)) {
                lines.push('');
                lines.push(`${category}:`);
                for (const cmd of commands) {
                    lines.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}`);
                }
            }
            lines.push('');
            
            // Use pager if enabled
            if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                await this.repl.pager.paginate(lines, this.repl.rl);
            } else {
                console.log(lines.join('\n'));
            }
            return;
        } else if (args[0].toLowerCase() === 'shell') {
            // Show shell commands only
            const lines = ['', 'SHELL COMMANDS:'];
            const commands = this.commandLoader.getCommandsByCategory().SHELL;
            const categories = {};
            
            for (const cmd of commands) {
                if (cmd.instance.getHelp) {
                    const help = cmd.instance.getHelp();
                    const category = help.category || 'General';
                    
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push({
                        name: cmd.name,
                        description: help.description
                    });
                }
            }
            
            // Build display lines by category
            for (const [category, commands] of Object.entries(categories)) {
                lines.push('');
                lines.push(`${category}:`);
                for (const cmd of commands) {
                    lines.push(`  ${cmd.name.padEnd(12)} - ${cmd.description}`);
                }
            }
            lines.push('');
            
            // Use pager if enabled
            if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                await this.repl.pager.paginate(lines, this.repl.rl);
            } else {
                console.log(lines.join('\n'));
            }
            return;
        } else {
            // Show help for specific command
            await helpSystem.showHelp(args);
            return;
        }
    }
    
    getHelp() {
        return {
            description: 'Show help information',
            usage: 'help [command|category]',
            examples: [
                'help',
                'help run        ; for help on a single command',
                'help all',
                'help debugger',
                'help shell'
            ],
            category: 'General'
        };
    }
    
    getAliases() {
        return ['h'];
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = HelpCommand;
