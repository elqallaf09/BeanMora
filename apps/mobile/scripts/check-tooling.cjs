const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const xcode = require('xcode');
const fromXcode = createRequire(require.resolve('xcode'));
// Keep the override scoped to Xcode's tooling-only dependency, not every UUID consumer.
assert.equal(fromXcode('uuid/package.json').version, '11.1.1');
const project = xcode.project('isolated-tooling-fixture.pbxproj');
project.hash = { project: { objects: { PBXGroup: {} } } };
const ids = new Set();
for (let i = 0; i < 20; i++) {
  const id = project.generateUuid();
  assert.match(id, /^[A-F0-9]{24}$/);
  assert.equal(ids.has(id), false);
  ids.add(id);
  project.hash.project.objects.PBXGroup[id] = {};
}
console.log('PASS: patched UUID CommonJS export and Xcode project identifier generation. No files created.');
