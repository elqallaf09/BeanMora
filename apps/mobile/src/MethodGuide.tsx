import { useLabels } from './ui';
import { useContext, useState } from 'react';
import { View } from './native';
import type { Method } from './core/engine';
import guides from './methodGuides.json';
import { SourceLink } from './SourceLink';
import { MethodPhoto } from './MethodPhoto';
import { Action, Icon, Language, Txt, colors, styles } from './ui';

export function MethodGuide({ method, recipes, showPhoto = true }: { method?: Method; recipes?: () => void; showPhoto?: boolean }) {
  const i18nUi = useLabels();
  const ar = useContext(Language) === 'ar';
  const [expanded, setExpanded] = useState(false);
  if (!method || !(method in guides)) return null;
  const guide = guides[method as keyof typeof guides];
  return <View testID="method-guide" style={[styles.card, { gap: 12 }]}>
    {showPhoto ? <View style={{ height: 160, borderRadius: 12, overflow: 'hidden' }}><MethodPhoto method={method}/></View> : null}
    <View style={styles.row}><Icon name={method} size={32} color={colors.brown}/><Txt heading style={styles.subtitle}>{i18nUi(guide.title_ar,guide.title)}</Txt></View>
    <Txt>{i18nUi(guide.intro_ar,guide.intro)}</Txt>
    <View style={styles.row}><Action title={expanded ? (ar ? 'إخفاء الدليل' : i18nUi('إخفاء الدليل', 'Hide guide')) : (ar ? 'المعدات والنصائح' : i18nUi('المعدات والنصائح', 'Equipment and tips'))} onPress={() => setExpanded(v => !v)}/>{recipes ? <Action title={ar ? 'وصفات هذه الطريقة' : i18nUi('وصفات هذه الطريقة', 'Recipes for this method')} onPress={recipes} selected/> : null}</View>
    <View style={{ gap: 5 }}>
      <SourceLink title={`${ar ? 'شاهد شرح التحضير على يوتيوب' : i18nUi('شاهد شرح التحضير على يوتيوب', 'Watch brew guide on YouTube')} · ${guide.video.publisher}`} url={guide.video.url}/>
      <Txt style={styles.muted}>{ar ? 'شرح عام للطريقة؛ قد تختلف المقادير عن الوصفة المفتوحة. اتبع مقادير وصبات الوصفة التي اخترتها.' : i18nUi('شرح عام للطريقة؛ قد تختلف المقادير عن الوصفة المفتوحة. اتبع مقادير وصبات الوصفة التي اخترتها.', 'General method tutorial; quantities may differ from the open recipe. Follow the amounts and pours of your chosen recipe.')}</Txt>
    </View>
    {expanded ? <>
      <Txt style={styles.muted}>{i18nUi(guide.equipment_ar,guide.equipment)}</Txt>
      {guide.tips.map((tip,index) => <Txt key={tip}>{i18nUi(guide.tips_ar[index]??tip,tip)}</Txt>)}
      <SourceLink title={guide.source_name} url={guide.source}/>
    </> : null}
  </View>;
}
