import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function sources(map) {
  if (map?.version !== 3) throw new Error('Invalid export source map.');
  if (Array.isArray(map.sections) && map.sections.length) return map.sections.flatMap(section => sources(section.map));
  if (!Array.isArray(map.sources) || !map.sources.length || !map.sources.every(source => typeof source === 'string')) {
    throw new Error('Export source map has no usable sources.');
  }
  return map.sources;
}

export function checkExportedDependencies(root = 'dist') {
  const results = [];
  for (const platform of ['ios', 'android', 'web']) {
    const directory = join(root, '_expo/static/js', platform);
    const maps = readdirSync(directory).filter(file => file.endsWith('.map'));
    if (!maps.length) throw new Error(`Missing ${platform} export source maps; export all platforms with --source-maps.`);
    const modules = maps.flatMap(file => sources(JSON.parse(readFileSync(join(directory, file), 'utf8'))));
    const affected = modules.filter(source => /(?:^|[/\\])node_modules[/\\](?:braces|node-forge)(?:[/\\]|$)/.test(source));
    if (affected.length) throw new Error(`Security-patched build tooling entered the ${platform} runtime bundle:\n${affected.join('\n')}`);
    results.push({ platform, maps: maps.length, sources: modules.length });
  }
  return results;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  for (const result of checkExportedDependencies()) {
    console.log(`PASS: ${result.platform}, ${result.sources} mapped sources; no braces/node-forge runtime modules.`);
  }
}
