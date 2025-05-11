// Disassemble command plugin

const BaseCommand = require('../BaseCommand');
const { parseAddress } = require('../../vm-expression-evaluator');

class DisasmCommand extends BaseCommand {
    async execute(args) {
        const addr = args.length > 0 ? parseAddress(args[0]) : this.vm.pc;
        const count = args.length > 1 ? parseInt(args[1]) : 10;
        
        const lines = [];
        let currentAddr = addr;
        for (let i = 0; i < count; i++) {
            const instruction = this.vm.readWord(currentAddr);
            const disasm = this.disassembler.disassembleInstruction(this.vm, currentAddr, instruction);
            lines.push(`0x${currentAddr.toString(16).padStart(8, '0')}: ${disasm}`);
            currentAddr += 4;
        }
        
        // Use pagination for disassembly
        if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
            await this.repl.pager.paginate(lines, this.repl.rl);
        } else {
            console.log(lines.join('\n'));
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
