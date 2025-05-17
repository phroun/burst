// Info command plugin - Updated for interface architecture

const BaseCommand = require('../BaseCommand');
const { parseAddress } = require('../../utils/vm-expression-evaluator');

class InfoCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: info <regs|mem|breaks>');
            return;
        }
        
        switch (args[0].toLowerCase()) {
            case 'regs':
            case 'registers':
                this.displayRegisters();
                break;
                
            case 'mem':
            case 'memory':
                const addr = args.length > 1 ? parseAddress(args[1]) : this.vmInterface.getPC();
                const length = args.length > 2 ? parseInt(args[2]) : 64;
                await this.displayMemory(addr, length);
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
    
    // Display registers
    displayRegisters() {
        // Check if we have access to registers
        const registers = this.vmInterface.state.registers;
        if (!registers || !Array.isArray(registers)) {
            console.log('Register information not available');
            return;
        }
        
        // Create formatted output of registers
        for (let i = 0; i < registers.length; i++) {
            const value = registers[i];
            console.log(`r${i.toString().padStart(2, ' ')}: 0x${value.toString(16).padStart(8, '0')} (${value})`);
        }
        
        // Display special registers
        const pc = this.vmInterface.getPC();
        console.log(`pc: 0x${pc.toString(16).padStart(8, '0')} (${pc})`);
        
        // Try to display SP if available
        try {
            if (this.vmInterface.state.sp !== undefined) {
                const sp = this.vmInterface.state.sp;
                console.log(`sp: 0x${sp.toString(16).padStart(8, '0')} (${sp})`);
            }
        } catch (error) {
            // SP not available, skip it
        }
        
        // Try to display flags if available
        try {
            if (this.vmInterface.state.flags) {
                console.log('Flags:');
                for (const [flag, value] of Object.entries(this.vmInterface.state.flags)) {
                    console.log(`  ${flag}: ${value ? 'true' : 'false'}`);
                }
            }
        } catch (error) {
            // Flags not available, skip them
        }
    }
    
    // Display memory
    async displayMemory(address, length) {
        try {
            const lines = [];
            
            // Format memory in 16-byte rows
            for (let i = 0; i < length; i += 16) {
                const rowLen = Math.min(16, length - i);
                const bytes = [];
                const chars = [];
                
                for (let j = 0; j < rowLen; j++) {
                    const byte = this.vmInterface.readByte(address + i + j);
                    bytes.push(byte.toString(16).padStart(2, '0'));
                    
                    // Add printable character or dot for non-printable
                    if (byte >= 32 && byte <= 126) {
                        chars.push(String.fromCharCode(byte));
                    } else {
                        chars.push('.');
                    }
                }
                
                // Fill remaining bytes in row with spaces
                for (let j = rowLen; j < 16; j++) {
                    bytes.push('  ');
                    chars.push(' ');
                }
                
                // Format the line with bytes and characters
                const addrHex = (address + i).toString(16).padStart(8, '0');
                const bytesFormatted = bytes.join(' ');
                const charsFormatted = chars.join('');
                
                lines.push(`0x${addrHex}: ${bytesFormatted}  |${charsFormatted}|`);
            }
            
            // Use pagination if needed
            if (this.repl.pager && this.repl.pager.shouldPaginate(lines)) {
                await this.repl.pager.paginate(lines, this.repl.rl);
            } else {
                console.log(lines.join('\n'));
            }
        } catch (error) {
            console.error(`Error accessing memory: ${error.message}`);
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
