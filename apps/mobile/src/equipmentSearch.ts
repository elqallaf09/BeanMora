import { normalizeSearch } from './core/deepSearch';

// Members type a model the way they say it: "بروفيتك برو 700", "profitec pro700",
// Arabic-Indic digits, or a slightly different transliteration. Matching the
// whole query as one substring hid models the catalog does have.
const digits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

export function equipmentSearchKey(value: string): string {
  return digits(normalizeSearch(value))
    // "pro700" and "pro 700" are the same request.
    .replace(/(\p{L})(\d)/gu, '$1 $2')
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Arabic transliterations of brand names differ mostly in long vowels
// (بروفيتك / بروفيتيك). Comparing the consonant skeleton accepts both.
const arabic = /\p{Script=Arabic}/u;
const skeleton = (value: string) => value.replace(/[اوي]/g, '');

const fits = (word: string, token: string) =>
  word.startsWith(token) ||
  (token.length >= 4 && word.includes(token)) ||
  (arabic.test(token) && skeleton(token).length >= 4 && skeleton(word).startsWith(skeleton(token)));

// Each query word claims its own word of the model text, longest first, so
// "برو" cannot be satisfied by the start of "بروفيتك" a second time.
function matched(text: string, tokens: readonly string[]): string[] {
  // The brand is usually repeated inside the model name; count it once.
  const free = [...new Set(text.split(' '))];
  return [...tokens]
    .sort((x, y) => y.length - x.length)
    .filter((token) => {
      const at = free.findIndex((word) => fits(word, token));
      if (at < 0) return false;
      free.splice(at, 1);
      return true;
    });
}

export type EquipmentSearchResult<T> = {
  rows: T[];
  /** True when nothing matched every word and the rows are the closest models instead. */
  nearest: boolean;
};

export function searchEquipment<T>(
  rows: readonly T[],
  text: (row: T) => string,
  query: string,
): EquipmentSearchResult<T> {
  const tokens = [...new Set(equipmentSearchKey(query).split(' ').filter(Boolean))];
  if (!tokens.length) return { rows: [...rows], nearest: false };
  const scored = rows.map((row) => {
    const hits = matched(equipmentSearchKey(text(row)), tokens);
    return { row, hits: hits.length, words: hits.filter((token) => /\p{L}/u.test(token)).length };
  });
  const exact = scored.filter((item) => item.hits === tokens.length);
  if (exact.length) return { rows: exact.map((item) => item.row), nearest: false };
  // A bare number ("700") matching another brand's model is not a near match;
  // at least one word of the name or brand has to agree.
  const best = Math.max(0, ...scored.map((item) => (item.words ? item.hits : 0)));
  if (!best) return { rows: [], nearest: false };
  return {
    rows: scored.filter((item) => item.words && item.hits === best).map((item) => item.row),
    nearest: true,
  };
}
