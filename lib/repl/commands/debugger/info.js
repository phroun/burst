// Info command plugin

const BaseCommand = require('../BaseCommand');
const { parseAddress } = require('../../vm-expression-evaluator');

class InfoCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: info <regs|mem|breaks>');
            return;
        }
        
        switch (args[0].toLowerCase()) {
            case 'regs':
            case 'registers':
                // For registers, use direct output (usually short)
                this.vm.dumpRegisters();
                break;
                
            case 'mem':
            case 'memory':
                // For memory, collect lines and paginate if needed
                const addr = args.length > 1 ? parseAddress(args[1]) : this.vm.pc;
                const length = args.length > 2 ? parseInt(args[2]) : 64;
                
                // Capture memory dump output
                const originalConsoleLog = console.log;
                const lines = [];
                console.log = (line) => lines.push(line);
                
                try {
                    this.vm.dumpMemory(addr, length);
                } finally {
                    console.log = originalConsoleLog;
                }
                
                // Use pagination if needed
                if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                    await this.repl.pager.paginate(lines, this.repl.rl);
                } else {
                    console.log(lines.join('\n'));
                }
                break;
                
            case 'breaks':
            case 'breakpoints':
                this.debugger.listBreakpoints();
                this.debugger.listWatchpoints();
                break;
                
            default:
                console.log(`Unknown info command: ${args[0]}`);
        }
    }
    
    getHelp() {
        return {
            description: 'Show information about registers, memory, or breakpoints',
            usage: 'info <what>',
            examples: [
                'info regs',
                'info mem 0x1000',
                'info breaks'
            ],
            category: 'Inspection',
            aliases: ['i']
        };
    }
    
    getAliases() {
        return ['i'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = InfoCommand;
