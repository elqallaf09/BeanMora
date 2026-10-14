import ts from 'typescript';
import {readFileSync, readdirSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const messages=new Map();
const arabic=/\p{Script=Arabic}/u;
function source(node, slots=[]){
  if(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)) return source(node.expression,slots);
  if(ts.isStringLiteralLike(node)) return node.text;
  if(ts.isTemplateExpression(node)) return node.head.text+node.templateSpans.map(span=>`{${slots.push(span.expression)-1}}`+span.literal.text).join('');
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken) return (source(node.left,slots)??`{${slots.push(node.left)-1}}`)+(source(node.right,slots)??`{${slots.push(node.right)-1}}`);
  return null;
}
function add(en,ar,file){
  if(typeof en!=='string'||arabic.test(en)||!/[a-zA-Z]{2}/.test(en)||en.length>8000||/^(?:https?:|image\/|video\/)/.test(en)) return;
  const old=messages.get(en); messages.set(en,{en,ar:old?.ar||ar||'',files:[...new Set([...(old?.files??[]),file])]});
}
function pairs(a,e,file){
  if(ts.isConditionalExpression(a)&&ts.isConditionalExpression(e)){pairs(a.whenTrue,e.whenTrue,file);pairs(a.whenFalse,e.whenFalse,file);return;}
  const at=source(a),et=source(e);
  if(at!==null&&et!==null){if(arabic.test(at)) add(et,at,file);return;}
  if(ts.isArrayLiteralExpression(a)&&ts.isArrayLiteralExpression(e)&&a.elements.length===e.elements.length){a.elements.forEach((v,i)=>pairs(v,e.elements[i],file));return;}
  if(ts.isObjectLiteralExpression(a)&&ts.isObjectLiteralExpression(e)) {
    for(const p of a.properties) if(ts.isPropertyAssignment(p)){const key=p.name.getText();const q=e.properties.find(v=>ts.isPropertyAssignment(v)&&v.name.getText()===key);if(q)pairs(p.initializer,q.initializer,file);}
  }
}
function walk(node,file){
  if(ts.isConditionalExpression(node)) pairs(node.whenTrue,node.whenFalse,file);
  if(ts.isCallExpression(node)&&['L','i18nUi','localeLabel'].includes(node.expression.getText().split('.').at(-1))){const offset=node.expression.getText().endsWith('localeLabel')?1:0; if(node.arguments.length>=offset+2)pairs(node.arguments[offset],node.arguments[offset+1],file);}
  if(ts.isArrayLiteralExpression(node)&&node.elements.length===2)pairs(node.elements[0],node.elements[1],file);
  if(ts.isArrayLiteralExpression(node)&&node.elements.length===3)pairs(node.elements[1],node.elements[2],file);
  if(ts.isObjectLiteralExpression(node)) {
    // Object identifiers in copy records are field names (authError, amountNote),
    // not displayed messages. Only the flavor dictionary uses bare display keys.
    for(const p of node.properties) if(ts.isPropertyAssignment(p)&&(ts.isStringLiteralLike(p.name)||(file==='src/core/flavor-vocabulary.ts'&&ts.isIdentifier(p.name)))&&!['ar','en','ja','title_ar','intro_ar','description_ar','equipment_ar','name_ar'].includes(p.name.text)&&ts.isStringLiteralLike(p.initializer)&&arabic.test(p.initializer.text)) add(p.name.text,p.initializer.text,file);
    for(const [a,e] of [['ar','en'],['title_ar','title'],['intro_ar','intro'],['tips_ar','tips'],['equipment_ar','equipment'],['suggestions','suggestionsEn'],['description_ar','description']]){
      const get=k=>node.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText().replace(/['"]/g,'')===k)?.initializer;
      const av=get(a),ev=get(e);if(av&&ev)pairs(av,ev,file);
    }
  }
  ts.forEachChild(node,n=>walk(n,file));
}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(v=>v.isDirectory()&&v.name!=='locales'?files(path.join(dir,v.name)):v.isFile()&&/\.(?:ts|tsx)$/.test(v.name)?[path.join(dir,v.name)]:[]);}
for(const file of [...files(path.join(root,'src')),path.join(root,'App.tsx')]){
  const name=path.relative(root,file),text=readFileSync(file,'utf8');const parsed=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);walk(parsed,name);
  if(name==='src/copy.ts'){
    const variables=new Map();function scan(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer)variables.set(n.name.text,n.initializer);ts.forEachChild(n,scan);}scan(parsed);pairs(variables.get('ar'),variables.get('en'),name);
  }
}
const guides=JSON.parse(readFileSync(path.join(root,'src/methodGuides.json'),'utf8'));
function json(v,file){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(x=>json(x,file));return;}for(const [a,e] of [['title_ar','title'],['intro_ar','intro'],['tips_ar','tips'],['equipment_ar','equipment']]){
  if(typeof v[e]==='string')add(v[e],v[a],file);
  if(Array.isArray(v[e]))v[e].forEach((text,i)=>add(text,v[a]?.[i],file));
}Object.values(v).forEach(x=>json(x,file));}
json(guides,'src/methodGuides.json');
const reviewed=JSON.parse(readFileSync(path.join(root,'src/locales/reviewed.json'),'utf8'));
Object.keys(reviewed.ja).forEach(key=>add(key,'','src/locales/reviewed.json'));
// Existing Japanese dictionaries also contain reusable interface labels.
for(const file of ['localeText.ts','japaneseLabels.ts']){
  const text=readFileSync(path.join(root,'src',file),'utf8');const parsed=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  function visit(n){if(ts.isPropertyAssignment(n)&&ts.isStringLiteralLike(n.name)&&ts.isStringLiteralLike(n.initializer)) add(n.name.text,'','src/'+file);ts.forEachChild(n,visit);}visit(parsed);
}
const list=[...messages.values()].sort((a,b)=>a.en.localeCompare(b.en));
mkdirSync(path.join(root,'src/locales'),{recursive:true});
writeFileSync(path.join(root,'src/locales/source.json'),JSON.stringify(list,null,2)+'\n');
console.log(JSON.stringify({messages:list.length,templates:list.filter(x=>/\{\d+\}/.test(x.en)).length,englishWords:list.reduce((n,x)=>n+x.en.split(/\s+/).length,0)}));
