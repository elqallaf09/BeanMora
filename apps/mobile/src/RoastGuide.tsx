import { contentLocale } from './localeText';
import { useContext, useState } from 'react';
import { Image, View, useWindowDimensions } from './native';
import { coffeeLessonById } from './core/coffee-knowledge';
import { Disclosure } from './Disclosure';
import { SourceLink } from './SourceLink';
import { TabRail } from './TabRail';
import { Language, Txt, colors, styles } from './ui';

const levels = [
  { id: 'green', color: '#84906A', names: ['أخضر', 'Green'],
    appearance: ['حبة خام، سطح متماسك وشق ضيق؛ اللون يختلف حسب المعالجة والمحصول.', 'Raw seed with a tight structure and narrow crease; color varies with process and lot.'],
    how: ['هذه نقطة البداية قبل التحميص. سجل المحصول ووزنه ورطوبته وكثافته إن كانت مقاسة، واتبع إعداد بدء يناسب محمصتك.', 'This is the unroasted starting point. Record lot, mass, moisture and density when measured, and use a starting profile suited to your roaster.'],
    taste: ['ليست درجة تحميص لمشروب القهوة المعتاد.', 'Not a roast level for a conventional brewed coffee.'] },
  { id: 'light', color: '#AD744B', names: ['بني فاتح', 'Light brown'],
    appearance: ['بني فاتح، سطح جاف عادة، والحبة أكثر تمددًا من الأخضر.', 'Light brown, usually dry, with more expansion than green coffee.'],
    how: ['راقب الاصفرار ثم الاسمرار والفرقعة الأولى، وبعد تطوير مناسب أنزل عند هدف لون فاتح موثّق لمحمصتك وبرّد فورًا. لا تجعل أول صوت فرقعة موعد إنزال ثابتًا.', 'Track yellowing, browning and first crack. After suitable development, drop at a documented light-color target for your machine and cool promptly. The first pop is not a universal drop point.'],
    taste: ['قد يبرز شخصية المنشأ والحموضة؛ الفاتح لا يعني نقص التطوير.', 'Can highlight origin character and acidity; light does not mean underdeveloped.'] },
  { id: 'medium', color: '#75472F', names: ['بني متوسط', 'Medium brown'],
    appearance: ['لون بني أعمق، سطح جاف غالبًا؛ افحص حبة كاملة ومطحونة.', 'Deeper brown, often dry; inspect both whole and ground samples.'],
    how: ['ابدأ من دفعة فاتحة ناجحة، وعدّل نقطة النهاية تدريجيًا للوصول إلى لون أعمق مع التحكم بالطاقة والهواء. ثبّت وزن الدفعة والتبريد وقارن الطعم.', 'Start from a successful light reference and gradually adjust the endpoint toward a deeper color while controlling energy and airflow. Keep batch mass and cooling fixed and compare taste.'],
    taste: ['توازن مختلف بين شخصية البن ونكهات التحميص، بحسب المحصول والوصفة.', 'A different balance of coffee character and roast flavors, depending on lot and recipe.'] },
  { id: 'dark', color: '#35211B', names: ['بني غامق', 'Dark brown'],
    appearance: ['بني داكن، وقد يظهر لمعان زيتي. لا تسعَ إلى السواد أو التفحم.', 'Dark brown with possible oil sheen. Blackening or charring is not the goal.'],
    how: ['الوصول لدرجة أغمق يحتاج متابعة أدق للطاقة والهواء والدخان، وقد تقترب الحمصة من الفرقعة الثانية. التزم بحدود ودليل المحمصة، وأنزل وبرّد عند الهدف المحدد.', 'A darker endpoint needs closer attention to energy, airflow and smoke and may approach second crack. Follow the machine’s limits and manual, then drop and cool at the chosen target.'],
    taste: ['نكهات التحميص أوضح غالبًا؛ لا يلزم أن تناسب كل بن أو كل ذائقة.', 'Roast character is generally more prominent; it need not suit every coffee or preference.'] },
] as const;
const chapters = ['green-coffee', 'roast-stages', 'maillard', 'development-time', 'roast-control', 'rate-of-rise', 'roast-color', 'roast-defects', 'roast-cooling', 'rest', 'cupping'];

export function RoastGuide() {
  const locale = useContext(Language), ar = locale === 'ar', i = ar ? 0 : 1;
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState('light');
  const level = levels.find(level => level.id === selected) ?? levels[1];
  return (
    <View testID="roast-guide" style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Txt heading style={styles.title}>{ar ? 'افهم حمصتك' : 'Understand your roast'}</Txt>
        <Txt style={styles.muted}>{ar ? 'من لون الحبة إلى نتيجة الكوب.' : 'From bean color to the cup.'}</Txt>
      </View>
      <View style={{ gap: 7 }}>
        <Image testID="roast-levels-image" source={require('../assets/images/roast-levels-illustration.jpg')}
          accessibilityLabel={ar ? 'رسم توضيحي للبن، من اليسار: أخضر، بني فاتح، متوسط، غامق' : 'Illustration, left to right: green, light brown, medium brown, dark brown beans'}
          resizeMode="contain" style={{ width: '100%', aspectRatio: 3, borderRadius: 18 }} />
        <View style={{ flexDirection: 'row' }}>
          {levels.map(level => <View key={level.id} style={{ flex: 1 }}><Txt style={{ textAlign: 'center', fontSize: width < 360 ? 11 : 13 }}>{level.names[i]}</Txt></View>)}
        </View>
        <Txt style={{ fontSize: 11, color: colors.muted }}>{ar ? 'صورة توضيحية مولّدة؛ ليست مقياس لون أو قراءة Agtron.' : 'Generated illustration; not a color standard or Agtron reading.'}</Txt>
      </View>
      <TabRail testID="roast-level-tabs" equal value={selected} onChange={setSelected} items={levels.map(level => ({ id: level.id, label: level.names[i] }))} />
      <View style={[styles.card, { gap: 12 }]}>
        <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: level.color }} />
          <Txt heading style={styles.subtitle}>{level.names[i]}</Txt>
        </View>
        <Txt>{level.appearance[i]}</Txt>
        <Txt heading style={{ fontWeight: '700' }}>{ar ? 'شلون نوصل لها؟' : 'How do we reach it?'}</Txt>
        <Txt>{level.how[i]}</Txt>
        <Txt style={styles.muted}>{level.taste[i]}</Txt>
      </View>
      <Disclosure title={ar ? 'خطة تجربة: ثلاث نتائج من نفس البن' : 'Experiment: three outcomes from one coffee'} initial>
        {[
          ['١. ثبّت المحصول، وزن الدفعة، الماكينة، نوع الحساس وروتين التسخين.', '1. Fix lot, batch mass, machine, sensor type and preheat workflow.'],
          ['٢. اعمل دفعة مرجعية حسب دليل جهازك. سجل الاصفرار والفرقعة والإنزال، وكل تغيير طاقة أو هواء.', '2. Roast a reference using your machine guide. Record yellowing, crack, drop and every energy or airflow change.'],
          ['٣. قارن نقطتي نهاية مختلفتين تدريجيًا مع نفس التبريد. لا تجمع تغيير الدفعة والطاقة والنهاية في محاولة واحدة.', '3. Compare two gradually adjusted endpoints with consistent cooling. Avoid changing batch, power and endpoint together.'],
          ['٤. سجل الوزن بعد التبريد، اللون بنفس الإضاءة أو جهاز معاير، والطعم بعد مدة راحة ثابتة.', '4. Record cooled mass, color under fixed light or a calibrated instrument, and taste after equal resting.'],
          ['٥. رمّز العينات وقارنها بنفس الماء والطحن والوصفة، وكرر قبل اعتماد النتيجة.', '5. Code the samples and compare with fixed water, grind and recipe. Repeat before adopting the result.'],
        ].map(row => <Txt key={row[1]}>{row[i]}</Txt>)}
        <Txt style={styles.muted}>{ar ? 'هذه خطة دراسة عملية، وليست نتائج تجارب أجريت على بنّك أو جدول حرارة عام.' : 'This is an experimental plan, not measured results for your coffee or a universal temperature schedule.'}</Txt>
      </Disclosure>
      <Disclosure title={ar ? 'دليل التحميص الكامل' : 'Complete roasting study'} subtitle={ar ? 'المراحل، التحكم، القياس، العيوب والتذوق' : 'Stages, control, measurement, defects and tasting'}>
        {chapters.map(id => {
          const lesson = coffeeLessonById(id, contentLocale(locale));
          return lesson ? <Disclosure key={id} title={lesson.title}>
            <Txt>{lesson.answer}</Txt><Txt style={styles.muted}>{lesson.more}</Txt>
            <SourceLink compact title={lesson.source.title} url={lesson.source.url} />
          </Disclosure> : null;
        })}
      </Disclosure>
      <SourceLink compact title={ar ? 'درجات التحميص — NCA' : 'Roast levels — NCA'} url="https://www.aboutcoffee.org/beans/roasts/" />
    </View>
  );
}
