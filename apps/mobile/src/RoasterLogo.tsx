import { useState } from 'react';
import { Image, View } from './native';
import { useLabels } from './ui';
import { catalogPhotoSource } from './catalogPhotoSource';

/** The roaster's own mark, shown only to say whose coffee this is. It sits on a
 * plain white disc so any logo stays legible, and disappears if it cannot load. */
export function RoasterLogo({ uri, name, size = 28 }: { uri?: string | null; name: string; size?: number }) {
  const L = useLabels();
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return null;
  return (
    <View testID="roaster-logo" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4DACB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Image source={catalogPhotoSource(uri)} resizeMode="contain" accessibilityLabel={L('شعار ', 'Logo of ') + name}
        style={{ width: size * 0.74, height: size * 0.74 }} onError={() => setFailed(true)} />
    </View>
  );
}
