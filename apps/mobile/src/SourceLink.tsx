import { useContext, useState } from 'react';
import { Linking, View } from 'react-native';
import { safeUrl } from './guards';
import { Action, Language, Txt, styles } from './ui';

export function SourceLink({
  title,
  url,
  compact = false,
}: {
  title: string;
  url: string;
  compact?: boolean;
}) {
  const ar = useContext(Language) === 'ar';
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Action
        compact={compact}
        title={title}
        onPress={() => {
          setFailed(false);
          const target = safeUrl(url);
          if (!target) {
            setFailed(true);
            return;
          }
          void Linking.openURL(target).catch(() => setFailed(true));
        }}
      />
      {failed ? (
        <Txt style={styles.error}>
          {ar
            ? 'تعذّر فتح الرابط. حاول مرة ثانية.'
            : 'Could not open the link. Try again.'}
        </Txt>
      ) : null}
    </View>
  );
}
