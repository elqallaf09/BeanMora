import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
const target = new URL('../.env.local', import.meta.url);
if (existsSync(target)) {
  console.log('.env.local already exists; it was not overwritten. Run npm start.');
  process.exit(0);
}
// Copy only PUBLIC settings from an existing local web config, never privileged secrets.
const values = {};
for (const relative of ['../../../.env', '../../../.env.local', '../.env']) {
  const file = new URL(relative, import.meta.url);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) values[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const url = values.EXPO_PUBLIC_SUPABASE_URL || values.NEXT_PUBLIC_SUPABASE_URL || 'https://ubvzdglrwkkuaigmkjap.supabase.co';
let key = values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const rl = createInterface({ input: stdin, output: stdout });
if (!key) key = (await rl.question('Supabase Publishable key (sb_publishable_...; NOT service_role): ')).trim();
rl.close();
let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
try { publicKey ||= JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch {}
if (!publicKey || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new Error('Use a Supabase HTTPS project URL and public/anon key only. Nothing was written.');
writeFileSync(target, `EXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`, { mode: 0o600, flag: 'wx' });
console.log('Ready. Run npx expo login, then npm start. Do not commit .env.local.');
