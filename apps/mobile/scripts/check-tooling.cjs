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

// Expo CLI 57.0.33 validates plugins with schema-utils. Zod is no longer a
// runtime CLI dependency; optional expo-mcp supplies its own schema engine.
// Exercise the installed CLI's actual validator, not the retired Zod path.
const fromExpo = createRequire(require.resolve('expo/package.json'));
const fromCli = createRequire(fromExpo.resolve('@expo/cli/package.json'));
assert.equal(fromExpo('@expo/cli/package.json').dependencies.zod, undefined);
const { validate, ValidationError } = fromCli('@expo/schema-utils');
const { PluginSchema } = fromCli('./build/src/start/server/devtools/DevToolsPlugin.schema.js');
const commands = [{ name: 'check', title: 'Check', environments: ['cli', 'mcp'], parameters: [{ name: 'attempts', type: 'number' }] }];
const plugin = { packageName: 'fixture', packageRoot: '/fixture', cliExtensions: { description: 'Fixture', commands, entryPoint: 'index.js' } };
assert.doesNotThrow(() => validate(PluginSchema, plugin));
assert.throws(() => validate(PluginSchema, { packageName: '', packageRoot: '/fixture' }), ValidationError);
assert.throws(() => validate(PluginSchema, { ...plugin, cliExtensions: { ...plugin.cliExtensions, commands: [] } }), ValidationError);
assert.throws(() => validate(PluginSchema, {
  ...plugin,
  cliExtensions: { ...plugin.cliExtensions, commands: [{ ...commands[0], parameters: [{ name: 'attempts', type: 'invalid' }] }] },
}), ValidationError);
console.log('PASS: Expo CLI plugin and command schemas accept valid inputs and reject malformed definitions.');
