/** What a member places on a story: text and coffee stickers. Positions are the
 * item's centre as a fraction of the story frame, so they survive any screen. */
export type StoryText = { kind: 'text'; text: string; x: number; y: number; size: 's' | 'm' | 'l'; color: string; plate: boolean };
export type StorySticker = { kind: 'sticker'; ref: 'recipe' | 'coffee' | 'roaster'; id: string; label: string; x: number; y: number };
export type StoryItem = StoryText | StorySticker;
export type StoryOverlays = { v: 1; bg?: string; items: StoryItem[] };

export const STORY_COLORS = ['#FFFFFF', '#1B1410', '#167B7F', '#B76C35', '#E9B949', '#C2453C', '#7B4B94', '#2F6DB5'] as const;
export const STORY_BACKGROUNDS = ['#167B7F', '#3B2417', '#B76C35', '#1B1410', '#7B4B94', '#2F6DB5', '#C2453C', '#5E7F4B'] as const;
export const STORY_TEXT_SIZES = { s: 18, m: 26, l: 38 } as const;
export const MAX_STORY_ITEMS = 8;
export const MAX_STORY_TEXT = 160;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unit = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(0.97, Math.max(0.03, value)) : fallback;

/** Overlays come from other members through the database, so every field is
 * checked before it is drawn; anything unexpected is dropped, never rendered. */
export function parseStoryOverlays(value: unknown): StoryOverlays | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as { v?: unknown; bg?: unknown; items?: unknown };
  if (raw.v !== 1) return null;
  const items: StoryItem[] = [];
  for (const entry of Array.isArray(raw.items) ? raw.items.slice(0, MAX_STORY_ITEMS) : []) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const x = unit(item.x, 0.5), y = unit(item.y, 0.5);
    if (item.kind === 'text' && typeof item.text === 'string' && item.text.trim()) {
      items.push({
        kind: 'text', text: item.text.trim().slice(0, MAX_STORY_TEXT), x, y,
        size: item.size === 's' || item.size === 'l' ? item.size : 'm',
        color: typeof item.color === 'string' && HEX.test(item.color) ? item.color : '#FFFFFF',
        plate: item.plate === true,
      });
    } else if (item.kind === 'sticker' && (item.ref === 'recipe' || item.ref === 'coffee' || item.ref === 'roaster')
      && typeof item.id === 'string' && UUID.test(item.id) && typeof item.label === 'string' && item.label.trim()) {
      items.push({ kind: 'sticker', ref: item.ref, id: item.id, label: item.label.trim().slice(0, 80), x, y });
    }
  }
  const bg = typeof raw.bg === 'string' && HEX.test(raw.bg) ? raw.bg : undefined;
  return items.length || bg ? { v: 1, ...(bg ? { bg } : {}), items } : null;
}

/** Stored form: null when there is nothing to draw. */
export function storyOverlaysPayload(overlays: StoryOverlays | null | undefined): StoryOverlays | null {
  return parseStoryOverlays(overlays ?? null);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0;
  for (const byte of bytes) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function chunk(type: string, data: number[]): number[] {
  const body = [...type].map((c) => c.charCodeAt(0)).concat(data);
  return [...be32(data.length), ...body, ...be32(crc32(Uint8Array.from(body)))];
}

/** A text-only story still needs a media file. This is a 2x2 PNG of one colour:
 * a few dozen bytes, and older builds that ignore overlays show that colour. */
export function solidPng(hex: string): Uint8Array {
  const colour = HEX.test(hex) ? hex : '#167B7F';
  const rgb = [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16));
  const raw = [0, ...rgb, ...rgb, 0, ...rgb, ...rgb]; // two rows: filter byte + two pixels
  const stored = [0x01, raw.length & 255, raw.length >> 8, ~raw.length & 255, (~raw.length >> 8) & 255, ...raw];
  const zlib = [0x78, 0x01, ...stored, ...be32(adler32(Uint8Array.from(raw)))];
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', [...be32(2), ...be32(2), 8, 2, 0, 0, 0]),
    ...chunk('IDAT', zlib),
    ...chunk('IEND', []),
  ]);
}
