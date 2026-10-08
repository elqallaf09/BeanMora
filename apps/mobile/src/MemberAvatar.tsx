import { Image, View } from './native';
import { Txt, colors } from './ui';
import { useContentMedia } from './useContentMedia';

export function MemberAvatar({
  name,
  url,
  size = 46,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const uri = useContentMedia(url ?? null);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.chip,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          accessibilityLabel={name}
          style={{ width: size, height: size }}
        />
      ) : (
        <Txt
          style={{
            fontSize: size * 0.4,
            lineHeight: size * 0.55,
            fontWeight: '700',
            color: colors.teal,
            textAlign: 'center',
          }}
        >
          {name.trim().slice(0, 1).toUpperCase() || '☕'}
        </Txt>
      )}
    </View>
  );
}
