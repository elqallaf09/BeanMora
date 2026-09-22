export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null; } catch { return null; }
}
export function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).role === 'anon';
  } catch { return false; }
}
export function numberInput(value: string): number | null {
  const normalized = value.trim().replace(/[٠-٩]/g, x => String(x.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, x => String(x.charCodeAt(0) - 1776)).replace(/٫/g, '.');
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized); return Number.isFinite(n) ? n : null;
}
export function searchText(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').toLowerCase().trim();
}
