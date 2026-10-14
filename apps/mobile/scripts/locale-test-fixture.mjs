import {cpSync,readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
export function prepareLocaleFixture(temp) {
  const source=readFileSync(new URL('../src/core/app-locales.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  writeFileSync(temp+'/core/app-locales.mjs',code);
  cpSync(new URL('../src/locales',import.meta.url),temp+'/locales',{recursive:true});
  for(const file of ['deepSearch','multilingual-vocabulary','catalog-names','catalog-foreign-titles','flavor-vocabulary','coffee-name-aliases','coffee-label-vocabulary']) {
    const source=readFileSync(new URL('../src/core/'+file+'.ts',import.meta.url),'utf8');
    const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (["'])(\.\/[^"']+)\1/g,"from '$2.mjs'");
    writeFileSync(temp+'/core/'+file+'.mjs',code);
  }
}
export function withLocaleRequire(file,code) {
  return file==='localeText.ts'?"import {createRequire as createLocaleRequire} from 'node:module';\nconst require=createLocaleRequire(import.meta.url);\n"+code:code;
}
