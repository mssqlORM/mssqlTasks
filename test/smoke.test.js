const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'package.json')), 'Expected package.json');
assert.ok(fs.existsSync(path.join(root, 'src', 'index.ts')), 'Expected index.ts');

console.log('mssqlTasks smoke test passed');
