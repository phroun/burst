// Disassemble command plugin - Updated for interface architecture

const BaseCommand = require('../BaseCommand');
const { parseAddress } = require('../../utils/vm-expression-evaluator');

class DisasmCommand extends BaseCommand {
    async execute(args) {
        const addr = args.length > 0 ? parseAddress(args[0]) : this.vmInterface.getPC();
        const count = args.length > 1 ? parseInt(args[1]) : 10;
        
        try {
            // Use disassemblerInterface to disassemble a range of instructions
            const disassembled = this.disassemblerInterface.disassembleCount(this.vmInterface, addr, count);
            
            if (!disassembled || disassembled.length === 0) {
                console.log(`Unable to disassemble at address 0x${addr.toString(16)}`);
                return;
            }
            
            // Format each instruction
            const lines = [];
            for (const instr of disassembled) {
                const formatted = this.disassemblerInterface.formatInstruction(instr);
                lines.push(formatted);
            }
            
            // Use pagination for disassembly
            if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                await this.repl.pager.paginate(lines, this.repl.rl);
            } else {
                console.log(lines.join('\n'));
            }
        } catch (error) {
            console.error(`Disassembly error: ${error.message}`);
        }
    }
    
    getHelp() {
        return {
            description: 'Disassemble instructions',
            usage: 'disasm [address] [count]',
            examples: [
                'disasm',
                'disasm 0x1000',
                'disasm 0x1000 20'
            ],
            category: 'Inspection',
            aliases: ['d']
        };
    }
    
    getAliases() {
        return ['d'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = DisasmCommand;
