import { useContext, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from './native';
import { Action, Field, Icon, Language, Txt, colors, styles, useLabels } from './ui';
import { accountCountries, accountCountryFlag, accountCountryName } from './core/account-profile';
import { deepSearchText, matchesIndexedSearch } from './core/deepSearch';

/** Inline picker works inside both signup and the native Settings modal. */
export function CountryPicker({ value, onChange, disabled = false }: { value: string; onChange: (country: string) => void; disabled?: boolean }) {
  const locale = useContext(Language), L = useLabels();
  const [open, setOpen] = useState(false), [search, setSearch] = useState('');
  const [limit, setLimit] = useState(40);
  const indexedCountries = useMemo(() => accountCountries.map(c => {
    const label = accountCountryName(c.code, locale);
    return { ...c, label, searchText: deepSearchText([c.code, c.ar, c.en, c.ja, label].join(' ')) };
  }), [locale]);
  const choices = useMemo(() => {
    const q = search.trim();
    return indexedCountries.filter(c => !q || matchesIndexedSearch(c.searchText, q))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [search, locale, indexedCountries]);
  return <View testID="account-country-picker" style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={L('الدولة', 'Country')} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => setOpen(v => !v)} style={[styles.input, { minHeight: 50, flexDirection: locale === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }]}>
      <Icon name="globe" size={18} color={colors.teal} />
      <Txt style={{ flex: 1 }}>{value ? `${accountCountryFlag(value)} ${accountCountryName(value, locale)}` : L('اختر الدولة', 'Choose your country', '国・地域を選択')}</Txt>
      <Icon name="chevronDown" size={16} color={colors.teal} />
    </Pressable>
    {open ? <View style={[styles.card, { padding: 10, gap: 8 }]}>
      <Field label={L('ابحث عن الدولة', 'Search countries')} value={search} onChangeText={v => { setSearch(v); setLimit(40); }} autoCorrect={false} />
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 2 }}>
        {choices.slice(0, limit).map(c => <Pressable key={c.code} accessibilityRole="button" accessibilityLabel={c.label} accessibilityState={{ selected: c.code === value }}
          onPress={() => { onChange(c.code); setOpen(false); setSearch(''); }} style={{ padding: 10, minHeight: 44, backgroundColor: c.code === value ? colors.chip : 'transparent', borderRadius: 8 }}>
          <Txt>{accountCountryFlag(c.code)} {c.label}</Txt>
        </Pressable>)}
        {!choices.length ? <Txt>{L('لا توجد دولة مطابقة.', 'No matching countries.')}</Txt> : null}
        {choices.length > limit ? <Action compact title={L('دول إضافية', 'More countries', 'さらに表示')} onPress={() => setLimit(n => n + 40)} /> : null}
      </ScrollView>
    </View> : null}
  </View>;
}
