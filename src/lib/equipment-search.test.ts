// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { equipmentSearchKey, searchEquipment } from '../../apps/mobile/src/equipmentSearch';

const rows = [
  'بروفيتك برو 300 Profitec PRO 300 Profitec ماكينة إسبريسو',
  'بروفيتك برو 400 Profitec PRO 400 Profitec ماكينة إسبريسو',
  'بروفيتك برو 800 Profitec PRO 800 Profitec ماكينة إسبريسو',
  'بروفيتك غو Profitec GO 2.0 Profitec ماكينة إسبريسو',
  'بريفيل باريستا برو Breville Barista Pro Breville ماكينة إسبريسو',
  'روكيت Rocket R 700 Rocket Espresso ماكينة إسبريسو',
  'كوماندانتي C40 Comandante C40 Comandante طاحونة',
];
const find = (query: string) => searchEquipment(rows, (row) => row, query);

describe('equipment search', () => {
  it('matches every word in any order instead of one exact phrase', () => {
    expect(find('برو 400 بروفيتك')).toEqual({ rows: [rows[1]], nearest: false });
    expect(find('pro profitec').rows).toEqual(rows.slice(0, 3));
  });
  it('reads Arabic-Indic digits and glued model numbers', () => {
    expect(find('بروفيتك برو ٤٠٠').rows).toEqual([rows[1]]);
    expect(find('profitec pro400').rows).toEqual([rows[1]]);
    expect(equipmentSearchKey('PRO800')).toBe('pro 800');
  });
  it('accepts a different Arabic transliteration of the brand', () => {
    expect(find('بروفيتيك برو 800').rows).toEqual([rows[2]]);
    expect(find('كومندانتي').rows).toEqual([rows[6]]);
  });
  it('offers the closest models when the exact model is not in the catalog', () => {
    expect(find('بروفيتك برو 700')).toEqual({ rows: rows.slice(0, 3), nearest: true });
  });
  it('does not treat a bare number or an unknown name as a near match', () => {
    expect(find('700 xyz')).toEqual({ rows: [], nearest: false });
    expect(find('لا يوجد')).toEqual({ rows: [], nearest: false });
  });
  it('returns everything for an empty query', () => {
    expect(find('  ').rows).toHaveLength(rows.length);
  });
});
