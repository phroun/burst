// Set command plugin

const BaseCommand = require('../BaseCommand');
const { parseRegister, parseValue } = require('../../vm-expression-evaluator');

class SetCommand extends BaseCommand {
    async execute(args) {
        if (args.length < 2) {
            console.log('Usage: set <register> <value>');
            return;
        }
        
        const reg = parseRegister(args[0]);
        const value = parseValue(args[1]);
        
        if (reg === 'pc') {
            this.vm.pc = value;
        } else if (reg === 'sp') {
            this.vm.sp = value;
        } else if (reg.startsWith('r')) {
            const regNum = parseInt(reg.substr(1));
            if (regNum >= 0 && regNum < 16) {
                this.vm.registers[regNum] = value;
            } else {
                console.error(`Invalid register number: ${regNum}`);
                return;
            }
        } else {
            console.error(`Unknown register: ${reg}`);
            return;
        }
        
        console.log(`${reg} = 0x${value.toString(16)}`);
    }
    
    getHelp() {
        return {
            description: 'Set register value',
            usage: 'set <register> <value>',
            examples: [
                'set r0 0x1234',
                'set pc 0x1000',
                'set sp 0x8000'
            ],
            category: 'Modification'
        };
    }
    
    getCategory() {
        return 'DEBUGGER';
    }
    
    showInBasicHelp() {
        return false;
    }
}

module.exports = SetCommand;
