import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from './native';
import type { RecipeItem } from './data';
import { Icon, Txt, colors, useLabels } from './ui';
import { useContentMedia } from './useContentMedia';
import { catalogPhotoSource } from './catalogPhotoSource';

export function RecipeVisual({ recipe }: { recipe: RecipeItem }) {
  const L = useLabels();
  const cover = useContentMedia(recipe.coverUrl);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  useEffect(() => { setStatus('loading'); }, [recipe.id, cover]);
  useEffect(() => {
    if (!recipe.coverUrl || status !== 'loading') return;
    const timeout = setTimeout(() => setStatus('failed'), 15000);
    return () => clearTimeout(timeout);
  }, [recipe.coverUrl, cover, status]);
  const pending = !!recipe.coverUrl && status === 'loading';
  return <View testID="recipe-photo" style={{ flex: 1, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 100 }}>
    {cover && status !== 'failed' ? <Image key={cover} source={catalogPhotoSource(cover)} accessibilityLabel={recipe.title}
      resizeMode="contain" style={{ position: 'absolute', width: '100%', height: '100%' }}
      onLoad={() => setStatus('loaded')} onError={() => setStatus('failed')} /> : null}
    {pending ? <ActivityIndicator color={colors.teal} accessibilityLabel={L('جارٍ تحميل صورة الوصفة', 'Loading recipe photo')} /> : null}
    {(!recipe.coverUrl || status === 'failed') ? <>
      <Icon name={recipe.method} size={48} color={colors.copper} />
      <Txt style={{ fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center', paddingHorizontal: 12 }}>
        {recipe.coverUrl ? L('تعذّر تحميل الصورة', 'Photo could not load') : L('لم تُرفق صورة بهذه الوصفة', 'No photo supplied for this recipe')}
      </Txt>
    </> : null}
  </View>;
}
