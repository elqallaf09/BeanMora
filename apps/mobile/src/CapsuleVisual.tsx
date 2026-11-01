import { useEffect, useState } from 'react';
import { Image, View } from './native';
import Svg, { Defs, LinearGradient, Stop, Path, Ellipse } from 'react-native-svg';
import { colors, Txt, useLabels } from './ui';

/** A generic format illustration; never misrepresents a product's packaging or colour. */
export function CapsuleVisual({ uri, system, name }: { uri?: string; system: string; name: string }) {
  const L = useLabels();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const round = system === 'nespresso-vertuo' || system === 'dolce-gusto';
  return <View testID="capsule-visual" style={{ height: 130, backgroundColor: colors.chip, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {uri && !failed ? <Image source={{ uri }} accessibilityLabel={name} resizeMode="contain" style={{ width: '100%', height: '100%' }} onError={() => setFailed(true)} /> : <>
      <Svg width={100} height={94} viewBox="0 0 120 100" accessibilityLabel={L('رسم توضيحي لشكل الكبسولة', 'Capsule shape illustration')}>
        <Defs><LinearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#62584F"/><Stop offset=".4" stopColor="#D8CABB"/><Stop offset=".65" stopColor="#B7A593"/><Stop offset="1" stopColor="#6B5B4B"/></LinearGradient></Defs>
        <Ellipse cx="60" cy="91" rx="35" ry="5" fill="#796958" opacity=".14" />
        <Path d={round ? 'M17 30 Q20 84 60 86 Q100 84 103 30 Z' : 'M20 30 L36 83 Q60 93 84 83 L100 30 Z'} fill="url(#metal)" stroke="#796958" strokeWidth="1.5" />
        <Path d={round ? 'M31 41 Q35 72 47 79 M89 41 Q85 72 73 79' : 'M35 39 L46 79 M85 39 L74 79'} stroke="#F7F2E9" opacity=".65" strokeWidth="2" />
        <Ellipse cx="60" cy="29" rx="47" ry="13" fill="#DCD2C5" stroke="#796958" strokeWidth="2" />
        <Ellipse cx="60" cy="28" rx="39" ry="9" fill="#EDE5DA" stroke="#B1A08E" />
      </Svg>
      <Txt style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>{L('شكل توضيحي · ليست صورة المنتج', 'Illustration · not a product photo')}</Txt>
    </>}
  </View>;
}
