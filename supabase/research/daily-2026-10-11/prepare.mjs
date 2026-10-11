// Use the existing reviewed importer; compile only this finite batch.
import { readFileSync, writeFileSync } from 'node:fs';
import { compileCatalog, generateSQL } from '../../../scripts/prepare-roaster-recipes.mjs';
const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const catalog = compileCatalog({ ...read('input.json'), snapshot: read('public-catalog-snapshot.json') });
writeFileSync(new URL('catalog.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(new URL('import.sql', import.meta.url), generateSQL(catalog));
console.log(JSON.stringify(catalog.counts));
