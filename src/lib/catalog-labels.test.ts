// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cleanCatalogName, sourceRoasterName } from '../../apps/mobile/src/localizedContent';

describe('catalog labels', () => {
  it('drops reviewer markers from names', () => {
    expect(cleanCatalogName('لوس تشيلازوس (غير مؤكد)')).toBe('لوس تشيلازوس');
    expect(cleanCatalogName('بنما فينكا كوتوا لوت 26-4320 (اسم غير مؤكد)')).toBe('بنما فينكا كوتوا لوت 26-4320');
    expect(cleanCatalogName('ريتشوال — هاريو V60 (25غ / 380غ) [ترجمة غير مؤكدة]')).toBe('ريتشوال — هاريو V60 (25غ / 380غ)');
    expect(cleanCatalogName('بيتس كوفي — بور أوفر (غير مؤكد الترجمة)')).toBe('بيتس كوفي — بور أوفر');
    expect(cleanCatalogName('البرازيل (Wings Coffee Doha -- ترجمة صوتية)')).toBe('البرازيل');
  });
  it('keeps brackets that are part of the name', () => {
    expect(cleanCatalogName('Chalatenango (Natural)')).toBe('Chalatenango (Natural)');
    expect(cleanCatalogName('هاريو V60 (25غ / 380غ)')).toBe('هاريو V60 (25غ / 380غ)');
    expect(cleanCatalogName(null)).toBe('');
  });
  it('reads the roaster name out of a provenance line', () => {
    expect(sourceRoasterName('Sweet Bloom Coffee — official product page (fetched 2026-11-07)')).toBe('Sweet Bloom Coffee');
    expect(sourceRoasterName('Falcon Coffee Roasters - product page (fetched 2026-10-13)')).toBe('Falcon Coffee Roasters');
    expect(sourceRoasterName('Doha Roastery — official product page')).toBe('Doha Roastery');
    expect(sourceRoasterName('Some Roaster — product listing')).toBe('Some Roaster');
    expect(sourceRoasterName('The Coffee Sheep (thecoffeesheep.com)')).toBe('The Coffee Sheep');
    expect(sourceRoasterName('Methodical Coffee')).toBe('Methodical Coffee');
  });
});
