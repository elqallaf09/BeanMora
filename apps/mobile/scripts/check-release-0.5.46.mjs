import { readFileSync } from 'node:fs';
import { checkBuildConfig } from './check-build-config.mjs';

const { expo } = JSON.parse(readFileSync('./app.json', 'utf8'));
const eas = JSON.parse(readFileSync('./eas.json', 'utf8'));
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
if (expo.version !== '0.5.46' || pkg.version !== expo.version) {
  throw new Error('The consent release requires matching BeanMora 0.5.46 versions.');
}
if (expo.owner !== 'elqallaf09' || expo.slug !== 'beanmora-mobile'
  || expo.extra?.eas?.projectId !== 'a3785113-b993-49fa-9986-e3dc96d63115'
  || expo.ios?.bundleIdentifier !== 'com.beanmora.mobile'
  || expo.android?.package !== 'com.beanmora.mobile'
  || eas.submit?.production?.ios?.ascAppId !== '6819935215') {
  throw new Error('The release must target the existing BeanMora applications.');
}
if (eas.cli?.appVersionSource !== 'remote'
  || eas.build?.production?.autoIncrement !== true
  || eas.build?.production?.distribution === 'internal'
  || eas.build?.production?.ios?.simulator === true
  || eas.build?.production?.android?.buildType !== 'app-bundle') {
  throw new Error('Store builds with remote numbering and an Android App Bundle are required.');
}
if (process.env.EXPO_PUBLIC_SUPABASE_URL !== 'https://ubvzdglrwkkuaigmkjap.supabase.co') {
  throw new Error('The release must use the existing BeanMora backend.');
}
const issues = checkBuildConfig(process.env);
if (issues.length) throw new Error(issues.join('\n'));
console.log('BeanMora 0.5.46 app identity, store profiles and public configuration passed.');
