import * as Application from 'expo-application';
import { Platform } from 'react-native';
import appConfig from '../app.json';
import { Txt, styles, useCopy } from './ui';

export function AppVersion({ light = false }: { light?: boolean }) {
  const t = useCopy();
  return (
    <Txt style={[styles.muted, { textAlign: 'center' }, light && { color: '#FFFDF7' }]}>
      {t.appVersion} {'\u2066' + (Application.nativeApplicationVersion ?? appConfig.expo.version) + ' (' + (Application.nativeBuildVersion ?? (Platform.OS === 'ios' ? appConfig.expo.ios.buildNumber : appConfig.expo.android.versionCode)) + ')' + '\u2069'}
    </Txt>
  );
}
