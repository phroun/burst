// scripts/generate-version.js
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');

const versionFilePath = path.resolve(__dirname, '../lib/config/version.js');
const fileContent = `// lib/config/version.js
module.exports = {
  version: '${version}',
};
`;

fs.writeFileSync(versionFilePath, fileContent, 'utf8');

console.log(`Generated lib/config/version.js with version: ${version}`);
