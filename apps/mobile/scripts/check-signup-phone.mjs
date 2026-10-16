import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/signupPhone.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { countryCallingCode, splitSignupPhone, signupPhoneFromInput, changeSignupPhoneCountry, signupPhoneValue } =
  await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('country selection supplies real GCC, international and shared calling codes', () => {
  for (const [country, expected] of Object.entries({ KW: '+965', SA: '+966', AE: '+971', BH: '+973', QA: '+974', OM: '+968', EG: '+20', JP: '+81', FR: '+33', IT: '+39', ES: '+34', BR: '+55', CN: '+86', US: '+1', CA: '+1', GB: '+44', AX: '+358', VA: '+39' })) {
    assert.equal(countryCallingCode(country), expected);
    assert.deepEqual(splitSignupPhone('', country), { callingCode: expected, number: '' });
  }
});
test('country lookup is case insensitive and never invents codes', () => {
  assert.equal(countryCallingCode(' kw '), '+965');
  for (const country of ['', 'ZZ', '__proto__', 'AQ', 'BV', 'GS', 'HM', 'PN', 'TF', 'UM']) {
    assert.equal(countryCallingCode(country), '');
  }
});
test('a visible prefix never makes the optional phone required', () => {
  for (const country of ['KW', 'SA', 'JP', 'US', 'AQ', '']) {
    assert.equal(signupPhoneValue('', country), '');
    assert.equal(signupPhoneValue('  ', country), '');
    assert.equal(changeSignupPhoneCountry('', 'KW', country), '');
    assert.equal(signupPhoneFromInput('', countryCallingCode(country)), '');
  }
});
test('country changes replace the code but retain the subscriber digits', () => {
  assert.equal(changeSignupPhoneCountry('+96550000000', 'KW', 'SA'), '+96650000000');
  assert.equal(changeSignupPhoneCountry('+96650000000', 'SA', 'AE'), '+97150000000');
  assert.equal(changeSignupPhoneCountry('50000000', '', 'KW'), '+96550000000');
  assert.equal(changeSignupPhoneCountry('+96550000000', 'KW', 'KW'), '+96550000000');
});
test('typing national significant digits composes a full value once', () => {
  assert.equal(signupPhoneFromInput('50000000', '+965'), '+96550000000');
  assert.equal(signupPhoneValue('50000000', 'KW'), '+96550000000');
  assert.deepEqual(splitSignupPhone('+96550000000', 'KW'), { callingCode: '+965', number: '50000000' });
});
test('paste and autofill do not duplicate an international calling code', () => {
  for (const value of ['+96550000000', '0096550000000', '+965 (5000) 0000', '\u2066+96550000000\u2069']) {
    assert.equal(signupPhoneFromInput(value, '+965'), '+96550000000');
    assert.equal(signupPhoneValue(value, 'KW'), '+96550000000');
  }
});
test('a foreign phone is allowed without changing profile country', () => {
  assert.deepEqual(splitSignupPhone('+447700900123', 'KW'), { callingCode: '+44', number: '7700900123' });
  assert.equal(signupPhoneValue('+447700900123', 'KW'), '+447700900123');
  assert.equal(signupPhoneValue('+16502530000', 'KW'), '+16502530000');
});
test('Arabic, Persian and full-width digits become English digits', () => {
  for (const value of ['٥٠٠٠٠٠٠٠', '۵۰۰۰۰۰۰۰', '５０００００００']) {
    assert.equal(signupPhoneFromInput(value, '+965'), '+96550000000');
  }
  assert.equal(signupPhoneValue('٠٠٩٦٥٥٠٠٠٠٠٠٠', 'KW'), '+96550000000');
});
test('clearing the number or pasting only the prefix leaves an optional empty value', () => {
  assert.equal(signupPhoneFromInput('', '+965'), '');
  assert.equal(signupPhoneValue('+965', 'KW'), '');
  assert.equal(signupPhoneValue('00965', 'KW'), '');
  assert.equal(changeSignupPhoneCountry('+965', 'KW', 'SA'), '');
});
test('regions without one assigned calling code keep explicit international entry', () => {
  assert.deepEqual(splitSignupPhone('', 'AQ'), { callingCode: '', number: '' });
  assert.equal(signupPhoneValue('+96550000000', 'AQ'), '+96550000000');
  assert.equal(changeSignupPhoneCountry('+96550000000', 'KW', 'AQ'), '+96550000000');
});
test('invalid characters remain available to the existing validator and significant zeros are retained', () => {
  assert.equal(signupPhoneValue('not-a-number', 'KW'), '+965notanumber');
  assert.equal(signupPhoneValue('+99912345678', 'KW'), '+99912345678');
  assert.equal(signupPhoneValue('0612345678', 'IT'), '+390612345678');
});
test('the prefix is a separate visible element with LTR phone input and normal autofill', () => {
  const field = readFileSync(new URL('../src/SignupPhoneField.tsx', import.meta.url), 'utf8');
  assert.match(field, /testID="signup-phone-prefix"/);
  assert.match(field, /value=\{number\}/);
  assert.match(field, /writingDirection: 'ltr'/);
  assert.match(field, /direction: 'ltr'/);
  assert.match(field, /autoComplete="tel"/);
  assert.match(field, /editable=\{editable\}/);
});
