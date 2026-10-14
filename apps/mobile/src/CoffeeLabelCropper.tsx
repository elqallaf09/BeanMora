import { useLabels } from './ui';
import { useContext, useState } from 'react';
import { Image, Platform, Pressable, View, useWindowDimensions } from './native';
import { Action, Language, Txt, colors } from './ui';
import type { CoffeeOcrCrop } from './coffeeOcr';

/** Two taps define a crop in original-image coordinates on both web and native. */
export function CoffeeLabelCropper({ photo, apply, cancel }: {
  photo: { uri: string; width: number; height: number }; apply: (crop: CoffeeOcrCrop) => void; cancel: () => void;
}) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const screen = useWindowDimensions();
  const aspect = photo.width / photo.height;
  const width = Math.min(screen.width - 64, 600, 360 * aspect), height = width / aspect;
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<CoffeeOcrCrop | null>(null);
  return <View testID="coffee-label-cropper" style={{ gap: 8 }}>
    <Txt style={{ fontSize: 13 }}>{ar ? 'اضغط زاوية الملصق ثم الزاوية المقابلة لتحديد الكتابة فقط.' : i18nUi('اضغط زاوية الملصق ثم الزاوية المقابلة لتحديد الكتابة فقط.', 'Tap one label corner, then the opposite corner to select only the text.')}</Txt>
    <Pressable testID="coffee-crop-image" accessibilityRole="button" accessibilityLabel={ar ? 'تحديد حدود الملصق' : i18nUi('تحديد حدود الملصق', 'Select label bounds')}
      style={{ width, height, alignSelf: 'center' }} onPress={event => {
        let { locationX, locationY } = event.nativeEvent;
        if (Platform.OS === 'web') {
          // Web Pressable supplies a MouseEvent; RN's locationX/Y are absent.
          const target = event.currentTarget as unknown as HTMLElement;
          const pointer = event.nativeEvent as unknown as MouseEvent;
          const rect = target.getBoundingClientRect();
          locationX = pointer.clientX - rect.left; locationY = pointer.clientY - rect.top;
        }
        if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
        const x = Math.max(0, Math.min(1, locationX / width));
        const y = Math.max(0, Math.min(1, locationY / height));
        if (!start || crop) { setStart({ x, y }); setCrop(null); }
        else {
          const next = { left: Math.min(start.x, x), top: Math.min(start.y, y), width: Math.abs(start.x - x), height: Math.abs(start.y - y) };
          if (next.width >= .05 && next.height >= .05) setCrop(next);
        }
      }}>
      <View pointerEvents="none"><Image source={{ uri: photo.uri }} resizeMode="contain" style={{ width, height }} /></View>
      {start && !crop ? <View pointerEvents="none" style={{ position: 'absolute', left: start.x * width - 4, top: start.y * height - 4, width: 8, height: 8, backgroundColor: colors.teal, borderWidth: 1, borderColor: '#fff' }} /> : null}
      {crop ? <View testID="coffee-crop-selection" pointerEvents="none" style={{ position: 'absolute', left: crop.left * width, top: crop.top * height,
        width: crop.width * width, height: crop.height * height, borderWidth: 2, borderColor: colors.teal, backgroundColor: '#147B7022' }} /> : null}
    </Pressable>
    <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
      <Action compact variant="primary" title={ar ? 'قراءة الجزء المحدد' : i18nUi('قراءة الجزء المحدد', 'Read selected label')} disabled={!crop} onPress={() => crop && apply(crop)} />
      <Action compact title={ar ? 'تحديد من جديد' : i18nUi('تحديد من جديد', 'Reset selection')} onPress={() => { setStart(null); setCrop(null); }} />
      <Action compact title={ar ? 'إلغاء' : i18nUi('إلغاء', 'Cancel')} onPress={cancel} />
    </View>
  </View>;
}
