import { describe, expect, it } from 'vitest';
import { safeNextPath } from '../safe-next-path';

describe('post-auth destination', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'https://outside.invalid',
    '//outside.invalid',
    '/\\outside.invalid',
    '/%5coutside.invalid',
    '/%2foutside.invalid',
    '/%255coutside.invalid',
    '/\t/outside.invalid',
    '/a/..//outside.invalid',
    '/../\\outside.invalid',
    ' /home',
    '../home',
  ])('rejects %s', (value) =>
    expect(safeNextPath(value, '/ar/home')).toBe('/ar/home'),
  );
  it.each([
    '/home',
    '/ar/recipes?method=v60#details',
    '/en/saved',
    '/recipes?q=%D9%82%D9%87%D9%88%D8%A9',
  ])('keeps internal destination %s', (value) =>
    expect(safeNextPath(value)).toBe(value),
  );
  it('falls back for missing input', () =>
    expect(safeNextPath(null)).toBe('/home'));
});
