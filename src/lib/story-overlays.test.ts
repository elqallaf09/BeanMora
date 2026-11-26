// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { parseStoryOverlays, solidPng, MAX_STORY_ITEMS } from '../../apps/mobile/src/storyOverlays';

const id = '11111111-2222-4333-8444-555555555555';

describe('story overlays', () => {
  it('keeps valid text and stickers and clamps positions into the frame', () => {
    const parsed = parseStoryOverlays({ v: 1, bg: '#167B7F', items: [
      { kind: 'text', text: '  قهوة الصبح  ', x: 2, y: -1, size: 'l', color: '#ffffff', plate: true },
      { kind: 'sticker', ref: 'recipe', id, label: 'V60', x: 0.4, y: 0.6 },
    ] });
    expect(parsed).toEqual({ v: 1, bg: '#167B7F', items: [
      { kind: 'text', text: 'قهوة الصبح', x: 0.97, y: 0.03, size: 'l', color: '#ffffff', plate: true },
      { kind: 'sticker', ref: 'recipe', id, label: 'V60', x: 0.4, y: 0.6 },
    ] });
  });
  it('drops anything it does not recognise instead of drawing it', () => {
    expect(parseStoryOverlays({ v: 2, items: [{ kind: 'text', text: 'x' }] })).toBeNull();
    expect(parseStoryOverlays('[]')).toBeNull();
    expect(parseStoryOverlays({ v: 1, items: [
      { kind: 'sticker', ref: 'recipe', id: 'not-a-uuid', label: 'x' },
      { kind: 'sticker', ref: 'link', id, label: 'x' },
      { kind: 'text', text: '   ' },
      { kind: 'image', url: 'https://example.com/a.png' },
    ] })).toBeNull();
    const text = parseStoryOverlays({ v: 1, bg: 'red', items: [{ kind: 'text', text: 'a'.repeat(500), color: 'javascript:1', size: 'huge' }] });
    expect(text?.bg).toBeUndefined();
    expect(text?.items[0]).toMatchObject({ color: '#FFFFFF', size: 'm', plate: false, x: 0.5, y: 0.5 });
    expect((text?.items[0] as { text: string }).text).toHaveLength(160);
  });
  it('limits how many items one story can carry', () => {
    const items = Array.from({ length: 30 }, (_, n) => ({ kind: 'text', text: 't' + n }));
    expect(parseStoryOverlays({ v: 1, items })?.items).toHaveLength(MAX_STORY_ITEMS);
  });
  it('builds a real PNG of the chosen colour for text-only stories', () => {
    const png = solidPng('#167B7F');
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const idat = png.indexOf(0x49, 33); // 'I' of IDAT after IHDR
    expect(String.fromCharCode(...png.slice(idat, idat + 4))).toBe('IDAT');
    const length = (png[idat - 4] << 24) | (png[idat - 3] << 16) | (png[idat - 2] << 8) | png[idat - 1];
    const pixels = inflateSync(Buffer.from(png.slice(idat + 4, idat + 4 + length)));
    expect([...pixels]).toEqual([0, 0x16, 0x7b, 0x7f, 0x16, 0x7b, 0x7f, 0, 0x16, 0x7b, 0x7f, 0x16, 0x7b, 0x7f]);
    expect(png.length).toBeLessThan(120);
  });
});
