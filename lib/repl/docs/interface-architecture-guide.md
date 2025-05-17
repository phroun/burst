# BURST REPL Assembler Interface Guide

This guide explains how to use the refactored BURST REPL with its new assembler interface.

## Overview

The BURST REPL has been refactored to separate the assembler components from the REPL itself. This allows for easier integration of your new assembler and ISA in the future while maintaining compatibility with the existing REPL features like tab completion.

## Key Files

1. **assembler-interface.js** - Core interface between the REPL and any assembler implementation
2. **burst-repl.js** - Modified REPL that uses the interface instead of direct assembler imports
3. **assembly-parser.js** - Updated parser that works with the interface
4. **mnemonic-utils.js** - Updated utilities that work with the interface
5. **repl-commands.js** - Updated command handlers that use the interface

## How to Connect Your New Assembler

1. Create an adapter class for your assembler that implements the interface methods
2. Connect the adapter to the REPL at startup

Here's an example of connecting your assembler:

```javascript
// In your startup script
const BurstREPL = require('./burst-repl.js');
const NewBurstAssemblerAdapter = require('./new-burst-assembler-adapter.js');

// Create the REPL
const repl = new BurstREPL();

// Create and connect the assembler adapter
const assemblerAdapter = new NewBurstAssemblerAdapter();
repl.assemblerInterface.connectAssembler(assemblerAdapter);

// Start the REPL
repl.start();
```

## Required Interface Methods

Your assembler adapter should implement these methods:

1. **getValidMnemonics()** - Returns an array of all valid mnemonics
2. **getOpcodes()** - Returns the opcodes object
3. **getConditions()** - Returns the conditions object
4. **getOperandTypes()** - Returns the operand types mapping
5. **getLegacyAliases()** - Returns the legacy alias mapping
6. **getConditionPrefixes()** - Returns the condition prefix mapping
7. **parseConditionPrefix(mnemonic)** - Parses a mnemonic with condition prefix
8. **assembleInstruction(mnemonic, operands)** - Assembles a single instruction
9. **assembleFile(filename)** - Assembles an entire file
10. **calculateInstructionSize(mnemonic, operands)** - Calculates the size of an instruction

## Temporary Mode

Until your new assembler is ready, the REPL will still function but with limited assembler capabilities:

1. Autocomplete will work for opcodes loaded from `burst-isa.js` if available
2. Assembly commands will display what they would do but not actually assemble code
3. The REPL will track PC movement based on estimated instruction sizes

## Updating After Changes

If you modify your ISA or assembler while the REPL is running, you can refresh the mappings:

```javascript
// Update the interface with new data
repl.assemblerInterface.loadISA(newOpcodes, newConditions, newOperandTypes, newLegacyAliases, newConditionPrefixes);

// Update the mnemonic list for tab completion
repl.replCommands.updateMnemonics();
```

## Testing

You can test the interface without a real assembler by using the provided sample adapter, which implements the required methods with placeholder functionality.
