import { useLabels } from './ui';
import { useContext, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image, Pressable, View } from './native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Language, Txt, colors, styles } from './ui';
import { themeColor, useTheme } from './theme';
import { useContentMedia } from './useContentMedia';
import { socialMediaType, type SocialMedia } from './core/community-social';

export async function chooseSocialMedia(type: 'image' | 'video', camera = false): Promise<SocialMedia | null> {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('CAMERA_PERMISSION');
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: type === 'image' ? ['images'] : ['videos'], quality: 0.85,
    base64: type === 'image', exif: false, videoMaxDuration: 60,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || (asset.fileSize ?? 0) > 15 * 1024 * 1024) throw new Error('MEDIA_SIZE');
  const bytes = asset.base64 ? Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0)) : new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
  const format = socialMediaType(bytes, type);
  return { id: randomUUID(), uri: asset.uri, bytes, type, ...format };
}

export function SocialMediaView({ source, type, label }: { source: string; type: 'image' | 'video'; label: string }) {
  const i18nUi = useLabels();
  const url = useContentMedia(source);
  const ar = useContext(Language) === 'ar';
  if (!url) return <Txt style={styles.muted}>{ar ? 'جارٍ تحميل الوسائط…' : i18nUi('جارٍ تحميل الوسائط…', 'Loading media…')}</Txt>;
  return type === 'video' ? <Video key={url} url={url} label={label} /> : <Image source={{ uri: url }} accessibilityLabel={label} resizeMode="contain" style={{ width: '100%', height: 260, borderRadius: 14, backgroundColor: colors.cream }} />;
}
function Video({ url, label }: { url: string; label: string }) {
  const i18nUi = useLabels();
  const player = useVideoPlayer(url);
  const ar = useContext(Language) === 'ar';
  const [failed, setFailed] = useState(false);
  useEffect(() => { const listener = player.addListener('statusChange', event => setFailed(event.status === 'error')); return () => listener.remove(); }, [player]);
  return <View accessibilityLabel={label} style={{ gap: 6 }}><VideoView accessibilityLabel={label} player={player} nativeControls contentFit="contain" style={{ width: '100%', height: 260, borderRadius: 14 }} />{failed ? <Txt accessibilityRole="alert" style={styles.error}>{ar ? 'تعذّر تشغيل الفيديو على هذا الجهاز.' : i18nUi('تعذّر تشغيل الفيديو على هذا الجهاز.', 'This video could not be played on this device.')}</Txt> : null}</View>;
}
function MediaIcon({ type, camera, color }: { type: 'image' | 'video'; camera: boolean; color: string }) {
  const { dark } = useTheme();
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={themeColor(color, dark) as string} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {type === 'video' ? <><Rect x="3" y="5" width="12" height="14" rx="3" /><Path d="m15 9 6-3v12l-6-3Z" /></> : camera ? <><Path d="m8 5 1-2h6l1 2h3a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z" /><Circle cx="12" cy="12" r="4" /></> : <><Rect x="3" y="3" width="18" height="18" rx="4" /><Circle cx="8" cy="8" r="1.5" /><Path d="m3 17 5-5 4 4 4-6 5 7" /></>}
  </Svg>;
}

function MediaChoice({ type, camera = false, title, disabled, onPress }: { type: 'image' | 'video'; camera?: boolean; title: string; disabled: boolean; onPress: () => void }) {
  const ar = useContext(Language) === 'ar';
  const tint = type === 'image' ? colors.teal : colors.brown;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({
    flex: 1, minWidth: 0, minHeight: camera ? 54 : 96, paddingHorizontal: 10, paddingVertical: camera ? 10 : 16,
    borderRadius: camera ? 16 : 22, borderWidth: 1, borderColor: camera ? colors.line : tint,
    backgroundColor: pressed ? colors.chip : camera ? colors.paper : colors.cream,
    flexDirection: camera ? (ar ? 'row-reverse' : 'row') : 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
  })}>
    <MediaIcon type={type} camera={camera} color={tint} />
    <Txt style={{ color: tint, fontSize: camera ? 13 : 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>{title}</Txt>
  </Pressable>;
}

export function MediaChoices({ choose, disabled, camera = false }: { choose: (type: 'image' | 'video', camera?: boolean) => void; disabled: boolean; camera?: boolean }) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const row = { flexDirection: ar ? 'row-reverse' as const : 'row' as const, gap: 10 };
  return <View testID="media-choices" style={{ gap: 10 }}>
    <View style={row}>
      <MediaChoice type="image" title={i18nUi('صورة', 'Photo')} disabled={disabled} onPress={() => choose('image')} />
      <MediaChoice type="video" title={i18nUi('فيديو', 'Video')} disabled={disabled} onPress={() => choose('video')} />
    </View>
    {camera ? <View style={row}>
      <MediaChoice camera type="image" title={i18nUi('تصوير الآن', 'Take photo')} disabled={disabled} onPress={() => choose('image', true)} />
      <MediaChoice camera type="video" title={i18nUi('تصوير فيديو', 'Record video')} disabled={disabled} onPress={() => choose('video', true)} />
    </View> : null}
  </View>;
}
