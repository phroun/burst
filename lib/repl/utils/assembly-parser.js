// Assembly line parser utility - Fully decoupled implementation
// Works with the assembler interface to delegate all parsing to the external assembler

class AssemblyParser {
    constructor(vm, assemblerInterface) {
        this.vm = vm;
        this.assemblerInterface = assemblerInterface;
    }
    
    // Check if a line should be handled as an assembly instruction
    isAssemblyInstruction(line) {
        return this.assemblerInterface.isAssemblyCommand(line);
    }
    
    // Process an assembly instruction through the assembler interface
    async parseAssemblyLine(line) {
        // Process through the assembler interface
        const result = await this.assemblerInterface.processAssemblyCommand(line, this.vm);
        
        // Handle the result
        if (result) {
            if (result.success) {
                // Successful command
                if (result.message) {
                    console.log(result.message);
                }
                
                // If the assembler advanced the PC, we don't need to
                if (!result.pcAdvanced) {
                    // Advance PC by estimated instruction size
                    const instructionSize = this.assemblerInterface.estimateInstructionSize(line);
                    this.vm.pc += instructionSize;
                    console.log(`PC advanced to 0x${this.vm.pc.toString(16)}`);
                }
                
                return true;
            } else {
                // Error while processing
                if (result.error) {
                    console.error(`Assembly error: ${result.error}`);
                }
                if (result.message) {
                    console.log(result.message);
                }
                
                // If no assembler is connected, advance PC anyway to maintain flow
                if (result.error === 'No assembler connected') {
                    const instructionSize = this.assemblerInterface.estimateInstructionSize(line);
                    this.vm.pc += instructionSize;
                    console.log(`PC advanced by ${instructionSize} bytes (estimated size).`);
                }
                
                return false;
            }
        }
        
        // If no result, something went wrong
        console.error('Failed to process assembly instruction');
        return false;
    }
}

module.exports = AssemblyParser;
