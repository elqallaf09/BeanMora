import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { View } from './native';
import appConfig from '../app.json';
import { Txt, styles, useCopy } from './ui';

export function AppVersion({ light = false, showCredit = false }: { light?: boolean; showCredit?: boolean }) {
  const t = useCopy();
  return (
    <View style={{ gap: 4 }}>
      <Txt style={[styles.muted, { textAlign: 'center' }, light && { color: '#FFFDF7' }]}>
        {t.appVersion} {'\u2066' + (Application.nativeApplicationVersion ?? appConfig.expo.version) + ' (' + (Application.nativeBuildVersion ?? (Platform.OS === 'ios' ? appConfig.expo.ios.buildNumber : appConfig.expo.android.versionCode)) + ')' + '\u2069'}
      </Txt>
      {showCredit ? (
        <View testID="app-version-credit">
          <Txt style={[styles.muted, { textAlign: 'center', writingDirection: 'ltr', fontSize: 12, lineHeight: 18 }, light && { color: '#FFFDF7' }]}>
            powerd by M.Qallaf
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
