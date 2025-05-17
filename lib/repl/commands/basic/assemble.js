// Assemble command plugin - Updated for interface architecture

const fs = require('fs');
const path = require('path');
const BaseCommand = require('../BaseCommand');

class AssembleCommand extends BaseCommand {
    async execute(args) {
        if (args.length === 0) {
            console.log('Usage: assemble <file>');
            return;
        }
        
        const filename = this.getAbsolutePath(args[0]);
        try {
            // Use the assembler interface to assemble the file
            const result = await this.assemblerInterface.assembleFile(filename);
            
            if (result.success) {
                console.log(`Assembled ${path.basename(filename)} to ${path.basename(result.outputFile)} (${result.program.length} bytes)`);
                
                // Option to load immediately
                if (args.includes('-l') || args.includes('--load')) {
                    await this.vmInterface.loadProgram(result.program);
                    console.log('Program loaded');
                }
            } else {
                console.error(`Assembly failed: ${result.error}`);
            }
        } catch (error) {
            // If the assembler interface isn't connected or doesn't implement assembleFile
            console.error(`Assembly failed: ${error.message}`);
            console.log("No assembler is currently connected to the REPL.");
        }
    }
    
    getHelp() {
        return {
            description: 'Assemble a BURST assembly file',
            usage: 'assemble <file> [options]',
            examples: [
                'assemble program.asm',
                'assemble program.asm -l    # Load after assembly'
            ],
            category: 'Assembly',
            aliases: ['asm']
        };
    }
    
    getAliases() {
        return ['asm'];
    }
    
    getCategory() {
        return 'BASIC';
    }
    
    showInBasicHelp() {
        return true;
    }
}

module.exports = AssembleCommand;
