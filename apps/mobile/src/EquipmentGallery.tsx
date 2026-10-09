import { useContext, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from './native';
import { CatalogPhoto } from './CatalogPhoto';
import type { EquipmentItem } from './catalog';
import { SourceLink } from './SourceLink';
import { Action, Language, Txt, colors } from './ui';

export function EquipmentGallery({ item }: { item: EquipmentItem }) {
  const ar = useContext(Language) === 'ar';
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0), [zoom, setZoom] = useState(false);
  useEffect(() => { setIndex(0); setZoom(false); }, [item.id]);
  const photos = item.images?.length ? item.images : item.imageUrl ? [{ url: item.imageUrl, sourceUrl: item.sourceUrl, alt: item.name }] : [];
  const selected = photos[Math.min(index, Math.max(0, photos.length - 1))];
  const label = (n: number) => ar ? `صورة ${n + 1} من ${photos.length} · ${item.name}` : `Photo ${n + 1} of ${photos.length} · ${item.name}`;
  return (
    <View testID="equipment-gallery" style={{ width: '100%', gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={ar ? 'تكبير صورة المعدّة' : 'Enlarge equipment photo'} disabled={!selected} onPress={() => setZoom(true)}>
        <CatalogPhoto uri={selected?.url ?? null} alt={selected?.alt || item.name} height={240} />
      </Pressable>
      {photos.length > 1 ? <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {photos.map((photo, n) => <Pressable key={photo.url} accessibilityRole="button" accessibilityLabel={label(n)} accessibilityState={{ selected: n === index }}
            onPress={() => setIndex(n)} style={{ width: 72, padding: 3, borderRadius: 13, borderWidth: 2, borderColor: n === index ? colors.teal : 'transparent' }}>
            <CatalogPhoto uri={photo.url} alt={label(n)} height={64} />
          </Pressable>)}
        </ScrollView>
        <Txt style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{label(Math.min(index, photos.length - 1))}</Txt>
      </> : null}
      {selected?.sourceUrl ? <SourceLink compact title={ar ? 'مصدر صور الموديل' : 'Model photo source'} url={selected.sourceUrl} /> : null}
      <Modal transparent visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)}>
        <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: '#000B', justifyContent: 'center', padding: 18 }}>
          <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center', backgroundColor: colors.paper, borderRadius: 20, padding: 14, gap: 12 }}>
            <CatalogPhoto uri={selected?.url ?? null} alt={selected?.alt || item.name} height={Math.min(380, height * 0.6)} />
            <Action title={ar ? 'إغلاق الصورة' : 'Close photo'} onPress={() => setZoom(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
