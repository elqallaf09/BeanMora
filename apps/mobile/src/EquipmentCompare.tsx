import { useContext, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from './native';
import {
  categoryLabel,
  equipmentKind,
  reviewedFacts,
  type EquipmentItem,
} from './catalog';
import { CatalogPhoto } from './CatalogPhoto';
import { SourceLink } from './SourceLink';
import { Action, Language, Txt, colors, styles } from './ui';

export function EquipmentCompare({
  items,
  remove,
  open,
}: {
  items: EquipmentItem[];
  remove: (id: string) => void;
  open: (item: EquipmentItem) => void;
}) {
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const { width } = useWindowDimensions();
  const [differences, setDifferences] = useState(false);
  const tableScroll = useRef<ScrollView>(null);
  const facts = items.map((item) => reviewedFacts(item, locale));
  const keys = [
    ...new Set(facts.flatMap((rows) => rows.map((row) => row.key))),
  ];
  const rows = keys
    .map((key) => ({
      key,
      label: facts.flat().find((f) => f.key === key)!.label,
      values: facts.map(
        (list) => list.find((f) => f.key === key)?.value ?? null,
      ),
    }))
    .filter((row) => !differences || new Set(row.values).size > 1);
  const compact = width < 600;
  const col = compact
    ? (width - 38) / Math.max(1, items.length)
    : Math.max(158, Math.min(260, (width - 130) / Math.max(1, items.length)));
  const labelWidth = compact ? '100%' : 118;
  return (
    <ScrollView
      testID="equipment-comparison"
      contentContainerStyle={{
        padding: 18,
        gap: 14,
        maxWidth: 1120,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Txt heading style={[styles.title, compact && { fontSize: 22 }]}>
        {ar ? 'مقارنة الأجهزة والأدوات' : 'Equipment comparison'}
      </Txt>
      <Txt style={styles.muted}>
        {ar
          ? 'مواصفات الموديل من مصادر الشركة. المقاسات والإصدارات مهمة؛ لا تُحسم جودة الكوب من الأرقام وحدها.'
          : 'Model specifications from manufacturer sources. Sizes and versions matter; numbers alone do not determine cup quality.'}
      </Txt>
      <View
        style={{
          flexDirection: ar ? 'row-reverse' : 'row',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Action
          compact={compact}
          title={ar ? 'كل المواصفات' : 'All specifications'}
          selected={!differences}
          onPress={() => setDifferences(false)}
        />
        <Action
          compact={compact}
          title={ar ? 'الفروق فقط' : 'Differences only'}
          selected={differences}
          onPress={() => setDifferences(true)}
        />
      </View>
      {new Set(items.map(equipmentKind)).size > 1 ? (
        <Txt style={styles.muted}>
          {ar
            ? 'اخترت فئات مختلفة؛ تظهر المعلومات المنشورة لكل موديل فقط، وقد تختلف وظيفة السعة أو المقاس بينها.'
            : 'You selected different categories. Only published model facts are shown; capacity and size can describe different uses.'}
        </Txt>
      ) : null}
      <ScrollView
        ref={tableScroll}
        horizontal
        scrollEnabled={!compact}
        showsHorizontalScrollIndicator={!compact}
        onContentSizeChange={() => {
          if (ar && !compact)
            tableScroll.current?.scrollToEnd({ animated: false });
        }}
        contentContainerStyle={{ flexDirection: ar ? 'row-reverse' : 'row' }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 16,
            overflow: 'hidden',
            width: (compact ? 2 : 118) + col * items.length,
          }}
        >
          <View
            style={{
              flexDirection: ar ? 'row-reverse' : 'row',
              flexWrap: compact ? 'wrap' : 'nowrap',
              backgroundColor: colors.paper,
            }}
          >
            <View
              style={{
                width: labelWidth,
                padding: 10,
                justifyContent: 'center',
              }}
            >
              <Txt style={{ fontSize: 12, fontWeight: '700' }}>
                {ar ? 'الموديل' : 'Model'}
              </Txt>
            </View>
            {items.map((item) => (
              <View
                key={item.id}
                style={{
                  width: col,
                  padding: 10,
                  gap: 7,
                  borderStartWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <CatalogPhoto
                  uri={item.imageUrl}
                  height={compact ? 70 : 92}
                  icon={item.category === 'xbloom' ? 'xbloom' : 'gear'}
                />
                <Txt
                  heading
                  style={{
                    fontSize: compact ? 13 : 15,
                    lineHeight: compact ? 19 : 23,
                    fontWeight: '700',
                  }}
                >
                  {item.name}
                </Txt>
                <Txt style={{ fontSize: 11, color: colors.muted }}>
                  {categoryLabel(equipmentKind(item), locale)}
                </Txt>
                <Action
                  compact={compact}
                  accessibilityLabel={(ar ? 'إزالة: ' : 'Remove: ') + item.name}
                  title={
                    compact
                      ? ar
                        ? 'إزالة'
                        : 'Remove'
                      : (ar ? 'إزالة: ' : 'Remove: ') + item.name
                  }
                  onPress={() => remove(item.id)}
                />
              </View>
            ))}
          </View>
          {rows.map((row, index) => (
            <View
              key={row.key}
              style={{
                flexDirection: ar ? 'row-reverse' : 'row',
                flexWrap: compact ? 'wrap' : 'nowrap',
                backgroundColor: index % 2 ? '#F5EEE5' : colors.paper,
                borderTopWidth: 1,
                borderColor: colors.line,
              }}
            >
              <View
                style={{
                  width: labelWidth,
                  padding: 10,
                  justifyContent: 'center',
                }}
              >
                <Txt style={{ fontSize: 12, fontWeight: '700' }}>
                  {row.label}
                </Txt>
              </View>
              {row.values.map((value, i) => (
                <View
                  key={items[i].id}
                  style={{
                    width: col,
                    padding: 10,
                    justifyContent: 'center',
                    borderStartWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Txt
                    style={{
                      fontSize: 12,
                      lineHeight: 20,
                      color: value ? colors.ink : colors.muted,
                    }}
                  >
                    {value ??
                      (ar
                        ? 'غير منشور في البيانات الموثقة'
                        : 'Not published in reviewed data')}
                  </Txt>
                </View>
              ))}
            </View>
          ))}
          <View
            style={{
              flexDirection: ar ? 'row-reverse' : 'row',
              flexWrap: compact ? 'wrap' : 'nowrap',
              borderTopWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.paper,
            }}
          >
            <View style={{ width: labelWidth, padding: 10 }}>
              <Txt style={{ fontSize: 12, fontWeight: '700' }}>
                {ar ? 'المصدر والتفاصيل' : 'Source and details'}
              </Txt>
            </View>
            {items.map((item) => (
              <View
                key={item.id}
                style={{
                  width: col,
                  padding: 10,
                  gap: 7,
                  borderStartWidth: 1,
                  borderColor: colors.line,
                }}
              >
                {item.sourceUrl ? (
                  <SourceLink
                    compact={compact}
                    title={ar ? 'مصدر الشركة' : 'Manufacturer source'}
                    url={item.sourceUrl}
                  />
                ) : null}
                {item.verifiedAt ? (
                  <Txt style={{ fontSize: 11, color: colors.muted }}>
                    {(ar ? 'آخر تحقق: ' : 'Checked: ') +
                      new Date(item.verifiedAt).toLocaleDateString(
                        locale + '-u-nu-latn',
                      )}
                  </Txt>
                ) : null}
                <Action
                  compact={compact}
                  accessibilityLabel={
                    (ar ? 'تفاصيل: ' : 'Details: ') + item.name
                  }
                  title={
                    compact
                      ? ar
                        ? 'التفاصيل'
                        : 'Details'
                      : (ar ? 'تفاصيل: ' : 'Details: ') + item.name
                  }
                  selected
                  onPress={() => open(item)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {!rows.length ? (
        <Txt style={styles.muted}>
          {ar
            ? differences
              ? 'لا توجد فروق في الحقول المتاحة.'
              : 'لم تُنشر مواصفات قابلة للمقارنة لهذه الموديلات بعد.'
            : differences
              ? 'No differences in the available fields.'
              : 'No comparable reviewed specifications are available for these models yet.'}
        </Txt>
      ) : null}
    </ScrollView>
  );
}
