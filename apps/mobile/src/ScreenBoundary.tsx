import { Component, type ReactNode } from 'react';
import { View } from './native';
import { Action, Txt, styles } from './ui';
import type { Locale } from './copy';

export class ScreenBoundary extends Component<{ children: ReactNode; locale: Locale; home: () => void }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    const ar = this.props.locale === 'ar';
    if (this.state.failed) return <View testID="screen-recovery" style={[styles.content, { gap: 14 }]}>
      <Txt heading style={styles.title}>{ar ? 'تعذّر عرض هذه الصفحة' : 'This page could not open'}</Txt>
      <Txt>{ar ? 'أعد فتحها أو ارجع للرئيسية.' : 'Try reopening it or return home.'}</Txt>
      <Action title={ar ? 'إعادة المحاولة' : 'Try again'} onPress={() => this.setState(s => ({ failed: false, attempt: s.attempt + 1 }))} selected />
      <Action title={ar ? 'العودة للرئيسية' : 'Return home'} onPress={this.props.home} />
    </View>;
    return <View key={this.state.attempt} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}
