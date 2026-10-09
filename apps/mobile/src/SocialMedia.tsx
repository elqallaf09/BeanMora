import { useContext, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image, View } from './native';
import { Action, Language, Txt, colors, styles } from './ui';
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
  const url = useContentMedia(source);
  const ar = useContext(Language) === 'ar';
  if (!url) return <Txt style={styles.muted}>{ar ? 'جارٍ تحميل الوسائط…' : 'Loading media…'}</Txt>;
  return type === 'video' ? <Video key={url} url={url} label={label} /> : <Image source={{ uri: url }} accessibilityLabel={label} resizeMode="contain" style={{ width: '100%', height: 260, borderRadius: 14, backgroundColor: colors.cream }} />;
}
function Video({ url, label }: { url: string; label: string }) {
  const player = useVideoPlayer(url);
  const ar = useContext(Language) === 'ar';
  const [failed, setFailed] = useState(false);
  useEffect(() => { const listener = player.addListener('statusChange', event => setFailed(event.status === 'error')); return () => listener.remove(); }, [player]);
  return <View accessibilityLabel={label} style={{ gap: 6 }}><VideoView accessibilityLabel={label} player={player} nativeControls contentFit="contain" style={{ width: '100%', height: 260, borderRadius: 14 }} />{failed ? <Txt accessibilityRole="alert" style={styles.error}>{ar ? 'تعذّر تشغيل الفيديو على هذا الجهاز.' : 'This video could not be played on this device.'}</Txt> : null}</View>;
}
export function MediaChoices({ choose, disabled, camera = false }: { choose: (type: 'image' | 'video', camera?: boolean) => void; disabled: boolean; camera?: boolean }) {
  const ar = useContext(Language) === 'ar';
  return <View style={[styles.row, { flexWrap: 'wrap', flexDirection: ar ? 'row-reverse' : 'row' }]}>
    <Action compact title={ar ? 'صورة' : 'Photo'} disabled={disabled} onPress={() => choose('image')} />
    <Action compact title={ar ? 'فيديو' : 'Video'} disabled={disabled} onPress={() => choose('video')} />
    {camera ? <Action compact title={ar ? 'تصوير الآن' : 'Take photo'} disabled={disabled} onPress={() => choose('image', true)} /> : null}
    {camera ? <Action compact title={ar ? 'تصوير فيديو' : 'Record video'} disabled={disabled} onPress={() => choose('video', true)} /> : null}
  </View>;
}
