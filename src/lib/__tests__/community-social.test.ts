import { describe, expect, it } from 'vitest';
import { socialMediaType } from '../community-social';
import { voiceDuration } from '../../../supabase/functions/verify-direct-audio/duration';

const u32 = (number: number) => { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, number); return bytes; };
const concat = (...pieces: Uint8Array[]) => { const bytes = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of pieces) { bytes.set(p, at); at += p.length; } return bytes; };
const box = (kind: string, ...data: Uint8Array[]) => { const body = concat(...data); return concat(u32(body.length + 8), new TextEncoder().encode(kind), body); };
function movie(seconds: number, trackSeconds = seconds) {
  const head = (time: number) => concat(new Uint8Array(12), u32(48000), u32(time * 48000));
  const samples = Math.max(1, Math.floor(trackSeconds * 48000 / 1024));
  const entry = new Uint8Array(36); entry.set(u32(36)); entry.set(new TextEncoder().encode('mp4a'), 4); entry.set(u32(48000 * 65536), 32);
  const track = box('trak', box('mdia', box('mdhd', head(trackSeconds)), box('hdlr', new Uint8Array(8), new TextEncoder().encode('soun')), box('minf', box('stbl', box('stts', new Uint8Array(4), u32(1), u32(samples), u32(1024)), box('stsd', new Uint8Array(4), u32(1), entry)))));
  return concat(box('ftyp', new TextEncoder().encode('M4A ')), box('moov', box('mvhd', head(seconds)), track));
}
function ebml(id: number[], body: Uint8Array) {
  let size = 1; while (body.length >= 2 ** (size * 7) - 1) size++;
  const length = new Uint8Array(size); let n = body.length; for (let i = size - 1; i >= 0; i--) { length[i] = n & 255; n = Math.floor(n / 256); } length[0] |= 1 << (8 - size);
  return concat(new Uint8Array(id), length, body);
}
function webm(time: number, repeatedPackets = 1) {
  const tracks = ebml([0x16, 0x54, 0xae, 0x6b], ebml([0xae], concat(ebml([0xd7], new Uint8Array([1])), ebml([0x83], new Uint8Array([2])), ebml([0x86], new TextEncoder().encode('A_OPUS')))));
  const packet = ebml([0xa3], new Uint8Array([0x81, 0x00, 0x00, 0x80, 0xf8, 0x00]));
  const cluster = ebml([0x1f, 0x43, 0xb6, 0x75], concat(ebml([0xe7], new Uint8Array([time >> 8, time & 255])), ...Array.from({ length: repeatedPackets }, () => packet)));
  return concat(ebml([0x1a, 0x45, 0xdf, 0xa3], new Uint8Array([1])), tracks, cluster);
}
describe('actual voice container limits', () => {
  it.each([1, 12.5, 59.5, 60])('allows an MP4 voice of %s seconds', seconds => expect(voiceDuration(movie(seconds))).toBe(seconds));
  it('rejects audio longer than a minute despite a shorter client declaration', () => expect(() => voiceDuration(movie(61))).toThrow('VOICE_LIMIT'));
  it('rejects zero duration', () => expect(() => voiceDuration(movie(0).slice(0, 24))).toThrow());
  it('checks the actual AAC track when movie metadata falsely declares a short duration', () => expect(() => voiceDuration(movie(10, 61))).toThrow('VOICE_LIMIT'));
  it('counts Opus packet duration even with falsified repeated timestamps', () => expect(() => voiceDuration(webm(0, 3050))).toThrow('VOICE_LIMIT'));
  it('rejects MP4 containers without an audio track', () => expect(() => voiceDuration(box('ftyp', new Uint8Array(16)))).toThrow('VOICE_FORMAT'));
  it('rejects truncated or malformed MP4', () => expect(() => voiceDuration(movie(15).slice(0, 50))).toThrow('VOICE_FORMAT'));
  it('reads web recorder block timestamps even when Duration is absent', () => expect(voiceDuration(webm(59500))).toBe(59.62));
  it('rejects long WebM packets regardless of missing Duration metadata', () => expect(() => voiceDuration(webm(61000))).toThrow('VOICE_LIMIT'));
  it('rejects unknown content', () => expect(() => voiceDuration(new Uint8Array(40))).toThrow('VOICE_FORMAT'));
  it('rejects oversized uploads before parsing', () => expect(() => voiceDuration(new Uint8Array(8388609))).toThrow('VOICE_SIZE'));
});
describe('community upload formats', () => {
  it('requires an MP4 or WebM video header rather than trusting the extension', () => expect(() => socialMediaType(new Uint8Array(30), 'video')).toThrow('MEDIA_FORMAT'));
  it('recognizes MP4 bytes', () => expect(socialMediaType(movie(1), 'video')).toEqual({ mime: 'video/mp4', extension: 'mp4' }));
  it('recognizes WebM bytes', () => expect(socialMediaType(webm(100), 'video')).toEqual({ mime: 'video/webm', extension: 'webm' }));
});
