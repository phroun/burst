function getMnemonicList(OPCODES) {
    return Object.keys(OPCODES).map(op => op.toLowerCase());
}

function findSimilarMnemonics(input, validMnemonics) {
    const similar = [];
    const inputLower = input.toLowerCase();
    
    for (const mnemonic of validMnemonics) {
        // Check if mnemonic starts with same letter or is similar length
        if (mnemonic.startsWith(inputLower[0]) || 
            Math.abs(mnemonic.length - inputLower.length) <= 1) {
            // Simple similarity check
            let matches = 0;
            for (let i = 0; i < Math.min(mnemonic.length, inputLower.length); i++) {
                if (mnemonic[i] === inputLower[i]) matches++;
            }
            if (matches >= inputLower.length / 2) {
                similar.push(mnemonic);
            }
        }
    }
    
    return similar.slice(0, 3); // Return up to 3 suggestions
}

module.exports = {
    getMnemonicList,
    findSimilarMnemonics
};
