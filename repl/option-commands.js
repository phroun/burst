// Option commands for BURST REPL
// Manages runtime configuration options

const helpSystem = require('./help-system');
const PlatformUtils = require('./platform-utils');

class OptionCommands {
    constructor(repl) {
        this.repl = repl;
        
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
            }
        };
        
        // Load options from config
        this.loadOptionsFromConfig();
        
        // Register help
        this.registerHelp();
    }
    
    loadOptionsFromConfig() {
        if (this.repl.config.options) {
            for (const [name, value] of Object.entries(this.repl.config.options)) {
                if (this.options[name]) {
                    // Convert string values to appropriate types
                    const option = this.options[name];
                    if (option.type === 'boolean') {
                        option.value = value === 'true' || value === true;
                    } else if (option.type === 'number') {
                        option.value = parseInt(value) || option.value;
                    } else {
                        option.value = value;
                    }
                }
            }
        }
    }
    
    registerHelp() {
        helpSystem.registerCommand('option', {
            description: 'View or set configuration options',
            usage: 'option [name] [value]',
            examples: [
                'option                    # List all options',
                'option paginate           # Show current value',
                'option paginate true      # Enable pagination',
                'option paginate false     # Disable pagination',
                'option pagerDebug true    # Enable pager debug info',
            ],
            category: 'Configuration',
            aliases: ['opt']
        });
    }
    
    getCommands() {
        return {
            option: this.cmdOption.bind(this),
            opt: this.cmdOption.bind(this)
        };
    }
    
    // Command: option
    cmdOption(args) {
        if (args.length === 0) {
            // List all options
            console.log('Current options:');
            for (const [name, option] of Object.entries(this.options)) {
                console.log(`  ${name.padEnd(20)} = ${option.value} (${option.description})`);
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
            console.log(`${optionName} = ${option.value}`);
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
            const numValue = parseInt(newValue);
            if (isNaN(numValue)) {
                console.error(`Invalid number value: ${newValue}`);
                return;
            }
            option.value = numValue;
        } else {
            option.value = newValue;
        }
        
        console.log(`${optionName} set to ${option.value}`);
        
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
}

module.exports = OptionCommands;
