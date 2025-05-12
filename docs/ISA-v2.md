# ISA Addendum Implementation Summary

## Changes Made to Implement the BURST ISA Addendum

### 1. burst-vm.js Updates

#### New Opcodes Added
- **0x43 LIMM**: Load 32-bit immediate (two-word instruction)
- **0x46 ENTER**: Stack frame entry
- **0x47 LEAVE**: Stack frame exit
- **0x48 CALLI**: Indirect call
- **0x49 JMPR**: Indirect jump
- **0x4A ROL**: Rotate left
- **0x4B ROR**: Rotate right
- **0x4C SAR**: Shift arithmetic right
- **0x4D ADDI**: Add immediate
- **0x4E CMPI**: Compare immediate
- **0x4F TRAP**: Software trap
- **0x60-0x67**: Conditional move family (MOVC, MOVZ, MOVNZ, etc.)

#### New VM Features
- Support for two-word instructions (LIMM)
- Trap handler system for the TRAP instruction
- Additional sign extension helper function for 8-bit values
- Enhanced instruction execution for all new opcodes

#### BurstAssembler Class Updates
- Added assembly methods for all new instructions
- Special handling for two-word LIMM instruction

### 2. assembler-utils.js Updates

#### New Operand Types
- `imm8`: 8-bit immediate values
- `imm32`: 32-bit immediate values
- All new instructions added to `OPERAND_TYPES` object

#### Enhanced Parsing
- Support for 8-bit immediate values with range checking
- Support for 32-bit immediate values (no range check needed)
- Updated operand validation for new instructions

#### New Assembly Methods
- All ISA Addendum instructions added to `callAssemblerMethod`

### 3. assemble.js Updates

#### Two-Word Instruction Support
- Special handling for LIMM instruction in `calculateInstructionSize`
- Returns 8 bytes for LIMM instead of the standard 4 bytes

### 4. disassembler.js Updates

#### New Instruction Disassembly
- Added disassembly format for all new instructions
- Special handling for two-word LIMM instruction
- New `disassembleMemory` function to properly handle multi-word instructions

#### Enhanced Formatting
- Sign extension display for 8-bit immediates
- Proper register formatting for new instructions

### 5. ISA.md Updates

#### Documentation
- Added register aliases (R0, A1-A5, T1-T5, S1-S4, FP)
- Complete documentation of all new instructions
- Updated encoding examples
- Enhanced calling convention documentation with ENTER/LEAVE
- Added sections for ISA Addendum extensions

## Key Implementation Details

### Two-Word Instructions
The LIMM instruction is the only two-word instruction. It requires:
1. Special size calculation during assembly
2. Two consecutive emit operations in the assembler
3. Special disassembly handling to read the second word
4. PC increment by 8 instead of 4 after execution

### Sign Extension
- 8-bit immediates (ADDI, CMPI) are sign-extended
- Added `signExtend8` helper function in VM
- Proper display of negative values in disassembler

### Conditional Moves
- Same flag condition logic as corresponding jumps
- Enables branch-free code for better optimization
- Consistent naming scheme (MOVZ for JZ, MOVLT for JLT, etc.)

### Stack Frame Management
- ENTER creates standard function prologue
- LEAVE creates standard function epilogue
- FP (R15) used as frame pointer by convention

### Indirect Control Flow
- CALLI saves return address like CALL
- JMPR does not save return address
- Both take address from register instead of immediate

## Benefits of the Addendum

1. **Better Compiler Support**: ENTER/LEAVE, 32-bit immediates, and register aliases
2. **Enhanced Performance**: Conditional moves avoid branches
3. **Improved Flexibility**: Indirect jumps and calls for function pointers
4. **More Complete ISA**: Additional shift operations and immediate arithmetic
5. **Debugging Support**: TRAP instruction for breakpoints/debugging

All changes maintain backward compatibility with the original ISA while providing significant enhancements for modern programming needs.
