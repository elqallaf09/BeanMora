// Static, reviewed retrieval vocabulary. No translations or model calls at runtime.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
const mobile = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(mobile, '../..');
function exportsOf(file) {
  const module = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInThisContext('(function(module,exports){' + code + '\n})')(module,module.exports);
  return module.exports;
}
const {flavorSearchVocabulary} = exportsOf(path.join(repo, 'src/lib/search/flavor-vocabulary.ts'));
const {accountCountries} = exportsOf(path.join(repo, 'src/lib/account-countries.ts'));
const {accountCountryNames} = exportsOf(path.join(repo, 'src/lib/account-country-names.ts'));
const locales = ['ja','fr','it','es','pt-BR','zh-CN'];
const reviewed = JSON.parse(fs.readFileSync(path.join(mobile, 'src/locales/reviewed.json'), 'utf8'));
const groups = flavorSearchVocabulary.map(group => [group[0], ...group.slice(1), ...locales.flatMap(locale => group.flatMap(key => reviewed[locale][key] ? [reviewed[locale][key]] : []))]);
for (const country of accountCountries) groups.push([country.en.toLowerCase(),country.en,country.ar,country.ja,...Object.values(accountCountryNames).map(names => names[country.code])]);
for (const key of ['Coffee','Cold brew','Hot','Iced','Espresso','Washed','Natural','Honey','Anaerobic','Wet hulled']) {
  // Honey tasting notes and honey processing have the same literal search word,
  // but retain separate display translations and fact-based assistant matching.
  const term = key.toLowerCase();
  groups.push([term,...locales.flatMap(locale=>reviewed[locale][key]?[reviewed[locale][key]]:[])]);
}
const vocabulary = groups.map(group => [...new Set(group.filter(Boolean))]);
const output = '// Generated from reviewed coffee terminology and static country names.\n// Aliases support retrieval only; they never add facts to a catalog record.\nexport const multilingualCountryTerms: readonly string[] = '+JSON.stringify(accountCountries.map(country=>country.en.toLowerCase()))+';\nexport const multilingualSearchVocabulary: readonly (readonly string[])[] = [\n'+vocabulary.map(group=>'  '+JSON.stringify(group)+',').join('\n')+'\n];\n';
fs.writeFileSync(path.join(repo,'src/lib/search/multilingual-vocabulary.ts'),output);
console.log(`${vocabulary.length} multilingual search concepts prepared.`);
