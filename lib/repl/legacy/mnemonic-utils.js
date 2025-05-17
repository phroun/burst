// Mnemonic utilities for BURST REPL - Updated for new 16-bit ISA

const { parseConditionPrefix } = require('../repl/assembler-utils');

// Get list of valid instruction mnemonics from opcodes object
function getMnemonicList(opcodes) {
    const mnemonics = Object.keys(opcodes).map(key => key.toLowerCase());
    
    // Add legacy conditional aliases
    const legacyAliases = [
        'jz', 'jnz', 'jeq', 'jne', 'jlt', 'jgt', 'jle', 'jge',
        'movz', 'movnz', 'movlt', 'movge', 'movle', 'movgt', 'movne', 'moveq'
    ];
    
    // Add condition prefix variations
    const conditionPrefixes = ['if', 'ifz', 'ifnz', 'ifeq', 'ifne', 'iflt', 'ifgt', 'ifle', 'ifge'];
    const expandedMnemonics = [];
    
    // Add base mnemonics
    for (const base of mnemonics) {
        expandedMnemonics.push(base);
    }
    
    // Add legacy aliases
    for (const alias of legacyAliases) {
        expandedMnemonics.push(alias);
    }
    
    // Add condition prefix variations
    for (const base of mnemonics) {
        for (const prefix of conditionPrefixes) {
            expandedMnemonics.push(prefix + base);
        }
    }
    
    return expandedMnemonics;
}

// Find similar mnemonics for suggestions (using Levenshtein distance)
function findSimilarMnemonics(input, validMnemonics, maxDistance = 2) {
    const suggestions = [];
    const inputLower = input.toLowerCase();
    
    // First check if it's a conditional variant
    const parsed = parseConditionPrefix(inputLower);
    if (parsed && parsed.mnemonic) {
        // Suggest the base mnemonic
        if (validMnemonics.includes(parsed.mnemonic)) {
            suggestions.push(parsed.mnemonic);
        }
    }
    
    for (const mnemonic of validMnemonics) {
        const distance = levenshteinDistance(inputLower, mnemonic);
        if (distance <= maxDistance && distance > 0) {
            suggestions.push({mnemonic, distance});
        }
    }
    
    // Sort by distance and return top 5
    return suggestions
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
        .map(s => s.mnemonic);
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize base cases
    for (let i = 1; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 1; j <= n; j++) {
        dp[0][j] = j;
    }
    
    // Fill the DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }
    
    return dp[m][n];
}

module.exports = {
    getMnemonicList,
    findSimilarMnemonics
};
