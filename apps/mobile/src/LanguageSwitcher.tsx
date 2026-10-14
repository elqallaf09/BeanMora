import {useContext} from 'react';
import {isLocale, languageOptions, type Locale} from './localeText';
import {Language} from './ui';
import {TabRail} from './TabRail';

export function LanguageSwitcher({change}:{change:(locale:Locale)=>void}) {
  const locale=useContext(Language);
  return <TabRail testID="language-switcher" items={languageOptions} value={locale} onChange={value=>{if(isLocale(value))change(value);}} wrap columns={2} variant="pills" />;
}
