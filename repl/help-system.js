// Help system for BURST REPL

class HelpSystem {
    constructor() {
        this.commands = new Map();
        this.categories = new Map();
        this.pager = null; // Will be set by REPL
        this.repl = null; // Reference to REPL instance
    }
    
    // Set the pager instance
    setPager(pager) {
        this.pager = pager;
    }
    
    // Set the REPL instance
    setRepl(repl) {
        this.repl = repl;
    }
    
    // Register a command with its help
    registerCommand(name, options) {
        const {
            description,
            usage,
            examples,
            category = 'Other',
            aliases = []
        } = options;
        
        this.commands.set(name, {
            name,
            description,
            usage,
            examples,
            category,
            aliases
        });
        
        // Add to category
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(name);
        
        // Register aliases
        for (const alias of aliases) {
            this.commands.set(alias, {
                ...this.commands.get(name),
                isAlias: true,
                aliasFor: name
            });
        }
    }
    
    // Get help for a specific command
    getCommandHelp(cmd) {
        const command = this.commands.get(cmd);
        if (!command) {
            return null;
        }
        
        let help = '';
        if (command.isAlias) {
            help += `${cmd} is an alias for ${command.aliasFor}\n\n`;
        }
        
        help += `${command.name} - ${command.description}\n`;
        if (command.usage) {
            help += `\nUsage: ${command.usage}\n`;
        }
        if (command.examples) {
            help += `\nExamples:\n`;
            for (const example of command.examples) {
                help += `  ${example}\n`;
            }
        }
        if (command.aliases.length > 0) {
            help += `\nAliases: ${command.aliases.join(', ')}\n`;
        }
        
        return help;
    }
    
    // Get general help
    getGeneralHelp() {
        let help = 'Available commands:\n\n';
        
        // Group by category
        for (const [category, commands] of this.categories) {
            help += `${category}:\n`;
            for (const cmd of commands) {
                const command = this.commands.get(cmd);
                if (!command.isAlias) {
                    help += `  ${command.name.padEnd(12)} - ${command.description}\n`;
                }
            }
            help += '\n';
        }
        
        help += 'Type "help <command>" for detailed help on a specific command\n';
        help += 'You can also enter BURST assembly instructions directly\n';
        
        return help;
    }
    
    getCategories() {
        const categories = {};
        
        // Group commands by category
        for (const [name, cmd] of Object.entries(commands)) {
            const category = cmd.category || 'General';
            if (!categories[category]) {
                categories[category] = {};
            }
            categories[category][name] = cmd;
        }
        
        return categories;
    }
    
    // Show help
    async showHelp(args) {
        if (args.length === 0) {
            console.log('');
            const help = this.getGeneralHelp();
            if (this.pager && this.repl && this.pager.shouldPaginate(help)) {
                await this.pager.paginate(help, this.repl.rl);
            } else {
                console.log(help);
            }
        } else {
            const cmd = args[0].toLowerCase();
            const help = this.getCommandHelp(cmd);
            if (help) {
                console.log('');
                if (this.pager && this.repl && this.pager.shouldPaginate(help)) {
                    await this.pager.paginate(help, this.repl.rl);
                } else {
                    console.log(help);
                }
            } else {
                console.log(`No help available for: ${cmd}`);
            }
        }
    }
}

// Singleton instance
const helpSystem = new HelpSystem();

module.exports = helpSystem;
