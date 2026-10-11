import { Children, useContext, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from './native';
import { Language, colors } from './ui';

/** Keep related detail blocks together without shrinking phone text. */
export function DetailColumns({ children, minWidth = 600, testID }: {
  children: ReactNode;
  minWidth?: number;
  testID?: string;
}) {
  const ar = useContext(Language) === 'ar';
  const paired = useWindowDimensions().width >= minWidth;
  return <View testID={testID} style={{ gap: 10, flexDirection: paired ? ar ? 'row-reverse' : 'row' : 'column', flexWrap: 'wrap', alignItems: 'stretch' }}>
    {Children.toArray(children).map((child, index) => <View key={index} style={{ minWidth: 0, ...(paired ? { flexBasis: '48%', flexGrow: 1 } : { width: '100%' }), gap: 8 }}>{child}</View>)}
  </View>;
}

export const detailStyles = StyleSheet.create({
  page: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  photo: { width: '35%', maxWidth: 220, minWidth: 88, flexShrink: 0, borderRadius: 14, overflow: 'hidden' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 21, lineHeight: 28, fontWeight: '700' },
  card: { marginBottom: 0, padding: 12, gap: 8, borderRadius: 16 },
  text: { fontSize: 14, lineHeight: 22 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
});
