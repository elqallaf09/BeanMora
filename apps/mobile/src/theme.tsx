import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ColorValue } from 'react-native';

export type Appearance = 'light' | 'dark' | 'system';
const Theme = createContext({ dark: false, ready: false, appearance: 'system' as Appearance, setAppearance: (_value: Appearance) => {}, saveError: false });
export const useTheme = () => useContext(Theme);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [appearance, update] = useState<Appearance>('system');
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem('beanmora-appearance').then(value => {
      if (active && !changed.current && (value === 'dark' || value === 'light' || value === 'system')) update(value);
    }).catch(() => { if (active) setSaveError(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const setAppearance = (value: Appearance) => {
    changed.current = true;
    update(value);
    setSaveError(false);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem('beanmora-appearance', value)).catch(() => setSaveError(true));
  };
  return <Theme.Provider value={{ appearance, setAppearance, ready, saveError, dark: appearance === 'dark' || (appearance === 'system' && system === 'dark') }}>{children}</Theme.Provider>;
}

function rgb(value: string): number[] | null {
  const hex = value.replace(/^#/, '');
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}
/** Adapt legacy catalog colors at the native primitive boundary. Images are never tinted. */
export function themeColor(value: ColorValue | undefined, dark: boolean, kind: 'text' | 'background' | 'border' = 'text'): ColorValue | undefined {
  if (!dark || typeof value !== 'string') return value;
  const channels = rgb(value);
  if (!channels) return value;
  const [r, g, b] = channels;
  const lightness = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  if (kind === 'border') return lightness > 0.5 ? '#514337' : '#806B58';
  if (kind === 'background') {
    const exact: Record<string, string> = { '#F7F2E9': '#15120F', '#FFFCF6': '#201B17', '#EFE6D9': '#302720', '#3B2417': '#704A30', '#2B1D14': '#38271E' };
    return exact[value.toUpperCase()] ?? (lightness > 0.8 ? '#29221C' : lightness > 0.6 ? '#3B3026' : value);
  }
  const ink: Record<string, string> = { '#2B1D14': '#F7EADB', '#3B2417': '#F7EADB', '#796958': '#CDBBA7', '#B76C35': '#E9B989', '#167B7F': '#8DD3BE' };
  if (ink[value.toUpperCase()]) return ink[value.toUpperCase()];
  if (lightness > 0.72) return value;
  if (r > g * 1.5 && r > b * 1.4) return '#FFABA0';
  if (g > r * 1.2) return '#8DD3BE';
  return lightness < 0.32 ? '#F7EADB' : '#CDBBA7';
}
export function themedStyle<T>(style: T, dark: boolean): T {
  if (!dark || !style) return style;
  if (Array.isArray(style)) return style.map(item => themedStyle(item, dark)) as T;
  const flat = typeof style === 'number' ? StyleSheet.flatten(style) : style;
  if (!flat || typeof flat !== 'object') return style;
  const result = { ...flat } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const kind = key === 'backgroundColor' ? 'background' : /^border.*Color$/.test(key) ? 'border' : key === 'color' || key === 'textDecorationColor' ? 'text' : null;
    if (kind) result[key] = themeColor(result[key] as ColorValue, dark, kind);
  }
  return result as T;
}
