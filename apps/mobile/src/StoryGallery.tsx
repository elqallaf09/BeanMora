import { useCallback, useContext, useEffect, useRef, useState, type ReactElement } from 'react';
import * as MediaLibrary from 'expo-media-library/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, View, useWindowDimensions } from './native';
import { Icon, Language, Txt, useLabels } from './ui';
import { socialMediaType, type SocialMedia } from './core/community-social';

export const storyGalleryAvailable = true;
const PAGE = 60;
type Tile = { key: string; asset?: MediaLibrary.Asset };

/** iPhone photos are HEIC and far larger than a story needs. Re-encode to a
 * JPEG no longer than 1600 px on its long side before it is uploaded. */
async function assetMedia(asset: MediaLibrary.Asset): Promise<SocialMedia> {
  const info = await MediaLibrary.getAssetInfoAsync(asset);
  const source = info.localUri ?? asset.uri;
  const long = Math.max(asset.width, asset.height);
  const resize = long > 1600 ? [{ resize: asset.width >= asset.height ? { width: 1600 } : { height: 1600 } }] : [];
  const result = await manipulateAsync(source, resize, { compress: 0.72, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new Error('MEDIA_FORMAT');
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  return { id: randomUUID(), uri: result.uri, bytes, type: 'image', ...socialMediaType(bytes, 'image') };
}

/** The member's recent photos, newest first, with a camera tile in front. */
export function StoryGallery({ header, multiple, chosen, busy, onCamera, onPick }: {
  header: ReactElement; multiple: boolean; chosen: string[]; busy: boolean;
  onCamera: () => void; onPick: (key: string, load: () => Promise<SocialMedia>) => void;
}) {
  const L = useLabels();
  const ar = useContext(Language) === 'ar';
  const { width } = useWindowDimensions();
  const [access, setAccess] = useState<'checking' | 'granted' | 'limited' | 'denied'>('checking');
  const [canAsk, setCanAsk] = useState(true);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const cursor = useRef<string | undefined>(undefined);
  const more = useRef(true);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async (reset = false) => {
    if (loading || (!reset && !more.current)) return;
    setLoading(true); setFailed(false);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE, mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        ...(reset || !cursor.current ? {} : { after: cursor.current }),
      });
      if (!mounted.current) return;
      cursor.current = page.endCursor; more.current = page.hasNextPage;
      setAssets((previous) => (reset ? page.assets : [...previous, ...page.assets]));
    } catch { if (mounted.current) setFailed(true); }
    finally { if (mounted.current) setLoading(false); }
  }, [loading]);

  const settle = useCallback((permission: MediaLibrary.PermissionResponse) => {
    if (!mounted.current) return false;
    setCanAsk(permission.canAskAgain !== false);
    const state = !permission.granted ? 'denied' : permission.accessPrivileges === 'limited' ? 'limited' : 'granted';
    setAccess(state);
    return state !== 'denied';
  }, []);
  useEffect(() => {
    void (async () => {
      try {
        let permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
        if (!permission.granted && permission.canAskAgain !== false) permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
        if (settle(permission)) void load(true);
      } catch { if (mounted.current) setAccess('denied'); }
    })();
    // Runs once: later changes go through the buttons below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = 3, gap = 2;
  const side = (Math.min(width, 600) - gap * (columns - 1)) / columns;
  const tiles: Tile[] = [{ key: 'camera' }, ...assets.map((asset) => ({ key: asset.id, asset }))];
  return (
    <FlatList
      testID="story-gallery"
      data={access === 'denied' || access === 'checking' ? [] : tiles}
      keyExtractor={(tile) => tile.key}
      numColumns={columns}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{ gap, paddingBottom: 24 }}
      onEndReachedThreshold={0.6}
      onEndReached={() => void load()}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 10 }}>
          {header}
          {access === 'limited' ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={{ marginHorizontal: 16, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF14' }}>
              <Txt style={{ color: '#FFFFFF', fontSize: 13 }}>{L('تظهر الصور التي سمحت بها فقط. اضغط لتغيير الإذن من الإعدادات.', 'Only the photos you allowed are shown. Tap to change access in Settings.')}</Txt>
            </Pressable>
          ) : null}
          {access === 'denied' ? (
            <View style={{ marginHorizontal: 16, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF14', gap: 10 }}>
              <Txt style={{ color: '#FFFFFF' }}>{L('اسمح بالوصول للصور لتظهر صورك الأخيرة هنا، أو استخدم الأزرار فوق لاختيار صورة أو فيديو.', 'Allow photo access to see your recent photos here, or use the buttons above to choose a photo or video.')}</Txt>
              <Pressable accessibilityRole="button" accessibilityLabel={L('السماح بالوصول للصور', 'Allow photo access')}
                onPress={() => { if (canAsk) void MediaLibrary.requestPermissionsAsync(false, ['photo']).then((p) => { if (settle(p)) void load(true); }).catch(() => undefined); else void Linking.openSettings(); }}
                style={{ minHeight: 44, borderRadius: 12, backgroundColor: '#167B7F', alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ color: '#FFFFFF', fontWeight: '700' }}>{canAsk ? L('السماح بالوصول للصور', 'Allow photo access') : L('فتح الإعدادات', 'Open Settings')}</Txt>
              </Pressable>
            </View>
          ) : null}
          {failed ? <Txt accessibilityRole="alert" style={{ color: '#FFB4A9', marginHorizontal: 16 }}>{L('تعذّر تحميل الصور. اسحب للأسفل أو جرّب لاحقًا.', 'Could not load photos. Try again later.')}</Txt> : null}
        </View>
      }
      ListFooterComponent={loading || access === 'checking' ? <ActivityIndicator color="#FFFFFF" style={{ margin: 18 }} /> : null}
      renderItem={({ item }) => {
        if (!item.asset)
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={L('تصوير الآن', 'Take photo')} disabled={busy} onPress={onCamera}
              style={{ width: side, height: side * 1.5, backgroundColor: '#1F1B18', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
              <Icon name="story" size={34} color="#FFFFFF" />
            </Pressable>
          );
        const asset = item.asset;
        const order = chosen.indexOf(asset.id);
        return (
          <Pressable accessibilityRole="button" accessibilityLabel={L('صورة من المعرض', 'Photo from your library')} accessibilityState={{ selected: order >= 0, disabled: busy }}
            disabled={busy} onPress={() => onPick(asset.id, () => assetMedia(asset))} style={{ width: side, height: side * 1.5, backgroundColor: '#1F1B18', opacity: busy ? 0.6 : 1 }}>
            <Image source={{ uri: asset.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            {multiple ? (
              <View style={{ position: 'absolute', top: 6, [ar ? 'left' : 'right']: 6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF',
                backgroundColor: order >= 0 ? '#167B7F' : '#00000055', alignItems: 'center', justifyContent: 'center' }}>
                {order >= 0 ? <Txt style={{ color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '700' }}>{String(order + 1)}</Txt> : null}
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}
