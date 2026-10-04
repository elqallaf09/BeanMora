import appConfig from '../app.json';
import { Txt, styles, useCopy } from './ui';

export function AppVersion({ light = false }: { light?: boolean }) {
  const t = useCopy();
  return (
    <Txt style={[styles.muted, { textAlign: 'center' }, light && { color: '#FFFDF7' }]}>
      {t.appVersion} {'\u2066' + appConfig.expo.version + '\u2069'}
    </Txt>
  );
}
