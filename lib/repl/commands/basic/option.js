// Option command plugin

const BaseCommand = require('../BaseCommand');

class OptionCommand extends BaseCommand {
    constructor(commandLoader) {
        super(commandLoader);
        
        // Define available options with their defaults
        this.options = {
            paginate: {
                value: true,
                description: 'Enable output pagination for long content',
                type: 'boolean'
            },
            pagerDebug: {
                value: false,
                description: 'Show debug info in pager (dimensions, line numbers)',
                type: 'boolean'
            },
            promptColor: {
                value: undefined,
                description: 'ANSI color code for prompt (0-15, or off)',
                type: 'number'
            }
        };
        
        // Load options from config
        this.loadOptionsFromConfig();
    }
    
    loadOptionsFromConfig() {
        if (this.repl.config && this.repl.config.options) {
            for (const [name, value] of Object.entries(this.repl.config.options)) {
                if (this.options[name]) {
                    // Convert string values to appropriate types
                    const option = this.options[name];
                    if (option.type === 'boolean') {
                        option.value = value === 'true' || value === true;
                    } else if (option.type === 'number') {
                        if (value === 'off' || value === false || value === null || value === undefined) {
                            option.value = undefined;
                        } else {
                            option.value = parseInt(value) || option.value;
                        }
                    } else {
                        option.value = value;
                    }
                }
            }
        }
    }
    
    async execute(args) {
        if (args.length === 0) {
            // List all options
            console.log('Current options:');
            for (const [name, option] of Object.entries(this.options)) {
                const displayValue = option.value === undefined ? 'off' : option.value;
                console.log(`  ${name.padEnd(20)} = ${displayValue} (${option.description})`);
            }
            return;
        }
        
        const optionName = args[0];
        
        if (!this.options[optionName]) {
            console.error(`Unknown option: ${optionName}`);
            console.error('Available options:', Object.keys(this.options).join(', '));
            return;
        }
        
        const option = this.options[optionName];
        
        if (args.length === 1) {
            // Show current value
            const displayValue = option.value === undefined ? 'off' : option.value;
            console.log(`${optionName} = ${displayValue}`);
            console.log(`Description: ${option.description}`);
            return;
        }
        
        // Set new value
        const newValue = args[1];
        
        if (option.type === 'boolean') {
            if (newValue === 'true' || newValue === 'on' || newValue === '1') {
                option.value = true;
            } else if (newValue === 'false' || newValue === 'off' || newValue === '0') {
                option.value = false;
            } else {
                console.error(`Invalid boolean value: ${newValue}`);
                console.error('Use: true, false, on, off, 1, or 0');
                return;
            }
        } else if (option.type === 'number') {
            if (newValue === 'off' || newValue === 'false' || newValue === 'none') {
                option.value = undefined;
            } else {
                const numValue = parseInt(newValue);
                if (isNaN(numValue)) {
                    console.error(`Invalid number value: ${newValue}`);
                    return;
                }
                // Validate prompt color range
                if (optionName === 'promptColor' && (numValue < 0 || numValue > 15)) {
                    console.error(`Invalid color value: ${numValue}. Must be 0-15 or 'off'`);
                    return;
                }
                option.value = numValue;
            }
        } else {
            option.value = newValue;
        }
        
        const displayValue = option.value === undefined ? 'off' : option.value;
        console.log(`${optionName} set to ${displayValue}`);
        
        // Update any dependent systems
        this.updateDependentSystems(optionName);
    }
    
    // Update systems that depend on options
    updateDependentSystems(optionName) {
        // Update pager options if pagination-related options changed
        if (['paginate', 'pagerDebug'].includes(optionName)) {
            if (this.repl.pager) {
                this.repl.pager.enabled = this.options.paginate.value;
                this.repl.pager.debug = this.options.pagerDebug.value;
            }
        }
        
        // Update prompt immediately if prompt color changed
        if (optionName === 'promptColor' && this.repl.rl) {
            const currentPrompt = this.repl.rl.getPrompt();
            // Force prompt refresh by setting it again
            this.repl.rl.setPrompt(this.repl.formatPrompt(this.repl.cwd));
            this.repl.rl.prompt(true);
        }
    }
    
    // Get current option value
    getOption(name) {
        const option = this.options[name];
        return option ? option.value : undefined;
    }
    
    // Get pager options
    getPagerOptions() {
        return {
            enabled: this.options.paginate.value,
            debug: this.options.pagerDebug.value
        };
    }
    
    // Get prompt color option
    getPromptColor() {
        return this.options.promptColor.value;
    }
    
    getHelp() {
        return {
            description: 'View or set configuration options',
            usage: 'option [name] [value]',
            examples: [
                'option                    # List all options',
                'option paginate           # Show current value',
                'option paginate true      # Enable pagination',
                'option paginate false     # Disable pagination',
                'option pagerDebug true    # Enable pager debug info',
                'option promptColor 2      # Set prompt to green (color 2)',
                'option promptColor 14     # Set prompt to bright cyan',
                'option promptColor off    # Disable prompt coloring',
            ],
            category: 'Configuration',
            aliases: ['opt']
        };
    }
    
    getAliases() {
        return ['opt'];
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = OptionCommand;
