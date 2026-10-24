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

// Expo's two Zod consumers must retain validation semantics when its tooling
// dependency is overridden to the patched major version.
const fromExpo = createRequire(require.resolve('expo/package.json'));
const fromExpoCli = createRequire(fromExpo.resolve('@expo/cli/package.json'));
assert.equal(fromExpoCli('zod/package.json').version, '4.6.7');
const { PluginSchema, DevToolsPluginOutputSchema } = fromExpoCli('./build/src/start/server/DevToolsPlugin.schema.js');
const { createMCPDevToolsExtensionSchema } = fromExpoCli('./build/src/start/server/createMCPDevToolsExtensionSchema.js');
const plugin = PluginSchema.parse({
  packageName: 'beanmora-tooling-fixture', packageRoot: process.cwd(),
  cliExtensions: { description: 'Fixture', entryPoint: 'fixture.js', commands: [
    { name: 'inspect', title: 'Inspect fixture', environments: ['cli', 'mcp'], parameters: [
      { name: 'count', type: 'number' }, { name: 'confirm', type: 'confirm' }, { name: 'label', type: 'text' },
    ] },
  ] },
});
assert.equal(PluginSchema.safeParse({ packageName: '', packageRoot: '' }).success, false);
assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'image', url: 'invalid' }]).success, false);
assert.equal(DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'Fixture', level: 'info' }]).success, true);
const command = createMCPDevToolsExtensionSchema(plugin);
assert.deepEqual(command.parse({ command: 'inspect', count: 2, confirm: true, label: 'Fixture' }),
  { command: 'inspect', count: 2, confirm: true, label: 'Fixture' });
for (const input of [{ command: 'unknown' }, { command: 'inspect', count: '2' }, { command: 'inspect', extra: true }]) {
  assert.equal(command.safeParse(input).success, false);
}
console.log('PASS: Expo plugin, output and MCP command validation with patched Zod.');
