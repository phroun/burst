// Step command plugin

const BaseCommand = require('../BaseCommand');

class StepCommand extends BaseCommand {
    async execute(args) {
        const count = args.length > 0 ? parseInt(args[0]) : 1;
        
        for (let i = 0; i < count; i++) {
            if (this.vm.halted) {
                console.log('Program halted');
                break;
            }
            
            const pc = this.vm.pc;
            const instruction = this.vm.readWord(pc);
            const disasm = this.disassembler.disassembleInstruction(this.vm, pc, instruction);
            console.log(`0x${pc.toString(16).padStart(8, '0')}: ${disasm}`);

            this.vm.step();
        }
    }
    
    getHelp() {
        return {
            description: 'Execute n instructions',
            usage: 'step [n]',
            examples: [
                'step',
                'step 5'
            ],
            category: 'Execution',
            aliases: ['s']
        };
    }
    
    getAliases() {
        return ['s'];
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = StepCommand;
