import { Image, View, type ImageSourcePropType } from 'react-native';
import { useContext } from 'react';
import type { Method } from './core/engine';
import { Language, Txt } from './ui';

const photos: Partial<Record<Method, ImageSourcePropType>> = {
  xbloom: require('../assets/brewing/filter-coffee.png'),
  chemex: require('../assets/brewing/chemex.jpg'),
  aeropress: require('../assets/brewing/aeropress.jpg'),
  french_press: require('../assets/brewing/french_press.jpg'),
  origami: require('../assets/brewing/origami.jpg'),
  kalita_wave: require('../assets/brewing/kalita_wave.jpg'),
  moka_pot: require('../assets/brewing/moka_pot.jpg'),
};
export const hasMethodPhoto = (method: Method) => !!photos[method];
export function MethodPhoto({ method }: { method: Method }) {
  const ar = useContext(Language) === 'ar';
  return <View testID={`method-photo-${method}`} style={{ flex: 1, overflow: 'hidden' }}>
    <Image source={photos[method]} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel={ar ? 'صورة توضيحية للتحضير منشأة لـBeanMora' : 'Brewing illustration created for BeanMora'}/>
    <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#FFF6E7E8', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}><Txt style={{ fontSize: 10, lineHeight: 14 }}>{ar ? 'صورة توضيحية · BeanMora' : 'Illustration · BeanMora'}</Txt></View>
  </View>;
}
