// Command loader for BURST REPL - Updated for new directory structure
// Plugin-based architecture with categories

const fs = require('fs');
const path = require('path');
const helpSystem = require('./help-system');
const PlatformUtils = require('./platform-utils');

class CommandLoader {
    constructor(repl) {
        this.repl = repl;
        this.cwd = process.cwd();
        this.config = PlatformUtils.loadConfig();
        this.commands = {};
        this.commandsByCategory = {
            BASIC: [],
            DEBUGGER: [],
            SHELL: []
        };
        
        // Load all command plugins
        this.loadCommandPlugins();
        
        // Setup configured aliases
        this.setupAliases();
    }
    
    // Load all command plugins from the commands subdirectory and its subdirectories
    loadCommandPlugins() {
        // Use path.join with __dirname to get the correct path to commands directory
        // Since we're now in /repl/utils, we need to go up one level and then into commands
        const commandsDir = path.join(__dirname, '..', 'commands');
        
        try {
            // Create the commands directory if it doesn't exist
            if (!fs.existsSync(commandsDir)) {
                fs.mkdirSync(commandsDir);
                console.log(`Created commands directory: ${commandsDir}`);
                return;
            }
            
            // Recursively find all .js files in the commands directory
            const findCommandFiles = (dir) => {
                const files = [];
                const entries = fs.readdirSync(dir);
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Recurse into subdirectories
                        files.push(...findCommandFiles(fullPath));
                    } else if (entry.endsWith('.js') && entry !== 'BaseCommand.js') {
                        // Skip BaseCommand.js but include all other .js files
                        files.push(fullPath);
                    }
                }
                
                return files;
            };
            
            const commandFiles = findCommandFiles(commandsDir);
            
            for (const filepath of commandFiles) {
                try {
                    const CommandClass = require(filepath);
                    
                    // Ensure we got a constructor function
                    if (typeof CommandClass !== 'function') {
                        throw new Error(`Command file ${filepath} did not export a constructor function`);
                    }
                    
                    // Instantiate the command plugin
                    const commandInstance = new CommandClass(this);
                    
                    // Verify the command has an execute method
                    if (typeof commandInstance.execute !== 'function') {
                        throw new Error(`Command ${filepath} does not implement execute() method`);
                    }
                    
                    // Get the command name from the filename (not the full path)
                    const commandName = path.basename(filepath, '.js');
                    
                    // Register the command
                    this.commands[commandName] = commandInstance.execute.bind(commandInstance);
                    
                    // Get help information if available
                    let help = null;
                    if (commandInstance.getHelp) {
                        help = commandInstance.getHelp();
                        if (help) {
                            // Get aliases from getAliases() method - don't use aliases from help
                            const aliases = commandInstance.getAliases ? commandInstance.getAliases() : [];
                            helpSystem.registerCommand(commandName, {
                                ...help,
                                aliases: aliases // Use only aliases from getAliases()
                            });
                        }
                    }
                    
                    // Get category and showInBasicHelp
                    const category = commandInstance.getCategory ? commandInstance.getCategory() : 'SHELL';
                    const showInBasicHelp = commandInstance.showInBasicHelp ? commandInstance.showInBasicHelp() : false;
                    
                    // Track command by category
                    if (this.commandsByCategory[category]) {
                        this.commandsByCategory[category].push({
                            name: commandName,
                            showInBasicHelp: showInBasicHelp,
                            instance: commandInstance
                        });
                    }
                    
                    // Register aliases if the command provides them
                    if (commandInstance.getAliases) {
                        const aliases = commandInstance.getAliases();
                        for (const alias of aliases) {
                            this.commands[alias] = commandInstance.execute.bind(commandInstance);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to load command plugin ${filepath}: ${error.message}`);
                    if (error.stack) {
                        console.error(error.stack);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load command plugins: ${error.message}`);
            if (error.stack) {
                console.error(error.stack);
            }
        }
    }
    
    // Setup user-configured aliases
    setupAliases() {
        for (const [alias, command] of Object.entries(this.config.aliases)) {
            if (this.commands[command]) {
                this.commands[alias] = this.commands[command];
            } else {
                // Create a command that executes the alias
                this.commands[alias] = async (args) => {
                    let fullCommand = command.split(' ').concat(args);
                    if (command.startsWith('!')) {
                      fullCommand.unshift('exec');
                      fullCommand[1] = fullCommand[1].slice(1);
                    }
                    const baseCommand = fullCommand[0];
                    const commandArgs = fullCommand.slice(1);
                    
                    if (this.commands[baseCommand]) {
                        await this.commands[baseCommand](commandArgs);
                    } else {
                        console.error(`Unknown command in alias: ${baseCommand}`);
                    }
                };
            }
        }
    }
    
    // Get absolute path relative to current working directory
    getAbsolutePath(filepath) {
        if (!filepath.startsWith('./') && !filepath.startsWith('../')) {
            filepath = PlatformUtils.expandTilde(filepath);
        }
        
        if (path.isAbsolute(filepath)) {
            return filepath;
        }
        return path.resolve(this.cwd, filepath);
    }
    
    // Get all registered commands
    getCommands() {
        return this.commands;
    }
    
    // Get commands by category
    getCommandsByCategory() {
        return this.commandsByCategory;
    }
    
    // Get basic commands (for help display)
    getBasicCommands() {
        const basicCommands = [];
        for (const category of Object.keys(this.commandsByCategory)) {
            for (const cmd of this.commandsByCategory[category]) {
                if (cmd.showInBasicHelp) {
                    basicCommands.push(cmd.name);
                }
            }
        }
        return basicCommands;
    }
}

module.exports = CommandLoader;
