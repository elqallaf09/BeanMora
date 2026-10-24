const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const xcode = require('xcode');
// Xcode 4 generates IDs with Node's crypto, so its old UUID override is retired.
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
console.log('PASS: Xcode project identifier generation. No files created.');

// Expo still declares Zod 3. Exercise its actual schema consumers with the
// patched Zod 4 override so an audit fix cannot silently break the CLI.
const fromExpo = createRequire(require.resolve('expo/package.json'));
const fromCli = createRequire(fromExpo.resolve('@expo/cli/package.json'));
assert.equal(fromCli('zod/package.json').version, '4.6.6');
const { PluginSchema } = fromCli('./build/src/start/server/DevToolsPlugin.schema.js');
const { createMCPDevToolsExtensionSchema } = fromCli('./build/src/start/server/createMCPDevToolsExtensionSchema.js');
const commands = [{ name: 'check', title: 'Check', environments: ['cli', 'mcp'], parameters: [{ name: 'attempts', type: 'number' }] }];
const plugin = { packageName: 'fixture', packageRoot: '/fixture', cliExtensions: { description: 'Fixture', commands, entryPoint: 'index.js' } };
assert.equal(PluginSchema.safeParse(plugin).success, true);
assert.equal(PluginSchema.safeParse({ packageName: '', packageRoot: '/fixture' }).success, false);
const schema = createMCPDevToolsExtensionSchema(plugin);
assert.equal(schema.safeParse({ command: 'check', attempts: 1 }).success, true);
assert.equal(schema.safeParse({ command: 'missing', attempts: 'bad' }).success, false);
console.log('PASS: Expo CLI plugin and MCP command schemas validate with patched Zod.');
