import { useContext } from 'react';
import { View, useWindowDimensions } from './native';
import type { RecipeItem } from './data';
import { Language, Txt, colors, styles } from './ui';
import { sourceTemperature } from './sourceBrew';
import { modelLabel } from './localizedContent';

export function SourceBrewDetails({
  recipe,
  settingsOnly = false,
}: {
  recipe: RecipeItem;
  settingsOnly?: boolean;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const source = recipe.sourceBrew;
  if (!source.pours?.length) return null;
  if (settingsOnly)
    return (
      <View style={{ gap: 7 }}>
        {source.ratio ? (
          <Txt>
            {ar ? 'نسبة البن إلى الماء: ' : 'Coffee-to-water ratio: '}1:
            {source.ratio}
          </Txt>
        ) : null}
        {source.rpm != null ? (
          <Txt>
            {ar ? 'سرعة الطحن: ' : 'Grinder speed: '}
            {source.rpm} {ar ? 'دورة/دقيقة' : 'RPM'}
          </Txt>
        ) : null}
        {source.cup_type ? (
          <Txt>
            {ar ? 'وعاء التحضير: ' : 'Brewing vessel: '}
            {source.cup_type === 'OMNI'
              ? ar
                ? 'قطّارة أومني'
                : 'OMNI dripper'
              : source.cup_type}
          </Txt>
        ) : null}
        {source.model ? (
          <Txt>
            {ar ? 'الجهاز في المصدر: ' : 'Source machine: '}
            {modelLabel(source.model, locale)}
          </Txt>
        ) : null}
        {source.pours.map((pour, index) => (
          <View key={index} style={{ gap: 3 }}>
            <Txt style={{ fontWeight: '700', fontSize: 13 }}>
              {(ar ? 'إعدادات الصبة ' : 'Pour settings ') + (index + 1)}
            </Txt>
            <Txt style={{ fontSize: 12 }}>
              {[
                pour.pattern_code != null
                  ? (ar ? 'رمز نمط المصدر: ' : 'Source pattern code: ') +
                    pour.pattern_code
                  : null,
                pour.vibration_before === 0 || pour.vibration_before === 1
                  ? (ar ? 'الاهتزاز قبل الصبة: ' : 'Vibration before: ') +
                    (pour.vibration_before === 1
                      ? ar
                        ? 'مفعّل'
                        : 'On'
                      : ar
                        ? 'متوقف'
                        : 'Off')
                  : null,
                pour.vibration_after === 0 || pour.vibration_after === 1
                  ? (ar ? 'الاهتزاز بعد الصبة: ' : 'Vibration after: ') +
                    (pour.vibration_after === 1
                      ? ar
                        ? 'مفعّل'
                        : 'On'
                      : ar
                        ? 'متوقف'
                        : 'Off')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          </View>
        ))}
        <Txt style={styles.muted}>
          {ar
            ? 'الماء منشور بالملليلتر؛ افتح المصدر لنمط حركة الصب وإعدادات جهازك.'
            : 'Water is published in milliliters; open the source for pouring patterns and machine settings.'}
        </Txt>
      </View>
    );
  return (
    <View testID="source-pour-plan" style={{ gap: 8 }}>
      <Txt heading style={styles.subtitle}>
        {ar ? 'خطة الصبات' : 'Pour plan'}
      </Txt>
      {source.pour_sum_matches_stated_water === false ? (
        <Txt style={styles.warning}>
          {ar
            ? 'إجمالي ماء المصدر يختلف عن مجموع الصبات؛ راجع الرابط قبل التحضير.'
            : 'Source water differs from the pour sum; check the source before brewing.'}
        </Txt>
      ) : null}
      <View
        style={{
          flexDirection: ar ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {source.pours.map((p, i) => (
          <View
            key={i}
            testID={'source-pour-' + (i + 1)}
            style={[
              styles.card,
              {
                flexBasis: width >= 700 ? '30%' : '100%',
                flexGrow: 1,
                padding: 12,
                marginBottom: 0,
                gap: 5,
              },
            ]}
          >
            <View
              style={{
                flexDirection: ar ? 'row-reverse' : 'row',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#E2EFEB',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Txt style={{ color: colors.teal, fontWeight: '700' }}>
                  {i + 1}
                </Txt>
              </View>
              <Txt heading style={{ fontSize: 15, fontWeight: '700', flex: 1 }}>
                {ar ? 'الصبة ' + (i + 1) : 'Pour ' + (i + 1)}
              </Txt>
              {p.volume != null ? (
                <Txt
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    writingDirection: 'ltr',
                  }}
                >
                  {p.volume} {ar ? 'مل' : 'ml'}
                </Txt>
              ) : null}
            </View>
            <Txt style={{ fontSize: 13, lineHeight: 18, color: colors.muted }}>
              {[
                p.temperature != null
                  ? (ar ? 'الحرارة: ' : 'Temperature: ') +
                    sourceTemperature(p.temperature, ar)
                  : null,
                p.flow_rate != null
                  ? (ar ? 'التدفق: ' : 'Flow: ') +
                    p.flow_rate +
                    (ar ? ' مل/ث' : ' ml/s')
                  : null,
                p.pause_seconds != null
                  ? (ar ? 'التوقف: ' : 'Pause: ') +
                    p.pause_seconds +
                    (ar ? ' ث' : ' s')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
            {p.vibration_before === 1 || p.vibration_after === 1 ? (
              <Txt style={{ fontSize: 11, lineHeight: 16, color: colors.teal }}>
                {ar ? 'اهتزاز مفعّل: ' : 'Vibration on: '}
                {[
                  p.vibration_before === 1
                    ? ar
                      ? 'قبل الصبة'
                      : 'before'
                    : null,
                  p.vibration_after === 1 ? (ar ? 'بعد الصبة' : 'after') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
