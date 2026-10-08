import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mobileRoot, verifyPatchedFiles } from './tooling-security-patches.mjs';

export function testKeyPair(forge) {
  // Ephemeral test-only key. Exponent 3 exercises the affected low-exponent path.
  const pem = generateKeyPairSync('rsa', {
    modulusLength: 2048, publicExponent: 3,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey: forge.pki.privateKeyFromPem(pem.privateKey), publicKey: forge.pki.publicKeyFromPem(pem.publicKey) };
}

export function digestInfo(forge, hash, algorithm, parameters, extra = []) {
  const { asn1 } = forge;
  const node = (type, value, constructed = false) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  const children = [node(asn1.Type.OID, asn1.oidToDer(forge.pki.oids[algorithm]).getBytes())];
  if (parameters) children.push(node(asn1.Type.NULL, ''));
  children.push(...extra.map(value => node(asn1.Type.OCTETSTRING, value)));
  return asn1.toDer(node(asn1.Type.SEQUENCE, [
    node(asn1.Type.SEQUENCE, children, true), node(asn1.Type.OCTETSTRING, hash),
  ], true)).getBytes();
}

export function checkMalformedDigestInfo(forge, keys = testKeyPair(forge)) {
  const hash = forge.md.sha256.create().update('BeanMora security regression').digest().getBytes();
  for (const parameters of [false, true]) for (const extra of [['garbage'], ['one', 'two']]) {
    // Proper PKCS#1 padding, deliberately malformed nested AlgorithmIdentifier.
    const signature = keys.privateKey.sign(digestInfo(forge, hash, 'sha256', parameters, extra), 'NONE');
    assert.throws(() => keys.publicKey.verify(hash, signature), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
  }
}

export function checkUpstreamForgeVector(forge) {
  const vector = JSON.parse(readFileSync(new URL('../patches/node-forge/regression.json', import.meta.url), 'utf8'));
  const publicKey = forge.pki.rsa.setPublicKey(new forge.jsbn.BigInteger(vector.modulus, 16), new forge.jsbn.BigInteger(vector.exponent));
  const hash = forge.md.sha256.create().update(vector.message).digest().getBytes();
  // The upstream vector isolates ASN.1 validation by bypassing padding checks.
  // checkMalformedDigestInfo above additionally uses the normal padded verifier.
  assert.throws(() => publicKey.verify(hash, forge.util.hexToBytes(vector.signature), undefined, {
    _skipPaddingChecks: true,
  }), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
}

export function checkValidSignatures(forge, keys = testKeyPair(forge)) {
  for (const algorithm of ['sha1', 'sha256', 'sha384', 'sha512']) {
    const hash = forge.md[algorithm].create().update('Valid signature').digest().getBytes();
    for (const parameters of [false, true]) {
      const signature = keys.privateKey.sign(digestInfo(forge, hash, algorithm, parameters), 'NONE');
      assert.equal(keys.publicKey.verify(hash, signature), true);
      assert.equal(keys.publicKey.verify('x'.repeat(hash.length), signature), false);
    }
  }
  const encrypted = keys.publicKey.encrypt('RSA compatibility');
  assert.equal(keys.privateKey.decrypt(encrypted), 'RSA compatibility');
  const pss = () => forge.pss.create({ md: forge.md.sha256.create(), mgf: forge.mgf.mgf1.create(forge.md.sha256.create()), saltLength: 32 });
  const md = forge.md.sha256.create().update('RSA PSS compatibility');
  const signature = keys.privateKey.sign(md, pss());
  assert.equal(keys.publicKey.verify(md.digest().getBytes(), signature, pss()), true);
}

export function checkExpoSigning(forge, signing, keys = testKeyPair(forge)) {
  const now = Date.now();
  const certificate = signing.generateSelfSignedCodeSigningCertificate({
    keyPair: keys, validityNotBefore: new Date(now - 60000), validityNotAfter: new Date(now + 60000),
    commonName: 'BeanMora isolated regression certificate',
  });
  const parsed = signing.convertCertificatePEMToCertificate(signing.convertCertificateToCertificatePEM(certificate));
  signing.validateSelfSignedCertificate(parsed, keys);
  assert.ok(signing.signBufferRSASHA256AndVerify(keys.privateKey, parsed, Buffer.from('Expo manifest fixture')));
  assert.equal(signing.generateCSR(keys, 'BeanMora regression CSR').verify(), true);
  const hash = certificate.md.digest().getBytes();
  certificate.signature = keys.privateKey.sign(digestInfo(forge, hash, 'sha256', true, ['extra algorithm child']), 'NONE');
  assert.throws(() => signing.validateSelfSignedCertificate(certificate, keys), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
}

export function nestedAst(depth) {
  let ast = { type: 'root', nodes: [] };
  for (let i = 0; i < depth; i++) ast = { type: 'root', nodes: [ast] };
  return ast;
}

export const depthError = error => error instanceof SyntaxError && /nesting depth exceeds/.test(error.message);

export function checkDeepString(packagePath, operation, delimiter = '{') {
  const source = `
    const braces = require(process.argv[1]);
    const operation = process.argv[2];
    const delimiter = process.argv[3];
    const pattern = delimiter.repeat(4000) + 'x' + (delimiter === '{' ? '}' : ')').repeat(4000);
    try {
      operation === 'default' ? braces(pattern) : braces[operation](pattern);
      process.stdout.write(JSON.stringify({ name: 'accepted' }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ name: error.name, message: error.message }));
    }
  `;
  const result = JSON.parse(execFileSync(process.execPath, ['--stack_size=512', '-e', source, packagePath, operation, delimiter], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 65536,
  }));
  assert.equal(result.name, 'SyntaxError', `${operation} must reject excessive nesting without stack exhaustion`);
  assert.match(result.message, /nesting depth exceeds/);
}

export function checkAstDepth(braces, operation) {
  assert.throws(() => braces[operation](nestedAst(4000)), depthError);
  assert.deepEqual(braces[operation](nestedAst(100)), operation === 'expand' ? [] : '');
  assert.throws(() => braces[operation](nestedAst(101)), depthError);
}

export function checkOrdinaryGlobs(braces, micromatch) {
  const pattern = '{'.repeat(99) + 'x' + '}'.repeat(99);
  assert.equal(braces.stringify(pattern), pattern);
  assert.deepEqual(braces.expand(pattern), [pattern]);
  assert.equal(braces.compile('app/{reading,writing}/**/*.{js,jsx}'), 'app/(reading|writing)/**/*.(js|jsx)');
  assert.deepEqual(braces.expand('page-{1..3}.js'), ['page-1.js', 'page-2.js', 'page-3.js']);
  assert.deepEqual(braces.expand('a\\{b,c\\}'), ['a{b,c}']);
  assert.equal(braces.compile(braces.parse('a/{b,c}/d')), 'a/(b|c)/d');
  assert.deepEqual(micromatch(['app/read/index.js', 'app/write/form.jsx', 'app/read/icon.png'], 'app/{read,write}/**/*.{js,jsx}'),
    ['app/read/index.js', 'app/write/form.jsx']);
  const deep = '{'.repeat(4000) + 'x' + '}'.repeat(4000);
  assert.throws(() => micromatch.braces(deep), depthError);
  assert.throws(() => micromatch.braceExpand(deep), depthError);
}

export function verifySecurityBackports(root = mobileRoot) {
  const backports = verifyPatchedFiles(root);
  const require = createRequire(join(root, 'package.json'));
  const forge = require('node-forge'), braces = require('braces');
  const keys = testKeyPair(forge);
  checkMalformedDigestInfo(forge, keys);
  checkUpstreamForgeVector(forge);
  checkValidSignatures(forge, keys);
  checkExpoSigning(forge, require('@expo/code-signing-certificates'), keys);
  for (const operation of ['parse', 'compile', 'expand', 'stringify', 'default']) {
    for (const delimiter of ['{', '(']) checkDeepString(require.resolve('braces'), operation, delimiter);
  }
  for (const operation of ['compile', 'expand', 'stringify']) checkAstDepth(braces, operation);
  checkOrdinaryGlobs(braces, require('micromatch'));
  return backports.map(p => ({ ...p, verified: true }));
}
