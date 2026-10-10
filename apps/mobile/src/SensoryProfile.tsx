import { useContext, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from './native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { Icon, Language, Txt, colors, styles } from './ui';
import { flavorArt, flavorLabel, hasCompletePersonality, missingPersonalityAttributes, type CoffeeSensoryData, type SensoryKey, type SensoryValue } from './sensory';
import { safeUrl } from './guards';

/** Small vector illustrations stay crisp on both native screens and web. */
export function FlavorIcon({ note, size = 38 }: { note: string; size?: number }) {
  const art = flavorArt(note);
  const drawings = {
    citrus: <><Path d="M9 26a17 17 0 0 0 33 0Z" fill="#F2AB48" stroke="#BA7128"/><Path d="M12 27a14 14 0 0 0 27 0Z" fill="#FFD68D" stroke="#FFF4CF" strokeWidth="2"/><Path d="m25 27-10 9m10-9v14m0-14 10 9" stroke="#FFF4CF" strokeWidth="2"/><Path d="M27 20c-1-9 7-13 14-9-2 8-9 11-14 9Z" fill="#83986C"/><Path d="m21 23 9-9" stroke="#577351"/></>,
    flower: <><Path d="M26 31c4 3 5 7 4 12m-2-5c-7 3-12-1-13-5 7-1 10 1 13 5Z" fill="#819973" stroke="#6B855F"/>{[0,72,144,216,288].map(angle => <Ellipse key={angle} cx="25" cy="15" rx="6" ry="11" fill="#FFFDF4" stroke="#C7BAAC" transform={`rotate(${angle} 25 25)`}/>)}<Circle cx="25" cy="25" r="5" fill="#E4B865" stroke="#BD9241"/></>,
    peach: <><Path d="M25 17c-15-9-23 8-16 19 4 8 12 7 16 4 5 4 13 2 17-6 6-13-5-25-17-17Z" fill="#EAA078" stroke="#C67A60"/><Path d="M25 18c-4 8-2 16 0 22" fill="none" stroke="#CC785F"/><Path d="M24 16c0-7 5-12 14-11-2 8-8 12-14 11Z" fill="#839A6E" stroke="#5B7854"/><Path d="m22 17 3-8" fill="none" stroke="#735341"/></>,
    berry: <><Path d="M17 19c1-9 7-12 10-13m7 18C34 11 30 8 27 6" fill="none" stroke="#789065" strokeWidth="2"/><Path d="M24 11c-7 2-12-1-14-5 8-3 12-1 14 5Z" fill="#8C9E73"/><Circle cx="17" cy="30" r="11" fill="#AE5A5C" stroke="#884547"/><Circle cx="34" cy="33" r="10" fill="#BF7072" stroke="#984F53"/><Path d="M11 26c1-2 3-3 5-3m13 6 3-2" stroke="#ECC3B9" strokeWidth="2.5"/></>,
    honey: <><Path d="M11 26h26l2 17H9Z" fill="#E9B456" stroke="#B8843B"/><Path d="M10 29h28" stroke="#FDE1A1" strokeWidth="3"/><Rect x="9" y="23" width="30" height="5" rx="2" fill="#D7A76E" stroke="#AA7746"/><Path d="m26 24 11-17" stroke="#AC7748" strokeWidth="4"/><Rect x="28" y="5" width="12" height="15" rx="4" transform="rotate(31 34 12)" fill="#D7A66A" stroke="#9F713F"/><Path d="m30 8 8 5m-10-2 8 5" stroke="#976635"/><Path d="M28 22c-2 3-3 5-2 7 3 1 4-3 2-7Z" fill="#E4A342"/></>,
    chocolate: <><Path d="m9 14 26-5 8 29-27 5Z" fill="#704B39" stroke="#503326"/>{[0,1,2].flatMap(y => [0,1].map(x => <Rect key={`${x}${y}`} x={13+x*11} y={13+y*9} width="9" height="7" rx="1" fill="#A27758" stroke="#5C3A2C" transform="rotate(-10 25 25)"/>))}<Path d="m14 33 25-5 4 10-27 5Z" fill="#D8C6A9" stroke="#B7A58D"/></>,
    nut: <><Path d="M12 39C-2 17 23 8 32 9c6 11 4 35-20 30Z" fill="#C69C6B" stroke="#95704B"/><Path d="m12 37 16-23M14 19c4 3 7 8 8 14" stroke="#A47A51" fill="none"/><Path d="M25 35c-3-13 8-20 16-16 8 7 2 23-9 23Z" fill="#D7B283" stroke="#9C744F"/><Path d="m29 38 9-16" stroke="#B48C60"/></>,
    caramel: <><Path d="m9 19 17-6 15 7-17 7Z" fill="#DFAD72" stroke="#A97442"/><Path d="m9 19 15 8v15L9 34Z" fill="#B97D47" stroke="#A97442"/><Path d="m24 27 17-7v14l-17 8Z" fill="#D99B5E" stroke="#A97442"/><Path d="M15 17c3-7 8-9 14-6" fill="none" stroke="#EDD0A1" strokeWidth="2"/></>,
    spice: <><Path d="m10 36 20-27 7 4-18 29Z" fill="#BE855E" stroke="#8B5D43"/><Path d="m15 38 17-26" stroke="#8B5D43"/><Path d="m23 38 10-19 8 3-9 20Z" fill="#CFA07B" stroke="#8B5D43"/><Ellipse cx="28" cy="39" rx="5" ry="3" fill="#9D6E50" stroke="#78503B"/></>,
    bean: <><Ellipse cx="25" cy="26" rx="12" ry="17" transform="rotate(25 25 26)" fill="#B4977C" stroke="#7F634E"/><Path d="M30 11c-13 7 2 18-11 29" fill="none" stroke="#F4E7D4" strokeWidth="3"/></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 50 50" fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{drawings[art]}</Svg>;
}

export function FlavorNotes({ notes, compact = false, max = 6 }: { notes: string[]; compact?: boolean; max?: number }) {
  const ar = useContext(Language) === 'ar';
  const unique = [...new Set(notes.map(n => n.trim()).filter(Boolean))].slice(0, max);
  if (!unique.length) return null;
  return <View style={[s.notes, ar && { flexDirection: 'row-reverse' }]}>{unique.map(note => <View key={note} style={compact ? s.noteChip : s.noteTile}><FlavorIcon note={note} size={compact ? 21 : 45}/><Txt numberOfLines={compact ? 1 : 2} style={compact ? s.chipText : s.noteText}>{flavorLabel(note, ar)}</Txt></View>)}</View>;
}

export function RoastLevel({ roast, score }: { roast?: string | null; score?: SensoryValue }) {
  const ar = useContext(Language) === 'ar';
  const roasts = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
  const index = roast ? roasts.indexOf(roast) : -1;
  if (index < 0 && !score) return null;
  const names = ar ? ['فاتح', 'متوسط فاتح', 'متوسط', 'متوسط داكن', 'داكن'] : ['Light', 'Medium light', 'Medium', 'Medium dark', 'Dark'];
  const filled = score ? Math.round(score.value / score.max * 5) : index + 1;
  return <View style={[s.roast, ar && { flexDirection: 'row-reverse' }]}><View style={{ flexDirection: 'row', gap: 4 }}>{[0,1,2,3,4].map(i => <Icon key={i} name="bean" size={17} color={i < filled ? colors.copper : '#D8CDBE'} filled={i < filled}/>)}</View><Txt style={{ fontSize: 12, color: colors.muted }}>{ar ? 'التحميص: ' : 'Roast: '}{index >= 0 ? names[index] : `${score!.value}/${score!.max}`}</Txt></View>;
}

export function CoffeeSensory({ notes, sensory, roast, sourceUrl }: { notes: string[]; sensory?: CoffeeSensoryData; roast?: string | null; sourceUrl?: string | null }) {
  const ar = useContext(Language) === 'ar';
  const [sourceFailed, setSourceFailed] = useState(false);
  const complete = hasCompletePersonality(notes, sensory);
  const labels: Record<SensoryKey, string> = ar ? { acidity: 'الحموضة', sweetness: 'الحلاوة', body: 'القوام', fermentation: 'التخمير' } : { acidity: 'Acidity', sweetness: 'Sweetness', body: 'Body', fermentation: 'Fermentation' };
  const keys: SensoryKey[] = (['acidity', 'sweetness', 'body', 'fermentation'] as const).filter(key => sensory?.[key] || sensory?.descriptions?.[key]);
  const missing = missingPersonalityAttributes(sensory).map(key => labels[key]).join(ar ? '، ' : ', ');
  const source = safeUrl(keys.length ? sensory?.sourceUrl : sourceUrl);
  return <View testID="coffee-sensory" style={[s.profile, complete && s.completeProfile]}>
    <View testID={complete ? 'coffee-personality-complete' : 'coffee-personality-pending'} style={[s.profileHeader, ar && { flexDirection: 'row-reverse' }]}>
      <View style={s.profileIcon}><Icon name="bean" size={23} color={colors.copper}/></View>
      <View style={{ flex: 1, gap: 2 }}><Txt heading style={styles.subtitle}>{complete ? ar ? 'شخصية البن' : 'Coffee personality' : notes.length || keys.length ? ar ? 'إيحاءات المحمصة' : 'Roaster tasting notes' : ar ? 'الطعم قيد التوثيق' : 'Taste details coming soon'}</Txt><Txt style={s.caption}>{complete ? ar ? 'الإيحاءات وملامح الكوب من وصف المحمصة' : 'Tasting notes and cup attributes from the roaster' : ar ? 'المعلومات المتوفرة من المحمصة' : 'Available information from the roaster'}</Txt></View>
    </View>
    <RoastLevel roast={roast} score={sensory?.roast}/>
    {notes.length ? <View testID="coffee-flavor-notes" style={{gap:8}}><Txt style={s.sectionLabel}>{ar ? 'إيحاءات البن والطعم' : 'Coffee tasting notes'}</Txt><FlavorNotes notes={notes} max={20}/></View> : null}
    {keys.length ? <View style={[s.scales, ar && { flexDirection: 'row-reverse' }]}>{keys.map(key => {
      const metric = sensory?.[key];
      const description = sensory?.descriptions?.[key];
      const value = metric ? `${metric.value}/${metric.max}` : ar ? description!.ar : description!.en;
      return <View key={key} testID={'coffee-attribute-'+key} style={s.scaleRow}><View style={[s.scaleHeading, ar && { flexDirection: 'row-reverse' }]}><Txt style={s.scaleTitle}>{labels[key]}</Txt>{metric ? <Txt style={s.scaleValue}>{value}</Txt> : null}</View>{metric ? <View accessibilityLabel={labels[key]+': '+value} style={s.track}><View style={[s.trackFill, { width: `${metric.value / metric.max * 100}%`, alignSelf: ar ? 'flex-end' : 'flex-start' }]}/></View> : null}{description ? <Txt style={s.description}>{ar ? description.ar : description.en}</Txt> : null}</View>;
    })}</View> : null}
    {!complete ? <View testID="coffee-personality-status"><Txt style={s.caption}>{!notes.length && !keys.length ? ar ? 'تظهر شخصية البن هنا بعد توثيق الإيحاءات والحموضة والحلاوة والقوام.' : 'The full personality appears here once tasting notes, acidity, sweetness and body are documented.' : !notes.length ? ar ? 'تظهر شخصية البن الكاملة بعد استكمال توثيق الإيحاءات'+(missing ? ' و'+missing : '')+'.' : 'The full personality awaits documented tasting notes'+(missing ? ', '+missing : '')+'.' : ar ? 'شخصية البن الكاملة بانتظار توثيق: '+missing+'.' : 'The full personality awaits documented '+missing+'.'}</Txt></View> : null}
    {source && (notes.length || keys.length) ? <Pressable accessibilityRole="link" onPress={() => { setSourceFailed(false); void Linking.openURL(source).catch(() => setSourceFailed(true)); }} style={s.source}><Txt style={s.sourceText}>{keys.some(key => sensory?.[key]) ? ar ? 'درجات المحمصة · عرض المصدر' : 'Roaster’s scale · View source' : ar ? 'وصف المحمصة · عرض المصدر' : 'Roaster’s description · View source'}</Txt><Icon name="arrow" color={colors.teal} size={16}/></Pressable> : null}
    {sourceFailed ? <Txt accessibilityRole="alert" style={styles.error}>{ar ? 'تعذّر فتح الرابط. حاول مرة ثانية.' : 'Could not open the link. Try again.'}</Txt> : null}
  </View>;
}

const s = StyleSheet.create({
  profile: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 18, gap: 12 },
  completeProfile: { borderColor: '#BDD2CB', backgroundColor: '#FFFCF7' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1E6D7', alignItems: 'center', justifyContent: 'center' },
  notes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  noteTile: { minWidth: 66, maxWidth: 104, flexGrow: 1, flexBasis: 66, alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F6EFE4' },
  noteText: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: colors.ink },
  noteChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: '#F5EDE0', paddingHorizontal: 7, paddingVertical: 3, maxWidth: '100%' },
  chipText: { fontSize: 11, lineHeight: 17, color: colors.muted, flexShrink: 1 },
  roast: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  sectionLabel: { fontSize: 14, color: colors.muted, marginTop: 3 },
  scales: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 15, marginTop: 3 },
  scaleRow: { flexGrow: 1, flexBasis: 160, minWidth: 0, gap: 9, padding: 12, borderRadius: 14, backgroundColor: '#F4F4EA' }, scaleHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  scaleTitle: { fontSize: 14, fontWeight: '700' }, scaleValue: { color: colors.teal, fontSize: 14, fontVariant: ['tabular-nums'] },
  description: { color: colors.teal, fontSize: 15, lineHeight: 23 },
  track: { height: 6, backgroundColor: '#EAE2D8', borderRadius: 8, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: colors.teal, borderRadius: 8 },
  source: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 44 },
  sourceText: { color: colors.teal, fontSize: 12, flexShrink: 1 }, caption: { color: colors.muted, fontSize: 12, lineHeight: 20 },
});
