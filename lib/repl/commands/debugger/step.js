// Step command plugin - Updated for interface architecture

const BaseCommand = require('../BaseCommand');

class StepCommand extends BaseCommand {
    async execute(args) {
        const count = args.length > 0 ? parseInt(args[0]) : 1;
        
        for (let i = 0; i < count; i++) {
            if (this.vmInterface.isHalted()) {
                console.log('Program halted');
                break;
            }
            
            const pc = this.vmInterface.getPC();
            
            // Disassemble the current instruction
            const disassembled = this.disassemblerInterface.disassembleInstruction(this.vmInterface, pc);
            if (disassembled) {
                const formatted = this.disassemblerInterface.formatInstruction(disassembled);
                console.log(formatted);
            } else {
                console.log(`0x${pc.toString(16).padStart(8, '0')}: ???`);
            }

            // Step the VM
            this.vmInterface.step();
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
