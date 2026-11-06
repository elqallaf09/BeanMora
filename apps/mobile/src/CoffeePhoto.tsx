import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from './native';
import type { CoffeeImageKind } from './data';
import { colors, Txt, useLabels } from './ui';
import { useContentMedia } from './useContentMedia';
import { catalogPhotoSource } from './catalogPhotoSource';

export function CoffeePhoto({ uri, uris = [], kind = 'unclassified', fallback }: {
  uri?: string | null; uris?: string[]; kind?: CoffeeImageKind;
  seed?: string; detail?: boolean; fallback?: ReactNode;
}) {
  const candidates = [...new Set([uri, ...uris].filter((value): value is string => !!value))];
  // A new product starts from its first image without showing the old one.
  return <PhotoAttempt key={JSON.stringify(candidates)} candidates={candidates} kind={kind} fallback={fallback} />;
}

function PhotoAttempt({ candidates, kind, fallback }: {
  candidates: string[]; kind: CoffeeImageKind; fallback?: ReactNode;
}) {
  const L = useLabels();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<string | null>(null);
  const candidate = candidates[attempt] ?? null;
  const current = useContentMedia(candidate);
  useEffect(() => {
    if (!candidate || (current && loaded === current)) return;
    // Covers signing failures as well as images that never emit onError.
    const timer = setTimeout(() => setAttempt(n => n === attempt ? n + 1 : n), 12000);
    return () => clearTimeout(timer);
  }, [candidate, current, loaded, attempt]);
  const ready = !!current && loaded === current;
  const label = kind === 'origin_photo' ? L('صورة منشأ البن', 'Coffee origin photo')
    : kind === 'product_artwork' ? L('صورة المنتج من المحمصة', 'Roaster product artwork')
      : L('صورة عبوة البن', 'Coffee product photo');
  return <View style={{ flex: 1, width: '100%', minHeight: 80, overflow: 'hidden', backgroundColor: colors.chip }}>
    {!ready ? (fallback ?? <View testID="coffee-photo-unavailable" style={StyleSheet.absoluteFill}>
      <Image testID="coffee-fallback-art" source={require('../assets/images/coffee-bag.jpg')} resizeMode="cover"
        accessibilityLabel={L('صورة توضيحية · BeanMora', 'Illustration · BeanMora')}
        style={{ width: '100%', height: '100%' }} />
      <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#FFF6E7E8', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Txt style={{ fontSize: 10, lineHeight: 14 }}>{L('صورة توضيحية · BeanMora', 'Illustration · BeanMora')}</Txt>
      </View>
    </View>) : null}
    {current ? <Image key={current} testID="coffee-product-photo" accessibilityLabel={label}
      source={catalogPhotoSource(current)} resizeMode="contain"
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: ready ? 1 : 0 }]}
      onLoad={() => setLoaded(current)} onError={() => setAttempt(n => n === attempt ? n + 1 : n)} /> : null}
    {candidate && !ready ? <ActivityIndicator color={colors.teal} style={{ position: 'absolute', top: 8, left: 8 }}
      accessibilityLabel={L('جارٍ تحميل صورة الوصفة', 'Loading recipe photo')} /> : null}
    {ready && (kind === 'product_artwork' || kind === 'origin_photo') ? <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#FFF6E7E8', paddingHorizontal: 7, borderRadius: 6 }}>
      <Txt style={{ fontSize: 10, lineHeight: 14 }}>{label}</Txt>
    </View> : null}
  </View>;
}
