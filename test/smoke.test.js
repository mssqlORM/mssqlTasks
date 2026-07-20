const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'package.json')), 'Expected package.json');
assert.ok(fs.existsSync(path.join(root, 'src', 'index.ts')), 'Expected src/index.ts');
assert.ok(fs.existsSync(path.join(root, 'tsconfig.json')), 'Expected tsconfig.json');
assert.ok(fs.existsSync(path.join(root, 'README.md')), 'Expected README.md');

// Verify package.json has genkit dep
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.ok(pkg.dependencies?.genkit, 'Expected genkit dependency');
assert.ok(pkg.main, 'Expected main field');
assert.ok(pkg.types, 'Expected types field');

console.log('an5Tasks smoke test passed');
