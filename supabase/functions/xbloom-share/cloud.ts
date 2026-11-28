// Unofficial xBloom cloud interop. Wire facts (host, endpoints, body encryption,
// field schema) are documented by the MIT-licensed community projects
// cryptofishbug/xbloom-recipe-cli and Janczykkkko/xbloom-ble. xBloom publishes
// no developer API, so every response is treated as untrusted and the function
// fails closed whenever it does not get a share link it can verify.
export const XBLOOM_API = 'https://client-api.xbloom.com/';
export const SHARE_HOST = 'https://share-h5.xbloom.com/';
export const SHARE_API = 1;
export const MAX_SHARE_BODY_BYTES = 8 * 1024;
const SKEY = 'testskey'; // static app key shipped in the xBloom client, not a secret
const INTERFACE_VERSION = 20240918, PUBLIC_INTERFACE_VERSION = 19700101;
// The xBloom clients' RSA-1024 public key (X.509 SPKI, base64). Public by design.
const PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4LF40GZ72SdhMyl765K/i4nY5CPcHz2Q1IKWKZ9S79xmK7G8pUhbVf4EZLvnNF1+9IvOFQUKV5Z7ZNNviqSpnql9tAT+8+J/He0R7pcirvVSxgdr2i9V/C/gmqAEZ5qVTzRnd3uWdFoKzPdEBxP0IporJ1VBbCv90yBSOhVxO+QIDAQAB';

export type SharePour = { volume: number; temperature: number; flow_rate: number; pause_seconds: number; pattern_code: number };
export type ShareRecipe = { model: 'Studio' | 'Original'; cup: 'Omni' | 'xPod'; dose: number; ratio: number; grind: number; rpm: number; name: string; pours: SharePour[] };

const bytesOf = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
// BigInt() calls, not literals: the repository type-checks at an ES2017 target.
const ZERO = BigInt(0), ONE = BigInt(1), EIGHT = BigInt(8), BYTE = BigInt(255);
const toBig = (bytes: Uint8Array) => bytes.reduce((n, b) => (n << EIGHT) | BigInt(b), ZERO);
/** Read modulus and exponent out of an SPKI DER key (the last two INTEGERs). */
export function rsaKey(spkiBase64 = PUBLIC_KEY): { n: bigint; e: bigint; size: number } {
  const der = bytesOf(spkiBase64); const integers: Uint8Array[] = [];
  const walk = (start: number, end: number) => {
    for (let at = start; at < end;) {
      const tag = der[at++]; let length = der[at++];
      if (length & 0x80) { let count = length & 0x7f; length = 0; while (count--) length = (length << 8) | der[at++]; }
      if (tag === 0x30) walk(at, at + length);
      else if (tag === 0x03) walk(at + 1, at + length); // BIT STRING wraps the RSAPublicKey
      else if (tag === 0x02) integers.push(der.subarray(at, at + length));
      at += length;
    }
  };
  walk(0, der.length);
  if (integers.length < 2) throw new Error('XBLOOM_KEY');
  const modulus = integers[integers.length - 2];
  const trimmed = modulus[0] === 0 ? modulus.subarray(1) : modulus;
  return { n: toBig(trimmed), e: toBig(integers[integers.length - 1]), size: trimmed.length };
}
function modPow(base: bigint, exponent: bigint, modulus: bigint) {
  let result = ONE; base %= modulus;
  for (; exponent > ZERO; exponent >>= ONE) { if (exponent & ONE) result = result * base % modulus; base = base * base % modulus; }
  return result;
}
/** RSA PKCS#1 v1.5 encryption in 117-byte blocks, as the xBloom clients do. */
export function rsaEncrypt(plain: Uint8Array, key = rsaKey()): Uint8Array {
  const block = key.size - 11, out = new Uint8Array(Math.max(1, Math.ceil(plain.length / block)) * key.size);
  for (let i = 0, at = 0; at < plain.length || i === 0; i++, at += block) {
    const message = plain.subarray(at, at + block), padded = new Uint8Array(key.size);
    const filler = crypto.getRandomValues(new Uint8Array(key.size - 3 - message.length)).map(b => b || 1);
    padded[1] = 2; padded.set(filler, 2); padded.set(message, key.size - message.length);
    let value = modPow(toBig(padded), key.e, key.n);
    for (let j = key.size - 1; j >= 0; j--, value >>= EIGHT) out[i * key.size + j] = Number(value & BYTE);
  }
  return out;
}
export function encryptForm(form: Record<string, unknown>): string {
  const cipher = rsaEncrypt(new TextEncoder().encode(JSON.stringify(form)));
  let binary = ''; for (const b of cipher) binary += String.fromCharCode(b);
  return btoa(binary);
}

const num = (value: unknown, low: number, high: number) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high ? value : null;
/** Accept only a physically plausible recipe; nothing else reaches xBloom. */
export function parseShareRecipe(input: unknown): ShareRecipe {
  const r = input as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') throw new Error('INVALID_INPUT');
  const model = r.model === 'Studio' || r.model === 'Original' ? r.model : null;
  const cup = r.cup === 'Omni' || r.cup === 'xPod' ? r.cup : null;
  const dose = num(r.dose, model === 'Original' ? 15 : 5, 25), grind = num(r.grind, 1, 80), rpm = num(r.rpm ?? 100, 60, 120);
  const name = typeof r.name === 'string' ? r.name.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 40) : '';
  if (!model || !cup || dose === null || grind === null || rpm === null || !Number.isInteger(grind) || !Array.isArray(r.pours) || r.pours.length < 1 || r.pours.length > 9) throw new Error('INVALID_INPUT');
  const pours = r.pours.map((p: Record<string, unknown>) => {
    const volume = num(p?.volume, 1, 500), temperature = num(p?.temperature, 20, 99);
    const flow_rate = num(p?.flow_rate ?? 3, 1, 4), pause_seconds = num(p?.pause_seconds ?? 5, 0, 600), pattern_code = num(p?.pattern_code ?? 2, 1, 3);
    if (volume === null || temperature === null || flow_rate === null || pause_seconds === null || pattern_code === null || !Number.isInteger(volume) || !Number.isInteger(pattern_code)) throw new Error('INVALID_INPUT');
    return { volume, temperature, flow_rate, pause_seconds: Math.round(pause_seconds), pattern_code };
  });
  const water = pours.reduce((sum, p) => sum + p.volume, 0);
  if (water < 50 || water > 500) throw new Error('INVALID_INPUT');
  return { model, cup, dose, ratio: Math.round(water / dose * 10) / 10, grind, rpm: Math.round(rpm), name, pours };
}
/** Versioned identity, including the normalized recipe name and account scope. */
export async function recipeHash(recipe: ShareRecipe, accountScope: string = ''): Promise<string> {
  const identity = { version: 2, accountScope, recipe };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(identity)));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** xBloom cloud recipe body. Booleans are 1 = on, 2 = off; grandWater is the ratio. */
export function cloudRecipe(recipe: ShareRecipe, cloudName: string, now: number): Record<string, unknown> {
  return {
    theName: cloudName, dose: recipe.dose, grandWater: recipe.ratio, grinderSize: recipe.grind, rpm: recipe.rpm,
    cupType: recipe.cup === 'xPod' ? 1 : 2, adaptedModel: recipe.model === 'Original' ? 1 : 2,
    isEnableBypassWater: 2, isSetGrinderSize: 1, theColor: '#C9D5B8', theSubsetId: 0, bypassTemp: 85, bypassVolume: 0,
    subSetType: 2, appPlace: [4], createTimeStamp: now, isShortcuts: 2,
    pourDataJSONStr: JSON.stringify(recipe.pours.map((p, i) => ({
      theName: i ? `Pour${i + 1}` : 'Bloom', volume: p.volume, temperature: p.temperature, flowRate: p.flow_rate,
      pattern: p.pattern_code, pausing: p.pause_seconds, isEnableVibrationBefore: 2, isEnableVibrationAfter: 2,
    }))),
  };
}
export const loginForm = (email: string, password: string) => ({ interfaceVersion: INTERFACE_VERSION, skey: SKEY, phoneType: 'Android', clientType: 2, languageType: 1, email, password, jpushId: '' });
export const authForm = (memberId: number, token: string) => ({ interfaceVersion: INTERFACE_VERSION, skey: SKEY, phoneType: 'Android', memberId, clientType: 2, languageType: 1, token });
export const publicForm = (id: string) => ({ tableIdOfRSA: id, interfaceVersion: PUBLIC_INTERFACE_VERSION, skey: SKEY });

/** Only a share-h5 link with a short opaque id is ever handed to the app. */
export function shareId(link: unknown): string | null {
  if (typeof link !== 'string') return null;
  try {
    const url = new URL(link);
    const id = url.searchParams.get('id');
    return url.origin + '/' === SHARE_HOST && id && /^[A-Za-z0-9+/=_-]{8,128}$/.test(id) ? id : null;
  } catch { return null; }
}
export const shareLink = (id: string) => `${SHARE_HOST}?id=${encodeURIComponent(id)}`;
/** Find a share link anywhere the cloud may put it, without trusting its shape. */
export function findShareLink(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || typeof value !== 'object') return null;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && /share/i.test(key) && shareId(item)) return item;
    const nested = typeof item === 'object' ? findShareLink(item, depth + 1) : null;
    if (nested) return nested;
  }
  return null;
}
/** The shared page must describe exactly the recipe we saved. */
export function matchesShared(detail: unknown, recipe: ShareRecipe, expectedName = recipe.name): boolean {
  const vo = (detail as { recipeVo?: Record<string, unknown> })?.recipeVo;
  if ((detail as { result?: unknown })?.result !== 'success' || !vo) return false;
  const equal = (actual: unknown, expected: unknown) =>
    typeof expected === 'number' ? (typeof actual === 'number' || (typeof actual === 'string' && actual.trim() !== '')) && Number(actual) === expected : actual === expected;
  const expected = cloudRecipe(recipe, expectedName, 0);
  for (const key of ['theName', 'dose', 'grandWater', 'grinderSize', 'rpm', 'cupType', 'adaptedModel', 'isEnableBypassWater', 'isSetGrinderSize']) {
    if (!equal(vo[key], expected[key])) return false;
  }
  let pours: unknown = vo.pourList;
  if (typeof vo.pourDataJSONStr === 'string') { try { pours = JSON.parse(vo.pourDataJSONStr); } catch { return false; } }
  const expectedPours = JSON.parse(expected.pourDataJSONStr as string) as Record<string, unknown>[];
  return Array.isArray(pours) && pours.length === expectedPours.length && pours.every((p, i) =>
    p !== null && typeof p === 'object' && Object.entries(expectedPours[i]).every(([key, value]) => equal(p[key], value)));
}
